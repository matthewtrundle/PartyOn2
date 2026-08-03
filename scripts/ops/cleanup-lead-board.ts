/**
 * Take non-actionable cards off the Lead Flow board.
 *
 * DRY-RUN BY DEFAULT — pass --apply to write. Idempotent (every update is
 * guarded on the row not already being in the target state). Nothing is
 * deleted: only two columns move, and each write appends a LeadEvent recording
 * the row's PRIOR stage and status, so a mistake can be reversed from the
 * database rather than from terminal scrollback.
 *
 * WHY TWO COLUMNS. The board selects rows by `pipeline_stage`
 * (board-data.ts fetchBoardRows), but re-enrollment keys on `status`
 * (pipeline.ts isBoardEligible + sweepEnrollSubmitted, which runs as the FIRST
 * statement of getBoardData — i.e. on every single board render). Clearing the
 * stage alone gets silently undone on the next page view; setting the status
 * alone leaves the card on screen. Junk therefore needs both:
 *
 *   pipeline_stage = NULL   → off the board now
 *   status = 'ARCHIVED'     → the enroll sweep will not put it back
 *
 * The partner-outreach rows are the exception: they get stage = NULL only.
 * They have neither email nor phone, so the sweep's `OR [email, phone] NOT
 * NULL` filter already excludes them permanently, and they must keep their
 * status because the outreach journeys branch on it (followups/journeys.ts).
 *
 * ARCHIVED IS EFFECTIVELY TERMINAL — archive machinery, never people.
 * Three of the four capture surfaces (dashboard-lead.ts, quickbuy-lead.ts,
 * inbound-email.ts) only re-promote a lead whose status is PARTIAL or
 * ANONYMOUS; for anything else they call enrollLeadIfEligible, which
 * isBoardEligible rejects for ARCHIVED. So if an archived person later buys
 * through QuickBuy, joins a group dashboard, or emails info@, their card does
 * NOT come back and nobody sees it. (Only chat/submit and quote/start force
 * status back to SUBMITTED, so those two self-heal.)
 *
 * That is why the classification here is deliberately timid: explicit
 * allow-lists rather than heuristics, a strict-prefix test for typo fragments
 * rather than a fuzzy one, and a hard refusal to touch anything carrying an
 * order or a draft. A false positive is not a cosmetic mistake — it silently
 * removes a real customer from the operator's view for good.
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/ops/cleanup-lead-board.ts            # report
 *   npx tsx scripts/ops/cleanup-lead-board.ts --apply    # write
 */

import { prisma } from '../../src/lib/database/client';

const APPLY = process.argv.includes('--apply');
const tag = APPLY ? '[APPLY]' : '[dry-run]';
const log = (s: string): void => console.log(`${tag} ${s}`);

const ACTIVE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_SENT'];

/**
 * Addresses that are machinery, not people: marketplace/vendor notification
 * senders and our own inboxes. Explicit rather than pattern-matched — the
 * inbound-email ingestion also catches real customers who write to info@, and
 * a heuristic on "looks like a company" would archive them too.
 */
const VENDOR_ADDRESSES = new Set(
  [
    'sellersupport@shop.tiktok.com',
    'jordan@shop.tiktok.com',
    'taylor@shop.tiktok.com',
    'info@metricool.com',
    'cloudplatform-noreply@google.com',
    'rachael@leadgenjay.io',
    'solstice.sourcing@gmail.com',
    'info@shop.partyondelivery.com',
  ].map((a) => a.toLowerCase()),
);

/** Our own / staging addresses — never customers. */
function isOurs(email: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return (
    e.endsWith('@partyondelivery.com') ||
    e.endsWith('@premierpartycruises.com') ||
    /\+test\d*@/.test(e) ||
    e.endsWith('@example.com')
  );
}

type Action = 'archive' | 'off-board' | 'keep';

interface Row {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  sourceWidget: string | null;
  status: string;
  pipelineStage: string | null;
  orderId: string | null;
  draftOrderId: string | null;
}

/** What should happen to this card, and why. */
function classify(
  r: Row,
  deadAddresses: ReadonlySet<string>,
  fragmentTwins: ReadonlySet<string>,
): { action: Action; reason: string } {
  // Never touch a card attached to real money, whatever else it looks like.
  if (r.orderId || r.draftOrderId) return { action: 'keep', reason: 'has an order/draft attached' };

  if (isOurs(r.email)) return { action: 'archive', reason: 'our own / test address' };

  const email = r.email?.toLowerCase() ?? '';
  if (VENDOR_ADDRESSES.has(email)) return { action: 'archive', reason: 'vendor / marketplace noise' };
  if (email.endsWith('@member.theknot.com')) {
    return { action: 'archive', reason: 'automated marketplace notification' };
  }

  // Keystroke fragment: the address only ever bounced AND the same person has
  // a second card on a deliverable address (someone typed "gmail.co" on the way
  // to "gmail.com"). Both conditions matter — a bounced address on its own means
  // "we cannot email them", NOT "they are not a lead". Cheryle Iglehart is the
  // worked example: bounced address, no phone, but a WARM Premier card with an
  // event 17 days out. Archiving her would have hidden a real lead. Unreachable
  // cards like that stay on the board and get reported separately below.
  if (r.email && deadAddresses.has(r.email.toLowerCase()) && fragmentTwins.has(r.email.toLowerCase())) {
    return { action: 'archive', reason: 'typo fragment — the finished address is a separate card' };
  }

  if (r.sourceWidget === 'PARTNER_OUTREACH' && !r.email && !r.phone) {
    return { action: 'off-board', reason: 'outreach prospect, no contact info — belongs in the prospects workbench' };
  }
  if (!r.email && !r.phone) return { action: 'off-board', reason: 'no email and no phone — cannot be actioned' };

  return { action: 'keep', reason: '' };
}

async function main(): Promise<void> {
  const host = /@([^/?]+)/.exec(process.env.DATABASE_URL ?? '')?.[1] ?? 'unknown';
  log(`database: ${host}`);

  // Addresses where every send bounced and none was delivered.
  const dead = await prisma.$queryRaw<Array<{ to: string }>>`
    SELECT LOWER("to") AS to FROM email_logs
    GROUP BY LOWER("to")
    HAVING COUNT(*) FILTER (WHERE status = 'BOUNCED') > 0
       AND COUNT(*) FILTER (WHERE status = 'DELIVERED') = 0
  `;
  const deadAddresses = new Set(dead.map((d) => d.to));

  // Every lead address, not just the open board — a fragment's finished twin
  // may already have been worked and closed.
  const allRows = await prisma.lead.findMany({
    where: { email: { not: null } },
    select: { email: true },
  });
  const allEmails = [
    ...new Set(allRows.map((r) => r.email?.toLowerCase()).filter((e): e is string => Boolean(e))),
  ];

  const rows = (await prisma.lead.findMany({
    where: { pipelineStage: { in: ACTIVE_STAGES } },
    select: {
      id: true, email: true, phone: true, firstName: true, lastName: true,
      sourceWidget: true, status: true, pipelineStage: true,
      orderId: true, draftOrderId: true,
    },
  })) as unknown as Row[];

  // A bounced address is a "fragment" only when a deliverable address exists
  // that it is a STRICT PREFIX of — "x@gmail.co" while the visitor was still
  // typing "x@gmail.com". Mirrors the prefix rule upsertLead already uses
  // (leadCapture.ts "Fragment merge"), including its ≥6-char floor.
  //
  // Matching on the local part alone would be badly wrong: 17 different
  // companies in this table share `info@` (dtrbartending, lynnslodging,
  // placemakr…) and 10 share `hello@`. One bounced `info@` plus one live
  // `info@` elsewhere would have archived a real partner.
  const liveEmails = allEmails.filter((e) => !deadAddresses.has(e));
  const fragmentTwins = new Set(
    allEmails.filter(
      (e) =>
        deadAddresses.has(e) &&
        e.length >= 6 &&
        liveEmails.some((live) => live.length > e.length && live.startsWith(e)),
    ),
  );

  const archive: Array<{ row: Row; reason: string }> = [];
  const offBoard: Array<{ row: Row; reason: string }> = [];
  for (const row of rows) {
    const { action, reason } = classify(row, deadAddresses, fragmentTwins);
    if (action === 'archive') archive.push({ row, reason });
    else if (action === 'off-board') offBoard.push({ row, reason });
  }

  const name = (r: Row): string =>
    [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email || r.id.slice(0, 8);

  log(`scanned ${rows.length} open cards → ${archive.length} to archive, ${offBoard.length} to take off-board, ${rows.length - archive.length - offBoard.length} untouched`);

  log('');
  log(`ARCHIVE (stage → NULL, status → ARCHIVED) — ${archive.length}:`);
  for (const { row, reason } of archive) {
    log(`   ${(row.email ?? name(row)).padEnd(42)} ${row.sourceWidget ?? '—'}  · ${reason}`);
  }

  log('');
  log(`OFF-BOARD (stage → NULL, status untouched) — ${offBoard.length}:`);
  for (const { row, reason } of offBoard) {
    log(`   ${name(row).padEnd(42)} ${row.sourceWidget ?? '—'}  · ${reason}`);
  }

  // Anything inbound we are deliberately LEAVING — printed so the operator can
  // see what the allow-list let through rather than trusting it silently.
  const keptInbound = rows.filter(
    (r) => r.sourceWidget === 'INBOUND_EMAIL' && classify(r, deadAddresses, fragmentTwins).action === 'keep',
  );
  log('');
  log(`LEFT ON THE BOARD — inbound email that looks like a real person (${keptInbound.length}):`);
  for (const r of keptInbound) log(`   ${(r.email ?? '—').padEnd(42)} ${name(r)}`);

  // Cards we cannot email and cannot phone — left on the board deliberately,
  // but the operator needs to know reaching them requires another channel.
  const unreachable = rows.filter(
    (r) =>
      classify(r, deadAddresses, fragmentTwins).action === 'keep' &&
      r.email &&
      deadAddresses.has(r.email.toLowerCase()) &&
      !r.phone,
  );
  if (unreachable.length > 0) {
    log('');
    log(`LEFT ON THE BOARD, but UNREACHABLE — email bounces and there is no phone (${unreachable.length}):`);
    for (const r of unreachable) log(`   ${(r.email ?? '—').padEnd(42)} ${name(r)} · ${r.sourceWidget ?? '—'}`);
  }

  // Same person on the board twice — flagged, not auto-resolved: picking a
  // winner is a judgement call, and the queue only wastes one keystroke on it.
  const byEmail = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.email) continue;
    const k = r.email.toLowerCase();
    if (classify(r, deadAddresses, fragmentTwins).action !== 'keep') continue;
    byEmail.set(k, [...(byEmail.get(k) ?? []), r]);
  }
  const dupes = [...byEmail.entries()].filter(([, v]) => v.length > 1);
  if (dupes.length > 0) {
    log('');
    log(`FLAGGED, not changed — same address on more than one open card (${dupes.length}):`);
    for (const [email, group] of dupes) {
      log(`   ${email}`);
      for (const g of group) log(`      ${g.sourceWidget} · ${g.pipelineStage} · ${g.status}`);
    }
  }

  if (!APPLY) {
    log('');
    log('dry-run complete — re-run with --apply to write.');
    return;
  }

  /** Record what a row looked like before we touched it, so this is undoable. */
  async function audit(row: Row, to: { stage: null; status?: string }, reason: string): Promise<void> {
    await prisma.leadEvent
      .create({
        data: {
          leadId: row.id,
          type: 'CUSTOM',
          metadata: {
            kind: 'ops.board-cleanup',
            reason,
            from: { pipelineStage: row.pipelineStage, status: row.status },
            to: { pipelineStage: null, status: to.status ?? row.status },
          } as never,
        },
      })
      .catch(() => undefined);
  }

  let archived = 0;
  for (const { row, reason } of archive) {
    const res = await prisma.lead.updateMany({
      // orderId/draftOrderId re-checked here, not just at classify() time: a
      // lead can gain a draft between the dry run and --apply (sweepQuoteSent
      // leaves it in QUOTE_SENT, still an active stage).
      where: { id: row.id, pipelineStage: { in: ACTIVE_STAGES }, orderId: null, draftOrderId: null },
      data: { pipelineStage: null, status: 'ARCHIVED' },
    });
    if (res.count > 0) await audit(row, { stage: null, status: 'ARCHIVED' }, reason);
    archived += res.count;
  }
  let cleared = 0;
  for (const { row, reason } of offBoard) {
    const res = await prisma.lead.updateMany({
      where: { id: row.id, pipelineStage: { in: ACTIVE_STAGES }, orderId: null, draftOrderId: null },
      data: { pipelineStage: null },
    });
    if (res.count > 0) await audit(row, { stage: null }, reason);
    cleared += res.count;
  }

  log('');
  log(`archived ${archived}/${archive.length}, took ${cleared}/${offBoard.length} off-board (skips = already moved).`);

  const left = await prisma.lead.count({ where: { pipelineStage: { in: ACTIVE_STAGES } } });
  log(`board now holds ${left} open cards.`);
}

main()
  .catch((err) => {
    console.error('[cleanup-lead-board] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
