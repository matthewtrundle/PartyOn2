/**
 * Plaid client + token store.
 *
 * Wraps the official `plaid` Node SDK with a thin layer for:
 *   - link-token creation (Phase 0)
 *   - public-token → access-token exchange + persistence (Phase 0)
 *   - item/account introspection for health checks (Phase 0)
 *
 * Transactions sync + reconciliation arrives in Phase 2C. Phase 0 only
 * persists the access token + account list per linked institution.
 */

import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from 'plaid';
import { prisma } from '@/lib/database/client';

export type PlaidEnvName = 'sandbox' | 'development' | 'production';

interface LinkMetadataInstitution {
  institution_id?: string;
  name?: string;
}

interface LinkMetadataAccount {
  id?: string;
  mask?: string | null;
  name?: string;
  type?: string;
  subtype?: string | null;
}

export interface LinkSuccessMetadata {
  institution?: LinkMetadataInstitution | null;
  accounts?: LinkMetadataAccount[];
}

export interface ExchangeResult {
  itemId: string;
  institutionName: string | null;
  accounts: Array<{
    accountId: string;
    name: string;
    mask: string | null;
    type: string;
    subtype: string | null;
  }>;
}

export interface PlaidHealthItem {
  itemId: string;
  institutionName: string | null;
  institutionId: string | null;
  environment: string;
  status: string;
  accountCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  accounts: Array<{
    accountId: string;
    name: string;
    mask: string | null;
    type: string;
    subtype: string | null;
  }>;
}

function getEnv(): PlaidEnvName {
  const raw = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
  if (raw === 'production') return 'production';
  if (raw === 'development') return 'development';
  return 'sandbox';
}

function requireCreds(): { clientId: string; secret: string } {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error(
      'PLAID_CLIENT_ID and PLAID_SECRET must be set in environment'
    );
  }
  return { clientId, secret };
}

function createClient(): PlaidApi {
  const env = getEnv();
  const { clientId, secret } = requireCreds();
  const config = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  });
  return new PlaidApi(config);
}

/**
 * Public webhook URL Plaid will POST to when transactions / item events
 * happen. Bound at link_token creation so every new Item is auto-wired —
 * no Plaid-dashboard config required.
 *
 * Note: there's no team-level default webhook URL setting for the
 * Transactions product in the Plaid dashboard (the dashboard "Webhooks"
 * page is only for Transfer / Wallet / Bank Income product listeners).
 * Per-Item is the supported path.
 */
function getWebhookUrl(): string {
  return (
    process.env.PLAID_WEBHOOK_URL ||
    'https://partyondelivery.com/api/webhooks/plaid'
  );
}

/**
 * OAuth redirect URI. Required for OAuth institutions (e.g. Wells Fargo), which
 * send the user to the bank's own site and back. Must be registered in the Plaid
 * dashboard (Team Settings → API → Allowed redirect URIs) and match exactly.
 * Returns undefined when unset so the non-OAuth sandbox flow is unaffected.
 */
function getRedirectUri(): string | undefined {
  return process.env.PLAID_REDIRECT_URI || undefined;
}

/**
 * How much transaction history to request from the institution. Plaid's
 * default is 90 days — which is why the first Wells Fargo sync only reached
 * back ~3 months. 730 days (the maximum) gives the 2-year picture the
 * bank-as-source-of-truth P&L needs. Fixed per-Item at link time, so existing
 * items need the update-mode flow below to extend.
 */
const DAYS_REQUESTED = 730;

/**
 * Create a link_token the browser SDK exchanges for a public_token.
 * Only requests `Transactions` since that's all the sync path uses.
 */
export async function createLinkToken(userId: string): Promise<string> {
  const client = createClient();
  const redirectUri = getRedirectUri();
  const response = await client.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Party On Delivery',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
    webhook: getWebhookUrl(),
    transactions: { days_requested: DAYS_REQUESTED },
    // OAuth banks (Wells Fargo) require a registered redirect_uri; omit it
    // entirely for the non-OAuth sandbox bank so that flow is unchanged.
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  });
  return response.data.link_token;
}

/**
 * Create an UPDATE-MODE link_token for an already-linked Item, requesting the
 * full 730 days of history. The operator re-authenticates through Link (quick
 * OAuth round-trip for Wells Fargo); Plaid then backfills the deeper history
 * and fires HISTORICAL_UPDATE webhooks, which the webhook handler turns into
 * syncs. No token exchange happens on success — the Item is unchanged.
 *
 * Update-mode rule: pass `access_token`, do NOT pass `products`.
 */
export async function createUpdateLinkToken(accessToken: string): Promise<string> {
  const client = createClient();
  const redirectUri = getRedirectUri();
  const response = await client.linkTokenCreate({
    user: { client_user_id: 'ops-extend-history' },
    client_name: 'Party On Delivery',
    country_codes: [CountryCode.Us],
    language: 'en',
    access_token: accessToken,
    webhook: getWebhookUrl(),
    transactions: { days_requested: DAYS_REQUESTED },
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
  });
  return response.data.link_token;
}

/**
 * Remove an Item at Plaid (invalidates the access token and stops billing).
 * Used by the relink cutover after a replacement Item is verified.
 */
export async function removeItem(accessToken: string): Promise<void> {
  const client = createClient();
  await client.itemRemove({ access_token: accessToken });
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/** Verification keys cached by kid — Plaid rotates rarely; refetch daily. */
const webhookKeyCache = new Map<string, { jwk: Record<string, unknown>; fetchedAt: number }>();
const WEBHOOK_KEY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Anti-amplification guards (security review): the kid comes from an
 * ATTACKER-CONTROLLED header, and each unknown kid would otherwise cost a live
 * authenticated Plaid API call — a flood of random kids could exhaust our
 * Plaid quota and break legitimate verification.
 * - Negative cache: a kid that failed to resolve is not retried for 60s.
 * - Global budget: at most 10 key fetches per rolling minute, fail-closed
 *   beyond it (Plaid retries webhooks, so a legit fetch delayed by an active
 *   flood only postpones a sync). Legitimate traffic uses ~1 kid per key
 *   rotation, so the budget is generous.
 */
const webhookKeyNegativeCache = new Map<string, number>(); // kid → failedAt
const WEBHOOK_KEY_NEGATIVE_TTL_MS = 60 * 1000;
const WEBHOOK_KEY_FETCH_BUDGET = 10;
const WEBHOOK_KEY_FETCH_WINDOW_MS = 60 * 1000;
let keyFetchTimestamps: number[] = [];

/** Test-only: reset module-level verification state between test cases. */
export function __resetWebhookVerificationState(): void {
  webhookKeyCache.clear();
  webhookKeyNegativeCache.clear();
  keyFetchTimestamps = [];
}

/** Production key fetcher: Plaid's /webhook_verification_key/get by kid. */
async function fetchPlaidWebhookKey(kid: string): Promise<Record<string, unknown>> {
  const client = createClient();
  const res = await client.webhookVerificationKeyGet({ key_id: kid });
  return res.data.key as unknown as Record<string, unknown>;
}

/**
 * Verify a Plaid webhook: the `plaid-verification` header is an ES256 JWT
 * whose payload carries `request_body_sha256` — the SHA-256 of the EXACT raw
 * request body. Verification therefore requires the raw text, not the parsed
 * JSON. Checks, all fail-closed:
 *   1. alg pinned to ES256 (a token claiming any other alg is rejected before
 *      any key is fetched — no algorithm-confusion surface);
 *   2. signature against Plaid's published key for the token's kid (fetched
 *      via /webhook_verification_key/get, cached 24h);
 *   3. iat freshness ≤ 5 minutes (Plaid's own guidance — bounds replay);
 *   4. body hash equality, constant-time.
 *
 * `getKey` is injectable so the crypto path is unit-testable with a local
 * keypair; production uses the Plaid fetcher.
 */
export async function verifyPlaidWebhookJwt(
  rawBody: string,
  token: string,
  getKey: (kid: string) => Promise<Record<string, unknown>> = fetchPlaidWebhookKey
): Promise<{ ok: boolean; reason: string }> {
  const { decodeProtectedHeader, importJWK, jwtVerify } = await import('jose');
  const { createHash, timingSafeEqual } = await import('crypto');

  let kid: string;
  try {
    const header = decodeProtectedHeader(token);
    if (header.alg !== 'ES256') {
      return { ok: false, reason: `unexpected alg ${String(header.alg)}` };
    }
    if (!header.kid || typeof header.kid !== 'string') {
      return { ok: false, reason: 'missing kid' };
    }
    kid = header.kid;
  } catch {
    return { ok: false, reason: 'malformed verification JWT' };
  }

  let jwk: Record<string, unknown>;
  const cached = webhookKeyCache.get(kid);
  if (cached && Date.now() - cached.fetchedAt < WEBHOOK_KEY_TTL_MS) {
    jwk = cached.jwk;
  } else {
    // Negative cache: don't re-fetch a kid that just failed.
    const failedAt = webhookKeyNegativeCache.get(kid);
    if (failedAt && Date.now() - failedAt < WEBHOOK_KEY_NEGATIVE_TTL_MS) {
      return { ok: false, reason: 'verification key recently failed to resolve (negative cache)' };
    }
    // Global fetch budget: bound total outbound key lookups per minute.
    const windowStart = Date.now() - WEBHOOK_KEY_FETCH_WINDOW_MS;
    keyFetchTimestamps = keyFetchTimestamps.filter((t) => t > windowStart);
    if (keyFetchTimestamps.length >= WEBHOOK_KEY_FETCH_BUDGET) {
      return { ok: false, reason: 'verification key fetch budget exhausted — retry later' };
    }
    keyFetchTimestamps.push(Date.now());
    try {
      jwk = await getKey(kid);
      webhookKeyCache.set(kid, { jwk, fetchedAt: Date.now() });
      webhookKeyNegativeCache.delete(kid);
    } catch (err) {
      webhookKeyNegativeCache.set(kid, Date.now());
      // Bound the negative cache so a kid flood can't grow memory unboundedly.
      if (webhookKeyNegativeCache.size > 200) {
        const oldest = webhookKeyNegativeCache.keys().next().value;
        if (oldest !== undefined) webhookKeyNegativeCache.delete(oldest);
      }
      return {
        ok: false,
        reason: `verification key fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  let payload: Record<string, unknown>;
  try {
    const key = await importJWK(jwk as Parameters<typeof importJWK>[0], 'ES256');
    const verified = await jwtVerify(token, key, {
      algorithms: ['ES256'],
      maxTokenAge: '5 minutes',
    });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return { ok: false, reason: 'signature or freshness verification failed' };
  }

  const expected = payload.request_body_sha256;
  if (typeof expected !== 'string' || expected.length === 0) {
    return { ok: false, reason: 'missing request_body_sha256 claim' };
  }
  const actual = createHash('sha256').update(rawBody).digest('hex');
  const a = Buffer.from(actual, 'utf8');
  const b = Buffer.from(expected.toLowerCase(), 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'request body hash mismatch' };
  }
  return { ok: true, reason: 'verified' };
}

/**
 * Update the webhook URL on an already-linked Item. Used for the one-shot
 * backfill that wires the webhook on every existing PlaidItem (which were
 * created before we passed `webhook` into link_token).
 */
export async function updateItemWebhook(accessToken: string): Promise<void> {
  const client = createClient();
  await client.itemWebhookUpdate({
    access_token: accessToken,
    webhook: getWebhookUrl(),
  });
}

/**
 * One-shot: walk every active PlaidItem and set its webhook URL on Plaid's
 * side. Idempotent. Used by /api/admin/finance/plaid/backfill-webhooks once
 * after this PR deploys, then optionally removed.
 */
export async function backfillItemWebhooks(): Promise<{
  updated: number;
  failed: number;
  errors: string[];
}> {
  const { prisma } = await import('@/lib/database/client');
  const items = await prisma.plaidItem.findMany({
    where: { status: { in: ['active', 'error'] } },
    select: { id: true, itemId: true, accessToken: true },
  });
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const item of items) {
    try {
      await updateItemWebhook(item.accessToken);
      updated++;
    } catch (err) {
      failed++;
      errors.push(`${item.itemId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { updated, failed, errors };
}

/**
 * Exchange a public_token for an access_token, then upsert PlaidItem +
 * PlaidAccount rows. Operator can re-link the same institution; rows are
 * keyed by the Plaid `item_id` / `account_id` strings so re-linking refreshes
 * the access token in place.
 */
export async function exchangePublicToken(
  publicToken: string,
  metadata: LinkSuccessMetadata | null
): Promise<ExchangeResult> {
  const client = createClient();
  const exchange = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });
  const { access_token: accessToken, item_id: itemId } = exchange.data;

  const accountsResp = await client.accountsGet({ access_token: accessToken });
  const fetchedAccounts = accountsResp.data.accounts ?? [];
  const institutionName = metadata?.institution?.name ?? null;
  const institutionId = metadata?.institution?.institution_id ?? null;

  await prisma.plaidItem.upsert({
    where: { itemId },
    create: {
      itemId,
      accessToken,
      institutionId,
      institutionName,
      environment: getEnv(),
      status: 'active',
      lastSyncAt: null,
      lastError: null,
    },
    update: {
      accessToken,
      institutionId: institutionId ?? undefined,
      institutionName: institutionName ?? undefined,
      environment: getEnv(),
      status: 'active',
      lastError: null,
    },
  });

  const persistedItem = await prisma.plaidItem.findUniqueOrThrow({
    where: { itemId },
  });

  for (const acct of fetchedAccounts) {
    await prisma.plaidAccount.upsert({
      where: { accountId: acct.account_id },
      create: {
        plaidItemId: persistedItem.id,
        accountId: acct.account_id,
        name: acct.name,
        officialName: acct.official_name ?? null,
        mask: acct.mask ?? null,
        type: acct.type,
        subtype: acct.subtype ?? null,
        currentBalance: acct.balances?.current ?? null,
        availableBalance: acct.balances?.available ?? null,
        isoCurrencyCode: acct.balances?.iso_currency_code ?? 'USD',
      },
      update: {
        plaidItemId: persistedItem.id,
        name: acct.name,
        officialName: acct.official_name ?? null,
        mask: acct.mask ?? null,
        type: acct.type,
        subtype: acct.subtype ?? null,
        currentBalance: acct.balances?.current ?? null,
        availableBalance: acct.balances?.available ?? null,
        isoCurrencyCode: acct.balances?.iso_currency_code ?? 'USD',
      },
    });
  }

  return {
    itemId,
    institutionName,
    accounts: fetchedAccounts.map((a) => ({
      accountId: a.account_id,
      name: a.name,
      mask: a.mask ?? null,
      type: a.type,
      subtype: a.subtype ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// /transactions/sync (Phase 2C)
// ---------------------------------------------------------------------------

interface PlaidTransactionApi {
  transaction_id: string;
  account_id: string;
  date: string; // YYYY-MM-DD
  authorized_date?: string | null;
  amount: number; // positive = outflow per Plaid convention
  iso_currency_code?: string | null;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  payment_channel?: string | null;
  category?: string[] | null;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
}

export interface SyncTransactionsResult {
  added: PlaidTransactionApi[];
  modified: PlaidTransactionApi[];
  removed: Array<{ transaction_id: string }>;
  nextCursor: string;
  hasMore: boolean;
}

/**
 * Call Plaid /transactions/sync with the stored cursor and return the
 * paginated delta. Caller persists nextCursor and re-calls while hasMore.
 *
 * Pass `cursor=undefined` on first sync to receive a full backfill from
 * Plaid (Plaid handles "initial sync" implicitly when cursor is omitted).
 */
export async function syncTransactions(
  accessToken: string,
  cursor: string | undefined
): Promise<SyncTransactionsResult> {
  const client = createClient();
  const response = await client.transactionsSync({
    access_token: accessToken,
    cursor,
    options: { include_personal_finance_category: true },
  });
  return {
    added: response.data.added as unknown as PlaidTransactionApi[],
    modified: response.data.modified as unknown as PlaidTransactionApi[],
    removed: response.data.removed as unknown as Array<{ transaction_id: string }>,
    nextCursor: response.data.next_cursor,
    hasMore: response.data.has_more,
  };
}

/**
 * List linked items with their accounts for the health endpoint.
 */
export async function listConnectedItems(): Promise<PlaidHealthItem[]> {
  const items = await prisma.plaidItem.findMany({
    include: { accounts: true },
    orderBy: { createdAt: 'asc' },
  });
  return items.map((item) => ({
    itemId: item.itemId,
    institutionName: item.institutionName,
    institutionId: item.institutionId,
    environment: item.environment,
    status: item.status,
    accountCount: item.accounts.length,
    lastSyncAt: item.lastSyncAt?.toISOString() ?? null,
    lastError: item.lastError,
    accounts: item.accounts.map((a) => ({
      accountId: a.accountId,
      name: a.name,
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
    })),
  }));
}
