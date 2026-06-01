/**
 * QuickBooks Online OAuth client + token store.
 *
 * Wraps `intuit-oauth` with a single-row token cache in `intuit_oauth_state`
 * so refresh-token rotation is invisible to callers. Used by:
 *   - /api/admin/finance/qb/connect    (start OAuth)
 *   - /api/admin/finance/qb/callback   (exchange code → store tokens)
 *   - /api/admin/finance/qb/health     (read connection state)
 * and later phases that need QB API access.
 *
 * Phase 0 — no data flows yet. This is connection plumbing only.
 */

import OAuthClient from 'intuit-oauth';
import { prisma } from '@/lib/database/client';

const SINGLETON_ID = 'singleton';

export interface StoredTokens {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: Date;
  refreshTokenExpires: Date;
  environment: string;
  lastRefreshedAt: Date | null;
  lastError: string | null;
}

export interface CompanyInfo {
  companyName: string;
  legalName?: string;
  realmId: string;
}

export type IntuitEnvironment = 'sandbox' | 'production';

function getEnv(): IntuitEnvironment {
  const raw = (process.env.INTUIT_ENV || 'sandbox').toLowerCase();
  return raw === 'production' ? 'production' : 'sandbox';
}

function getRedirectUri(): string {
  return (
    process.env.INTUIT_REDIRECT_URI ||
    'https://partyondelivery.com/api/admin/finance/qb/callback'
  );
}

function requireCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.INTUIT_CLIENT_ID;
  const clientSecret = process.env.INTUIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET must be set in environment'
    );
  }
  return { clientId, clientSecret };
}

function createClient(): OAuthClient {
  const { clientId, clientSecret } = requireCreds();
  return new OAuthClient({
    clientId,
    clientSecret,
    environment: getEnv(),
    redirectUri: getRedirectUri(),
  });
}

/**
 * Generate the Intuit authorization URI. State is caller-supplied (signed by
 * the connect route) so the callback can verify CSRF.
 */
export function getAuthorizationUri(state: string): string {
  const client = createClient();
  return client.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state,
  });
}

/**
 * Exchange the authorization code for tokens and persist them. Callback route
 * passes the full callback URL (Intuit's SDK parses the code + realmId from
 * the query string).
 */
export async function exchangeAuthCode(callbackUrl: string): Promise<StoredTokens> {
  const client = createClient();
  const authResponse = await client.createToken(callbackUrl);
  const token = authResponse.getToken();

  if (!token.access_token || !token.refresh_token || !token.realmId) {
    throw new Error('Intuit token exchange returned incomplete payload');
  }

  const now = Date.now();
  const accessExpires = new Date(now + (token.expires_in ?? 3600) * 1000);
  const refreshExpires = new Date(
    now + (token.x_refresh_token_expires_in ?? 8726400) * 1000
  );

  await prisma.intuitOAuthState.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      realmId: token.realmId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      accessTokenExpires: accessExpires,
      refreshTokenExpires: refreshExpires,
      environment: getEnv(),
      lastRefreshedAt: new Date(),
      lastError: null,
    },
    update: {
      realmId: token.realmId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      accessTokenExpires: accessExpires,
      refreshTokenExpires: refreshExpires,
      environment: getEnv(),
      lastRefreshedAt: new Date(),
      lastError: null,
    },
  });

  return loadStoredTokens();
}

/**
 * Read the persisted token row. Returns null if the operator has never
 * completed the OAuth flow.
 */
export async function getStoredTokens(): Promise<StoredTokens | null> {
  const row = await prisma.intuitOAuthState.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (!row) return null;
  return {
    realmId: row.realmId,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    accessTokenExpires: row.accessTokenExpires,
    refreshTokenExpires: row.refreshTokenExpires,
    environment: row.environment,
    lastRefreshedAt: row.lastRefreshedAt,
    lastError: row.lastError,
  };
}

async function loadStoredTokens(): Promise<StoredTokens> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new Error('QuickBooks not connected — no stored tokens');
  }
  return tokens;
}

/**
 * Refresh the access token using the persisted refresh token. Updates the
 * stored row in place. Callers normally don't invoke this directly — use
 * `getValidAccessToken()` which auto-refreshes when needed.
 */
export async function refreshTokens(): Promise<StoredTokens> {
  const stored = await loadStoredTokens();
  const client = createClient();
  try {
    const authResponse = await client.refreshUsingToken(stored.refreshToken);
    const token = authResponse.getToken();
    if (!token.access_token || !token.refresh_token) {
      throw new Error('Intuit refresh returned incomplete payload');
    }
    const now = Date.now();
    await prisma.intuitOAuthState.update({
      where: { id: SINGLETON_ID },
      data: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        accessTokenExpires: new Date(now + (token.expires_in ?? 3600) * 1000),
        refreshTokenExpires: new Date(
          now + (token.x_refresh_token_expires_in ?? 8726400) * 1000
        ),
        lastRefreshedAt: new Date(),
        lastError: null,
      },
    });
    return loadStoredTokens();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.intuitOAuthState.update({
      where: { id: SINGLETON_ID },
      data: { lastError: message },
    });
    throw err;
  }
}

/**
 * Get a non-expired access token, refreshing if within 5 min of expiry.
 */
export async function getValidAccessToken(): Promise<{
  accessToken: string;
  realmId: string;
}> {
  let tokens = await loadStoredTokens();
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (tokens.accessTokenExpires < fiveMinFromNow) {
    tokens = await refreshTokens();
  }
  return { accessToken: tokens.accessToken, realmId: tokens.realmId };
}

/**
 * Base URL for the QBO REST API in the configured environment.
 * Hard-coded rather than going through the SDK to avoid trailing-slash drift.
 */
function getQboApiBaseUrl(): string {
  return getEnv() === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

/** Stable QB Online API minor version. Bump cautiously. */
const QBO_MINOR_VERSION = 65;

/**
 * Low-level authenticated call to the QBO REST API using native `fetch`.
 * Skips the intuit-oauth SDK's wrapper (which silently strips bodies on
 * non-2xx and made debugging connection issues hard — see PR #93). Refreshes
 * the access token if it's within 5 minutes of expiry.
 *
 * Returns the parsed JSON body. Throws with the status + a body snippet on
 * any non-OK response so failures are debuggable from `lastError`.
 */
async function qboFetch<T = unknown>(
  path: string, // starts with `/v3/...`
  init: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const { accessToken } = await getValidAccessToken();
  const url = `${getQboApiBaseUrl()}${path}`;
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `QB API ${method} ${path} → HTTP ${response.status}: ${text.slice(0, 500)}`
    );
  }
  if (text.length === 0) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `QB API ${method} ${path} returned non-JSON (status ${response.status}): ${text.slice(0, 500)}`
    );
  }
}

/**
 * Fetch company info from the QBO API. Used by the health check.
 */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  const { realmId } = await getValidAccessToken();
  interface CompanyInfoResponse {
    CompanyInfo?: {
      CompanyName?: string;
      LegalName?: string;
    };
  }
  const json = await qboFetch<CompanyInfoResponse>(
    `/v3/company/${realmId}/companyinfo/${realmId}?minorversion=${QBO_MINOR_VERSION}`
  );
  const ci = json.CompanyInfo;
  if (!ci) {
    throw new Error(
      `CompanyInfo response missing CompanyInfo node. Got keys: ${Object.keys(json).join(', ')}`
    );
  }
  return {
    companyName: ci.CompanyName ?? 'Unknown',
    legalName: ci.LegalName,
    realmId,
  };
}

// ---------------------------------------------------------------------------
// QB Online query helpers (Phase 2A onward)
// ---------------------------------------------------------------------------

interface QbApiResponseJson {
  QueryResponse?: {
    Account?: unknown[];
    Purchase?: unknown[];
    Bill?: unknown[];
    JournalEntry?: unknown[];
    startPosition?: number;
    maxResults?: number;
    totalCount?: number;
  };
}

/**
 * Run a raw QB SQL-like query (the "QBO Query Language") and return the
 * parsed QueryResponse. Pages by passing STARTPOSITION; callers paginate.
 *
 * Example:
 *   await qboQuery("SELECT * FROM Account WHERE AccountType = 'Expense'")
 *
 * Handles token refresh automatically.
 */
export async function qboQuery(
  query: string
): Promise<QbApiResponseJson['QueryResponse']> {
  const { realmId } = await getValidAccessToken();
  const path = `/v3/company/${realmId}/query?minorversion=${QBO_MINOR_VERSION}&query=${encodeURIComponent(query)}`;
  const json = await qboFetch<QbApiResponseJson>(path);
  return json?.QueryResponse ?? {};
}

// ---------------------------------------------------------------------------
// QB write helpers (Phase 2B onward — all operator-approved)
// ---------------------------------------------------------------------------

export interface QboJournalLine {
  /** Stable line identifier for re-postings/edits. */
  lineId?: string;
  amountCents: number;
  description?: string;
  /** 'Debit' | 'Credit' */
  postingType: 'Debit' | 'Credit';
  /** QB Account ID. */
  accountId: string;
}

export interface QboJournalEntryPayload {
  /** YYYY-MM-DD. */
  txnDate: string;
  /** Free-text note attached to the entry. */
  privateNote?: string;
  lines: QboJournalLine[];
}

export interface QboJournalEntryResponse {
  /** QB-assigned transaction ID. */
  qbTransactionId: string;
  raw: unknown;
}

/**
 * POST a JournalEntry to QuickBooks Online. Phase 2B uses this from the
 * autonomous-daily-post flow. Throws on QB error so the caller can surface
 * the failure via the entry's failureReason.
 */
export async function postJournalEntryToQb(
  payload: QboJournalEntryPayload
): Promise<QboJournalEntryResponse> {
  const { realmId } = await getValidAccessToken();
  const body = {
    TxnDate: payload.txnDate,
    PrivateNote: payload.privateNote,
    Line: payload.lines.map((l) => ({
      Id: l.lineId,
      DetailType: 'JournalEntryLineDetail',
      Amount: l.amountCents / 100,
      Description: l.description,
      JournalEntryLineDetail: {
        PostingType: l.postingType,
        AccountRef: { value: l.accountId },
      },
    })),
  };
  const path = `/v3/company/${realmId}/journalentry?minorversion=${QBO_MINOR_VERSION}`;
  const result = await qboFetch<{ JournalEntry?: { Id?: string } }>(path, {
    method: 'POST',
    body,
  });
  const id = result?.JournalEntry?.Id;
  if (!id) {
    throw new Error(
      `QB JournalEntry POST returned no Id. Body: ${JSON.stringify(result).slice(0, 500)}`
    );
  }
  return { qbTransactionId: id, raw: result };
}


