/**
 * Verified won-order matching for the Lead Flow board (extracted from
 * pipeline.ts, which owns the sweep + stage writes; this module owns the
 * identity/floor SQL assembly).
 *
 * Two match branches, one query:
 *  - DIRECT orders (no group): the order's own customer_email/customer_phone
 *    matches the lead. GroupOrderV2-participant payments are excluded here —
 *    a $40 guest chip-in is not a won party (risk R1).
 *  - GROUP orders where the LEAD IS THE HOST (gap closure 2026-07-14): any
 *    paid order on a dashboard whose host_email/host_phone matches the lead
 *    wins the HOST's lead — including guest payments on that dashboard,
 *    because money arriving on your dashboard means your party is happening.
 *    Guests' leads still can't be won by their own chip-ins: the join
 *    matches the group's HOST columns, never the payer's.
 *
 * Uses idx_orders_customer_phone_last10 (direct branch) and the
 * orders.group_order_v2_id index (host branch join).
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/client';
import { phoneLast10 } from './phone';

/**
 * Earliest order date that may count toward this lead's current inquiry:
 * the lead's creation, or its most recent reopen — a reopened card's OLD
 * order must not re-win it. Shared by the won matcher and the quote-sent
 * sweep.
 */
export function matchFloor(lead: { createdAt: Date; reopenedAt: Date | null }): Date {
  return lead.reopenedAt && lead.reopenedAt > lead.createdAt
    ? lead.reopenedAt
    : lead.createdAt;
}

interface LeadIdentity {
  email: string | null;
  phone: string | null;
  createdAt: Date;
  reopenedAt: Date | null;
}

function identityClauses(
  lead: Pick<LeadIdentity, 'email' | 'phone'>,
  emailCol: string,
  phoneCol: string,
): Prisma.Sql[] {
  const clauses: Prisma.Sql[] = [];
  if (lead.email) {
    clauses.push(Prisma.sql`LOWER(${Prisma.raw(emailCol)}) = LOWER(${lead.email})`);
  }
  const last10 = phoneLast10(lead.phone);
  if (last10) {
    clauses.push(
      Prisma.sql`RIGHT(REGEXP_REPLACE(COALESCE(${Prisma.raw(phoneCol)}, ''), '\\D', '', 'g'), 10) = ${last10}`,
    );
  }
  return clauses;
}

/**
 * Identity clauses + date floor for the DIRECT order match, pure so the SQL
 * inputs are testable without a database: email matches case-insensitively,
 * phone matches on the last 10 digits, and a lead with neither yields no
 * clauses (the caller must then skip the query).
 */
export function wonOrderIdentity(lead: LeadIdentity): { floor: Date; identity: Prisma.Sql[] } {
  return { floor: matchFloor(lead), identity: identityClauses(lead, 'o.customer_email', 'o.customer_phone') };
}

/**
 * Identity clauses matching the lead against a group order's HOST contact
 * columns — the host-WON branch. Pure, mirrors wonOrderIdentity.
 */
export function wonGroupHostIdentity(lead: Pick<LeadIdentity, 'email' | 'phone'>): Prisma.Sql[] {
  return identityClauses(lead, 'g.host_email', 'g.host_phone');
}

/**
 * High-confidence paid-order match for one lead: created on/after the lead
 * (or its reopen), and either a direct order in the lead's own name or any
 * order on a dashboard the lead HOSTS.
 */
export async function findWonOrder(lead: LeadIdentity): Promise<{ id: string } | null> {
  const { floor, identity } = wonOrderIdentity(lead);
  if (identity.length === 0) return null;
  const hostIdentity = wonGroupHostIdentity(lead);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT o.id FROM orders o
    LEFT JOIN group_orders_v2 g ON g.id = o.group_order_v2_id
    WHERE o.financial_status IN ('PAID', 'PARTIALLY_REFUNDED')
      AND o.created_at >= ${floor}
      AND (
        (o.group_order_v2_id IS NULL AND (${Prisma.join(identity, ' OR ')}))
        OR (o.group_order_v2_id IS NOT NULL AND (${Prisma.join(hostIdentity, ' OR ')}))
      )
    ORDER BY o.created_at ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}
