/**
 * Premiere Credit automation — admin operations.
 *
 * Powers /admin/premiere-credits: list grants with live redemption (joined
 * from the linked Discount), and the operator actions (approve & send, resend,
 * add contact, cancel). Redemption is always derived from the Discount, never
 * stored on the grant. All mutations run behind requireOpsAuth in the routes.
 */

import { prisma } from '@/lib/database/client';
import { mintForGrant, sendGrant, type DeliveredInfo } from './grant-service';
import type { GrantStatus } from './types';

/** A grant enriched with derived redemption info for the admin UI. */
export interface GrantView {
  id: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  amount: number;
  code: string | null;
  status: string;
  holdReason: string | null;
  error: string | null;
  bookingDate: string | null;
  cruiseDate: string | null;
  createdAt: string;
  emailSentAt: string | null;
  expiresAt: string | null;
  /** True when the linked discount has been used at least once. */
  redeemed: boolean;
  redeemedAt: string | null;
  /** Dollars actually taken off orders (sum of DiscountUsage.amountSaved). */
  amountSaved: number;
}

export interface ListFilters {
  status?: string | null;
  redeemed?: string | null; // 'true' | 'false'
  from?: string | null;     // ISO date, filters on redemption date
  to?: string | null;
}

export interface ListResult {
  grants: GrantView[];
  summary: {
    count: number;
    totalGranted: number;      // sum of grant amounts
    redeemedCount: number;
    totalRedeemedGranted: number; // grant amount of redeemed grants (billing basis A)
    totalRedeemedSaved: number;   // actual amountSaved of redeemed grants (billing basis B)
  };
}

/** Load grants + derive redemption, apply filters, and total for invoicing. */
export async function listGrants(filters: ListFilters): Promise<ListResult> {
  const where = filters.status ? { status: filters.status } : {};
  const rows = await prisma.premiereCreditGrant.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 1000, // bound the response; one row per Premiere refund, so ample

    include: {
      discount: {
        select: {
          usageCount: true,
          expiresAt: true,
          usageHistory: { select: { usedAt: true, amountSaved: true }, orderBy: { usedAt: 'asc' } },
        },
      },
    },
  });

  const fromMs = filters.from ? Date.parse(filters.from) : null;
  const toMs = filters.to ? Date.parse(filters.to) + 24 * 60 * 60 * 1000 - 1 : null;

  const grants: GrantView[] = [];
  for (const g of rows) {
    const usage = g.discount?.usageHistory ?? [];
    const redeemed = (g.discount?.usageCount ?? 0) >= 1;
    const redeemedAt = usage[0]?.usedAt ?? null;
    const amountSaved = usage.reduce((sum, u) => sum + Number(u.amountSaved), 0);

    if (filters.redeemed === 'true' && !redeemed) continue;
    if (filters.redeemed === 'false' && redeemed) continue;
    if ((fromMs || toMs) && redeemedAt) {
      const t = redeemedAt.getTime();
      if (fromMs && t < fromMs) continue;
      if (toMs && t > toMs) continue;
    } else if (fromMs || toMs) {
      continue; // date-window filter implies "redeemed in window"
    }

    grants.push({
      id: g.id,
      clientName: g.clientName,
      email: g.email,
      phone: g.phone,
      amount: Number(g.amount),
      code: g.code,
      status: g.status,
      holdReason: g.holdReason,
      error: g.error,
      bookingDate: g.bookingDate ? g.bookingDate.toISOString().slice(0, 10) : null,
      cruiseDate: g.cruiseDate ? g.cruiseDate.toISOString().slice(0, 10) : null,
      createdAt: g.createdAt.toISOString(),
      emailSentAt: g.emailSentAt ? g.emailSentAt.toISOString() : null,
      expiresAt: g.discount?.expiresAt ? g.discount.expiresAt.toISOString() : null,
      redeemed,
      redeemedAt: redeemedAt ? redeemedAt.toISOString() : null,
      amountSaved,
    });
  }

  const redeemedGrants = grants.filter((g) => g.redeemed);
  return {
    grants,
    summary: {
      count: grants.length,
      totalGranted: round2(grants.reduce((s, g) => s + g.amount, 0)),
      redeemedCount: redeemedGrants.length,
      totalRedeemedGranted: round2(redeemedGrants.reduce((s, g) => s + g.amount, 0)),
      totalRedeemedSaved: round2(redeemedGrants.reduce((s, g) => s + g.amountSaved, 0)),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Approve a held grant and send it. Mints first if it has no discount yet. */
export async function approveAndSend(
  grantId: string,
  approvedBy: string,
): Promise<{ status: GrantStatus; error?: string; delivered?: DeliveredInfo }> {
  const grant = await prisma.premiereCreditGrant.findUnique({ where: { id: grantId } });
  if (!grant) throw new Error('grant not found');
  if (grant.status !== 'HELD_FOR_APPROVAL') throw new Error(`cannot approve grant in status ${grant.status}`);

  if (!grant.discountId) await mintForGrant(grant);
  // Held grants mint INACTIVE (the code isn't redeemable pre-approval).
  // Approval is what makes it live — activate before the send goes out.
  const fresh = await prisma.premiereCreditGrant.findUnique({
    where: { id: grantId },
    select: { discountId: true },
  });
  if (fresh?.discountId) {
    await prisma.discount.update({ where: { id: fresh.discountId }, data: { isActive: true } });
  }
  await prisma.premiereCreditGrant.update({
    where: { id: grantId },
    data: { approvedAt: new Date(), approvedBy },
  });
  return sendGrant(grantId);
}

/** Resend a grant's code (already sent or previously failed). */
export async function resend(grantId: string): Promise<{ status: GrantStatus; error?: string }> {
  const grant = await prisma.premiereCreditGrant.findUnique({ where: { id: grantId }, select: { status: true } });
  if (!grant) throw new Error('grant not found');
  if (grant.status !== 'SENT' && grant.status !== 'SEND_FAILED') {
    throw new Error(`cannot resend grant in status ${grant.status}`);
  }
  return sendGrant(grantId);
}

/**
 * Fill in contact info for a NEEDS_CONTACT grant and mint its code. Sending
 * then follows the normal gated path (cron send phase, or Approve if held).
 */
export async function setContact(
  grantId: string,
  email: string,
  phone: string | null,
): Promise<{ status: GrantStatus }> {
  const grant = await prisma.premiereCreditGrant.findUnique({ where: { id: grantId } });
  if (!grant) throw new Error('grant not found');
  if (grant.status !== 'NEEDS_CONTACT') throw new Error(`cannot set contact on grant in status ${grant.status}`);

  const updated = await prisma.premiereCreditGrant.update({
    where: { id: grantId },
    data: { email, phone: phone ?? grant.phone },
  });
  const minted = await mintForGrant(updated);
  return { status: minted.status as GrantStatus };
}

/** Cancel a grant and deactivate its (unredeemed) discount. */
export async function cancel(grantId: string): Promise<{ status: GrantStatus }> {
  const grant = await prisma.premiereCreditGrant.findUnique({
    where: { id: grantId },
    select: { id: true, status: true, discountId: true },
  });
  if (!grant) throw new Error('grant not found');
  // Never cancel mid-send — a race with sendGrant would leave the customer
  // holding a code that was just deactivated, with a nondeterministic status.
  if (grant.status === 'SENDING') throw new Error('cannot cancel while a send is in flight');
  if (grant.status === 'CANCELED') throw new Error('grant already canceled');

  await prisma.$transaction(async (tx) => {
    if (grant.discountId) {
      // Re-check redemption INSIDE the transaction (TOCTOU): a redemption that
      // landed since the read above must still block the cancel.
      const disc = await tx.discount.findUnique({
        where: { id: grant.discountId },
        select: { usageCount: true },
      });
      if ((disc?.usageCount ?? 0) >= 1) throw new Error('cannot cancel a redeemed credit');
      await tx.discount.update({ where: { id: grant.discountId }, data: { isActive: false } });
    }
    await tx.premiereCreditGrant.update({ where: { id: grantId }, data: { status: 'CANCELED' } });
  });
  return { status: 'CANCELED' };
}
