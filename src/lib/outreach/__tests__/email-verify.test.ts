/**
 * email-verify: ZeroBounce status mapping matrix, fail-closed behavior on
 * timeouts / vendor errors / unknown verdicts, raw-response scrubbing, and
 * verifier availability (missing key).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getEmailVerifier,
  mapZeroBounceStatus,
  VerificationUnavailableError,
  ZeroBounceVerifier,
} from '../email-verify';

function fetchResponding(json: Record<string, unknown>, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => json,
  })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('mapZeroBounceStatus', () => {
  it('maps the full matrix', () => {
    expect(mapZeroBounceStatus('valid', '')).toBe('VALID');
    expect(mapZeroBounceStatus('catch-all', '')).toBe('CATCH_ALL');
    expect(mapZeroBounceStatus('invalid', 'mailbox_not_found')).toBe('INVALID');
    expect(mapZeroBounceStatus('spamtrap', '')).toBe('INVALID');
    expect(mapZeroBounceStatus('abuse', '')).toBe('INVALID');
    expect(mapZeroBounceStatus('do_not_mail', 'global_suppression')).toBe('INVALID');
    expect(mapZeroBounceStatus('unknown', 'timeout_exceeded')).toBe('UNKNOWN');
    expect(mapZeroBounceStatus('', '')).toBe('UNKNOWN');
  });

  it('role_based sub-status wins over any status', () => {
    expect(mapZeroBounceStatus('valid', 'role_based')).toBe('ROLE');
    expect(mapZeroBounceStatus('catch-all', 'role_based_catch_all')).toBe('ROLE');
    expect(mapZeroBounceStatus('do_not_mail', 'role_based')).toBe('ROLE');
  });
});

describe('ZeroBounceVerifier', () => {
  it('returns a mapped status and a scrubbed raw payload', async () => {
    vi.stubGlobal(
      'fetch',
      fetchResponding({
        address: 'a@b.com',
        status: 'valid',
        sub_status: '',
        free_email: false,
        mx_found: 'true',
        smtp_provider: 'google',
        api_key_echo: 'should-not-survive',
      })
    );
    const result = await new ZeroBounceVerifier('key').verify('a@b.com');
    expect(result.status).toBe('VALID');
    expect(result.raw.status).toBe('valid');
    expect(result.raw).not.toHaveProperty('api_key_echo');
    expect(result.raw).not.toHaveProperty('address');
  });

  it('fails closed on network failure / timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('aborted');
    }));
    await expect(new ZeroBounceVerifier('key').verify('a@b.com')).rejects.toBeInstanceOf(
      VerificationUnavailableError
    );
  });

  it('fails closed on non-200 responses', async () => {
    vi.stubGlobal('fetch', fetchResponding({}, false, 500));
    await expect(new ZeroBounceVerifier('key').verify('a@b.com')).rejects.toBeInstanceOf(
      VerificationUnavailableError
    );
  });

  it('fails closed when ZeroBounce returns an error field (bad key / no credits)', async () => {
    vi.stubGlobal('fetch', fetchResponding({ error: 'Invalid API key' }));
    await expect(new ZeroBounceVerifier('key').verify('a@b.com')).rejects.toBeInstanceOf(
      VerificationUnavailableError
    );
  });

  it('fails closed on an unknown verdict instead of storing a guess', async () => {
    vi.stubGlobal('fetch', fetchResponding({ status: 'unknown', sub_status: 'timeout_exceeded' }));
    await expect(new ZeroBounceVerifier('key').verify('a@b.com')).rejects.toBeInstanceOf(
      VerificationUnavailableError
    );
  });

  it('never sends the address anywhere but zerobounce', async () => {
    const spy = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ status: 'valid', sub_status: '' }) }));
    vi.stubGlobal('fetch', spy as unknown as typeof fetch);
    await new ZeroBounceVerifier('key').verify('a@b.com');
    const url = new URL((spy.mock.calls[0] as unknown as [string])[0]);
    expect(url.hostname).toBe('api.zerobounce.net');
  });
});

describe('getEmailVerifier', () => {
  it('returns null without ZEROBOUNCE_API_KEY, a verifier with it', () => {
    vi.stubEnv('ZEROBOUNCE_API_KEY', '');
    expect(getEmailVerifier()).toBeNull();
    vi.stubEnv('ZEROBOUNCE_API_KEY', 'zb-key');
    expect(getEmailVerifier()).toBeInstanceOf(ZeroBounceVerifier);
  });
});
