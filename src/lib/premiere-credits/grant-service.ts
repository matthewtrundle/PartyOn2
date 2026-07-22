/**
 * Premiere Credit automation — grant service (mint + send).
 *
 * Mints single-use FIXED_AMOUNT discount codes and delivers them. The discount
 * config MATCHES the codes Premiere already issues by hand (verified against
 * the live REINAUER / MOTYKA / SCLAFANI / BENSON13844 rows): combinable +
 * freeShipping true, maxUsageCount 1, appliesToAll true, no minOrderAmount. The
 * only intentional difference is a 60-day expiry (existing codes never expired).
 */

import { randomInt } from 'crypto';
import { Prisma, type PremiereCreditGrant } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { normalizeName } from './parse';
import {
  CODE_ALPHABET,
  HOLD_THRESHOLD_USD,
  generateCodeBase,
  isPossibleDuplicate,
  planRowAction,
} from './planner';
import type { HoldReason } from './types';
import { sendPremiereCreditEmail } from './send-email';
import { notifyPremiereCreditIssued } from '@/lib/webhooks/ghl-premiere-credit';
import type { GrantStatus, ParsedCreditRow } from './types';

/** Days until a minted credit expires. */
export const EXPIRY_DAYS = 60;

const REDEEM_URL = 'https://partyondelivery.com';
const MAX_CODE_ATTEMPTS = 5;

/** Outcome of ingesting a single sheet row. */
export type IngestOutcome = 'exists' | 'needs-contact' | 'held' | 'minted';

/** Add whole days to a date without mutating the input. */
export function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** A random N-char suffix from the unambiguous alphabet. */
function randomSuffix(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/**
 * Generate a unique discount code. Starts from Premiere's convention
 * (LASTNAME + amount digits); on collision appends a 2-char random suffix.
 * Throws after MAX_CODE_ATTEMPTS distinct tries.
 */
export async function generateCreditCode(clientName: string, amount: number): Promise<string> {
  const base = generateCodeBase(clientName, amount);
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix(2)}`;
    const clash = await prisma.discount.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!clash) return candidate;
  }
  throw new Error(`Could not generate a unique code for ${base} after ${MAX_CODE_ATTEMPTS} attempts`);
}

/** Booking-date DB value from an ISO string (Date column). */
function bookingDateValue(iso: string | null): Date | null {
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

/**
 * Create the Discount + link it onto an existing grant, inside one
 * transaction. Used both at mint time and when an operator resolves a
 * NEEDS_CONTACT / possible-duplicate hold. Returns the updated grant.
 */
async function attachDiscount(
  grant: PremiereCreditGrant,
  targetStatus: GrantStatus,
  holdReason: HoldReason | null = null,
): Promise<PremiereCreditGrant> {
  const amount = Number(grant.amount);
  const code = await generateCreditCode(grant.clientName, amount);
  const now = new Date();
  const bookingLabel = grant.bookingDate ? grant.bookingDate.toISOString().slice(0, 10) : 'unknown';

  try {
    return await prisma.$transaction(async (tx) => {
      const discount = await tx.discount.create({
        data: {
          code,
          name: `POD Credit - ${grant.clientName}`,
          description: `POD Credit forwarded from booking ${bookingLabel} - ${grant.clientName}`,
          type: 'FIXED_AMOUNT',
          value: new Prisma.Decimal(amount.toFixed(2)),
          appliesToAll: true,
          combinable: true,
          freeShipping: true,
          maxUsageCount: 1,
          usagePerCustomer: 1,
          startsAt: now,
          expiresAt: addDays(now, EXPIRY_DAYS),
          // Held grants mint INACTIVE — the code isn't redeemable until an
          // operator approves it. This contains the money for the sanity-cap
          // case (a garbage cell must not create a live spendable code) and
          // for over-threshold holds. approveAndSend reactivates before send.
          isActive: targetStatus !== 'HELD_FOR_APPROVAL',
        },
      });
      // Compare-and-swap: only claim the grant if it still has no discount.
      // A concurrent mint (double-submit of approve/contact, overlapping ticks)
      // loses here, and throwing rolls back the discount.create above so no
      // orphaned, spendable code is left behind.
      const claimed = await tx.premiereCreditGrant.updateMany({
        where: { id: grant.id, discountId: null },
        data: { discountId: discount.id, code: discount.code, status: targetStatus, holdReason, error: null },
      });
      if (claimed.count === 0) throw new AlreadyMintedError();
      const updated = await tx.premiereCreditGrant.findUnique({ where: { id: grant.id } });
      if (!updated) throw new Error(`grant ${grant.id} vanished mid-mint`);
      return updated;
    });
  } catch (err) {
    // Lost the mint race (CAS miss, or a unique-code collision from a
    // simultaneous identical mint) — return the grant that actually won.
    const raced =
      err instanceof AlreadyMintedError ||
      (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002');
    if (raced) {
      const winner = await prisma.premiereCreditGrant.findUnique({ where: { id: grant.id } });
      if (winner?.discountId) return winner;
    }
    throw err;
  }
}

/** Internal sentinel — a concurrent caller minted this grant first. */
class AlreadyMintedError extends Error {}

/**
 * Ingest one parsed sheet row: idempotent by sourceKey, then plan → mint /
 * needs-contact / duplicate-hold. Never sends — the engine's send phase does
 * that only for READY grants. Concurrency-safe (unique sourceKey).
 */
export async function ingestRow(
  row: ParsedCreditRow,
): Promise<{ grant: PremiereCreditGrant; outcome: IngestOutcome }> {
  const existing = await prisma.premiereCreditGrant.findUnique({ where: { sourceKey: row.sourceKey } });
  if (existing && existing.status !== 'PENDING') return { grant: existing, outcome: 'exists' };
  if (existing && existing.status === 'PENDING') {
    // A prior tick committed the shell but its mint failed afterward (mint
    // txn error, code-generation exhaustion, crash between the two writes).
    // Resume the mint rather than leaving the credit silently stuck at PENDING
    // forever. holdReason on the shell tells us whether it should be held.
    const hold = existing.holdReason as HoldReason | null;
    const grant = await attachDiscount(existing, hold ? 'HELD_FOR_APPROVAL' : 'READY', hold);
    return { grant, outcome: hold ? 'held' : 'minted' };
  }

  const base = {
    sourceKey: row.sourceKey,
    sheetRow: row.sheetRow,
    clientName: row.clientName,
    email: row.email,
    phone: row.phone,
    bookingDate: bookingDateValue(row.bookingDateISO),
    cruiseDate: bookingDateValue(row.cruiseDateISO),
    amount: new Prisma.Decimal(row.amount.toFixed(2)),
    rawRow: row.rawRow as Prisma.InputJsonValue,
  };

  const action = planRowAction(row);

  // No reachable email — record the grant, mint nothing.
  if (action.kind === 'needs-contact') {
    const grant = await createGrant({ ...base, status: 'NEEDS_CONTACT' });
    return { grant, outcome: 'needs-contact' };
  }

  // Ambiguous duplicate (same person + booking, different amount) — hold
  // WITHOUT minting; an operator resolves it via approve or cancel.
  if (row.bookingDateISO) {
    const bookingSiblings = await prisma.premiereCreditGrant.findMany({
      where: { bookingDate: bookingDateValue(row.bookingDateISO), sourceKey: { not: row.sourceKey } },
      select: { sourceKey: true, clientName: true },
    });
    const sameName = bookingSiblings.filter((s) => normalizeName(s.clientName) === normalizeName(row.clientName));
    if (isPossibleDuplicate(row, sameName)) {
      const grant = await createGrant({ ...base, status: 'HELD_FOR_APPROVAL', holdReason: 'possible-duplicate' });
      return { grant, outcome: 'held' };
    }
  }

  // Mint. Over-threshold / sanity-cap amounts are minted but held for approval.
  const targetStatus: GrantStatus = action.hold ? 'HELD_FOR_APPROVAL' : 'READY';
  try {
    const holdReason = action.hold ? action.holdReason : null;
    const shell = await createGrant({ ...base, status: 'PENDING', holdReason });
    const grant = await attachDiscount(shell, targetStatus, holdReason);
    return { grant, outcome: action.hold ? 'held' : 'minted' };
  } catch (err) {
    // Lost a concurrency race on the unique sourceKey — return the winner, but
    // only if it is actually a fully-formed grant. A winner still stuck at
    // PENDING means this is not the sourceKey race but an unresolved failure
    // (e.g. a rare code collision); rethrow so it surfaces as a row error/alert
    // rather than a silently stuck grant.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const winner = await prisma.premiereCreditGrant.findUnique({ where: { sourceKey: row.sourceKey } });
      if (winner && winner.status !== 'PENDING') return { grant: winner, outcome: 'exists' };
    }
    throw err;
  }
}

/** Create a grant row with the given status/fields. */
async function createGrant(
  data: Prisma.PremiereCreditGrantUncheckedCreateInput,
): Promise<PremiereCreditGrant> {
  return prisma.premiereCreditGrant.create({ data });
}

/**
 * Mint a discount for a grant that doesn't have one yet (NEEDS_CONTACT after a
 * contact was filled in, or an approved possible-duplicate). Re-plans the
 * threshold so a large amount still lands in HELD_FOR_APPROVAL.
 */
export async function mintForGrant(grant: PremiereCreditGrant): Promise<PremiereCreditGrant> {
  if (grant.discountId) return grant;
  const amount = Number(grant.amount);
  const held = amount > HOLD_THRESHOLD_USD; // re-checked on late mint
  return attachDiscount(grant, held ? 'HELD_FOR_APPROVAL' : 'READY', held ? 'over-threshold' : null);
}

/** Details of a code delivered to a customer (for the partner summary email). */
export interface DeliveredInfo {
  clientName: string;
  amount: number;
  code: string;
  expiresAt: Date;
}

/** Statuses a grant may be sent from (cron: READY; approve: HELD/READY; resend: SENT/SEND_FAILED). */
const SENDABLE_STATUSES = ['READY', 'HELD_FOR_APPROVAL', 'SENT', 'SEND_FAILED'];

/**
 * Deliver a grant's code: customer email (authoritative for SENT/SEND_FAILED)
 * + fire-and-forget SMS. The single send path used by the cron, the approve
 * action, and resend. Requires a minted discount and an email.
 *
 * Concurrency-safe: atomically claims the grant into a transient SENDING state
 * before doing any outbound work, so overlapping cron ticks — or an approve
 * racing the cron — cannot double-send. A lost claim returns without sending.
 */
export async function sendGrant(
  grantId: string,
): Promise<{ status: GrantStatus; error?: string; delivered?: DeliveredInfo }> {
  const claim = await prisma.premiereCreditGrant.updateMany({
    where: { id: grantId, status: { in: SENDABLE_STATUSES } },
    data: { status: 'SENDING' },
  });
  if (claim.count === 0) {
    const current = await prisma.premiereCreditGrant.findUnique({ where: { id: grantId }, select: { status: true } });
    if (!current) throw new Error(`Grant ${grantId} not found`);
    // Another worker owns the send (or the grant isn't sendable) — no-op.
    return { status: current.status as GrantStatus, error: 'not claimable' };
  }

  const grant = await prisma.premiereCreditGrant.findUnique({
    where: { id: grantId },
    include: { discount: { select: { code: true, value: true, expiresAt: true } } },
  });
  if (!grant) throw new Error(`Grant ${grantId} not found`);
  if (!grant.email) return failSend(grant.id, 'no email on grant');
  if (!grant.discount || !grant.code) return failSend(grant.id, 'grant has no minted discount');

  const amount = Number(grant.discount.value);
  const expiresAt = grant.discount.expiresAt ?? addDays(new Date(), EXPIRY_DAYS);

  try {
    const result = await sendPremiereCreditEmail({
      to: grant.email,
      customerName: grant.clientName,
      code: grant.code,
      amount,
      expiresAt,
      grantId: grant.id,
      discountId: grant.discountId ?? undefined,
    });

    if (!result.sent) {
      return failSend(grant.id, result.error || 'email send failed');
    }

    // SMS is best-effort — never blocks the SENT status.
    let smsSent = false;
    if (grant.phone) {
      try {
        await notifyPremiereCreditIssued({
          event: 'premiere.credit.issued',
          first_name: grant.clientName.trim().split(/\s+/)[0] || '',
          last_name: grant.clientName.trim().split(/\s+/).slice(1).join(' '),
          email: grant.email,
          phone: grant.phone,
          credit_code: grant.code,
          credit_amount: amount.toFixed(2),
          expires_on: formatExpiryForSms(expiresAt),
          redeem_url: REDEEM_URL,
          tags: ['premiere-credit'],
        });
        smsSent = true;
      } catch (err) {
        console.error('[premiere-credits] SMS notify failed:', err instanceof Error ? err.message : String(err));
      }
    }

    await prisma.premiereCreditGrant.update({
      where: { id: grant.id },
      data: { status: 'SENT', emailSentAt: new Date(), smsSentAt: smsSent ? new Date() : grant.smsSentAt, error: null },
    });
    return {
      status: 'SENT',
      delivered: { clientName: grant.clientName, amount, code: grant.code, expiresAt },
    };
  } catch (err) {
    // Never leave a grant stuck in SENDING — resolve to SEND_FAILED on any throw.
    return failSend(grant.id, err instanceof Error ? err.message : String(err));
  }
}

/** Mark a grant's send as failed and record the error. */
async function failSend(grantId: string, error: string): Promise<{ status: GrantStatus; error: string }> {
  await prisma.premiereCreditGrant.update({
    where: { id: grantId },
    data: { status: 'SEND_FAILED', error },
  });
  return { status: 'SEND_FAILED', error };
}

/** Long-form expiry for the SMS template variable. */
function formatExpiryForSms(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  }).format(date);
}
