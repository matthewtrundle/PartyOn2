// @vitest-environment node
/**
 * Plaid webhook signature verification — fail-closed on every path: wrong
 * algorithm, bad signature, stale token, tampered body, unknown key, missing
 * claim. Uses a real locally-generated ES256 keypair and an injected key
 * fetcher (production fetches from Plaid's /webhook_verification_key/get).
 *
 * Runs in the node environment: jose's Web-API build checks payloads with
 * `instanceof Uint8Array`, which fails across the jsdom/node realm boundary.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SignJWT, generateKeyPair, exportJWK } from 'jose';
import { createHash } from 'crypto';
import {
  verifyPlaidWebhookJwt,
  __resetWebhookVerificationState,
} from '@/lib/finance/plaid-client';

beforeEach(() => __resetWebhookVerificationState());

const BODY = JSON.stringify({
  webhook_type: 'TRANSACTIONS',
  webhook_code: 'SYNC_UPDATES_AVAILABLE',
  item_id: 'item-abc',
});

async function makeSigned(opts: {
  kid: string;
  body?: string;
  iatOffsetSec?: number;
  omitHash?: boolean;
}) {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = (await exportJWK(publicKey)) as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  if (!opts.omitHash) {
    payload.request_body_sha256 = createHash('sha256')
      .update(opts.body ?? BODY)
      .digest('hex');
  }
  const iat = Math.floor(Date.now() / 1000) + (opts.iatOffsetSec ?? 0);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid: opts.kid })
    .setIssuedAt(iat)
    .sign(privateKey);
  return { token, jwk };
}

describe('verifyPlaidWebhookJwt', () => {
  it('accepts a fresh, correctly signed token whose hash matches the raw body', async () => {
    const { token, jwk } = await makeSigned({ kid: 'k-valid' });
    const r = await verifyPlaidWebhookJwt(BODY, token, async () => jwk);
    expect(r.ok).toBe(true);
  });

  it('rejects when the body was tampered with (hash mismatch)', async () => {
    const { token, jwk } = await makeSigned({ kid: 'k-tamper' });
    const tampered = BODY.replace('item-abc', 'item-EVIL');
    const r = await verifyPlaidWebhookJwt(tampered, token, async () => jwk);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('hash mismatch');
  });

  it('rejects a non-ES256 token BEFORE fetching any key (alg pinning)', async () => {
    // HS256 token signed with a symmetric secret — must be rejected on the
    // header alone; the key fetcher must never be consulted.
    const { SignJWT: S } = await import('jose');
    const hsToken = await new S({ request_body_sha256: 'x' })
      .setProtectedHeader({ alg: 'HS256', kid: 'k-hs' })
      .setIssuedAt()
      .sign(new TextEncoder().encode('secret'));
    let fetcherCalled = false;
    const r = await verifyPlaidWebhookJwt(BODY, hsToken, async () => {
      fetcherCalled = true;
      return {};
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('unexpected alg');
    expect(fetcherCalled).toBe(false);
  });

  it('rejects a stale token (iat older than 5 minutes — replay bound)', async () => {
    const { token, jwk } = await makeSigned({ kid: 'k-stale', iatOffsetSec: -10 * 60 });
    const r = await verifyPlaidWebhookJwt(BODY, token, async () => jwk);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('freshness');
  });

  it('rejects when the verification key cannot be fetched (fail closed)', async () => {
    const { token } = await makeSigned({ kid: 'k-unknown' });
    const r = await verifyPlaidWebhookJwt(BODY, token, async () => {
      throw new Error('no such key');
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('key fetch failed');
  });

  it('rejects a signed token missing the request_body_sha256 claim', async () => {
    const { token, jwk } = await makeSigned({ kid: 'k-noclaim', omitHash: true });
    const r = await verifyPlaidWebhookJwt(BODY, token, async () => jwk);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('request_body_sha256');
  });

  it('rejects garbage that is not a JWT at all', async () => {
    const r = await verifyPlaidWebhookJwt(BODY, 'not-a-jwt', async () => ({}));
    expect(r.ok).toBe(false);
  });

  it('rejects a token signed by a DIFFERENT key than the one published for its kid', async () => {
    const { token } = await makeSigned({ kid: 'k-wrongkey' });
    // Publish a different keypair's public JWK for the same kid.
    const other = await generateKeyPair('ES256');
    const otherJwk = (await exportJWK(other.publicKey)) as Record<string, unknown>;
    const r = await verifyPlaidWebhookJwt(BODY, token, async () => otherJwk);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('verification failed');
  });

  it('caches the key by kid — second verification does not re-fetch', async () => {
    const { token, jwk } = await makeSigned({ kid: 'k-cache' });
    let fetches = 0;
    const getKey = async () => {
      fetches++;
      return jwk;
    };
    expect((await verifyPlaidWebhookJwt(BODY, token, getKey)).ok).toBe(true);
    expect((await verifyPlaidWebhookJwt(BODY, token, getKey)).ok).toBe(true);
    expect(fetches).toBe(1);
  });

  it('negative-caches a failed kid — no repeat Plaid call within the TTL', async () => {
    const { token } = await makeSigned({ kid: 'k-neg' });
    let fetches = 0;
    const failing = async () => {
      fetches++;
      throw new Error('no such key');
    };
    expect((await verifyPlaidWebhookJwt(BODY, token, failing)).ok).toBe(false);
    const second = await verifyPlaidWebhookJwt(BODY, token, failing);
    expect(second.ok).toBe(false);
    expect(second.reason).toContain('negative cache');
    expect(fetches).toBe(1);
  });

  it('exhausts the global fetch budget under a flood of unique kids (fail closed, no extra fetches)', async () => {
    // An attacker floods unique kids: each consumes one budgeted fetch; past
    // the budget, requests are rejected WITHOUT any outbound call.
    let fetches = 0;
    const failing = async () => {
      fetches++;
      throw new Error('no such key');
    };
    for (let i = 0; i < 10; i++) {
      const { token } = await makeSigned({ kid: `k-flood-${i}` });
      await verifyPlaidWebhookJwt(BODY, token, failing);
    }
    expect(fetches).toBe(10);
    const { token } = await makeSigned({ kid: 'k-flood-final' });
    const r = await verifyPlaidWebhookJwt(BODY, token, failing);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('budget exhausted');
    expect(fetches).toBe(10); // the 11th never reached the fetcher
  });
});
