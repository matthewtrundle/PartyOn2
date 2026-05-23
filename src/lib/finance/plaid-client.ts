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
 * Create a link_token the browser SDK exchanges for a public_token.
 * Phase 0 only requests `Transactions` since that's all Phase 2C uses.
 */
export async function createLinkToken(userId: string): Promise<string> {
  const client = createClient();
  const response = await client.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Party On Delivery',
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: 'en',
  });
  return response.data.link_token;
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
