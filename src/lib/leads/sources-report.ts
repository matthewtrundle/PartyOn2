/**
 * Lead sources rollup — how many REAL PEOPLE each form and channel produced,
 * and how many of them went on to buy.
 *
 * The board cannot answer this. It reads the top 500 leads by score and
 * filters in memory, so any count taken from it is a slice, not a total. It
 * also counts rows, and a row is not a person: the site saves a lead while
 * someone is still typing their email, so one visitor can leave twenty.
 *
 * Pure and Prisma-free — the route fetches, this shapes. Fragment collapse
 * mirrors `scripts/ops/reconcile-fragment-leads.mjs` so the panel and the
 * repair script always agree on what counts as one person.
 *
 * KNOWN LIMIT: that shared rule matches on the full address, so it collapses
 * truncation chains (`jo@gmail.co` → `jo@gmail.com`) but not chains that
 * diverge mid-word, which autofill can produce (`an@gmail.com` →
 * `anz@gmail.com` → …). Those still count as separate people, so `people` is
 * an upper bound. Deliberate: matching the repair script matters more than
 * squeezing out the last few percent, and a looser rule would start merging
 * genuinely different short addresses. `fragmentsCollapsed` is reported so the
 * operator can see how much merging happened rather than having to trust it.
 */

import { classifyLeadSource, type LeadChannel } from './source-taxonomy';

/** Emails shorter than this never absorb another — too easy to collide. */
const MIN_FRAGMENT_LEN = 6;
const COMPLETE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Collapse compares every pair of addresses, so cost is quadratic in the
 * number of DISTINCT emails. Most capture routes cap the field at 200 chars
 * but not all do, so clamp here too — the comparison only needs the prefix,
 * and an address this long is not a real one anyone is typing.
 */
const MAX_EMAIL_KEY_LEN = 254;

/** One lead row, projected to just what the rollup needs. */
export interface SourceReportLead {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  sourceWidget: string | null;
  utmMedium: string | null;
  metadata: unknown;
  affiliateId: string | null;
  pipelineStage: string | null;
  createdAt: Date;
}

/** A buyer identity, keyed by lowercased email. */
export interface BuyerRow {
  email: string;
  firstPaidAt: Date;
}

export interface SourceRow {
  key: string;
  label: string;
  channel: LeadChannel;
  people: number;
  open: number;
  won: number;
  lost: number;
  ordered: number;
  lastCapturedAt: string;
}

export interface SourcesReport {
  windowDays: number | null;
  totals: {
    leadRows: number;
    people: number;
    fragmentsCollapsed: number;
    /** Rows with no email and no phone — unreachable and unmatchable. */
    unreachableRows: number;
    /** Our own outbound prospecting, excluded from every rate below. */
    outboundRows: number;
  };
  channels: Array<{
    channel: LeadChannel;
    people: number;
    open: number;
    won: number;
    ordered: number;
  }>;
  forms: SourceRow[];
  monthly: Array<{ month: string; people: number; ordered: number }>;
}

export function normalizeEmailForReport(email: string | null): string | null {
  const s = (email ?? '').trim().toLowerCase().slice(0, MAX_EMAIL_KEY_LEN);
  return s && COMPLETE_EMAIL.test(s) ? s : null;
}

export function normalizePhoneForReport(phone: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-10) : null;
}

function filledCount(l: SourceReportLead): number {
  return [l.email, l.phone, l.firstName, l.lastName].filter(Boolean).length;
}

/**
 * Which row best represents a person: a real submission over a half-typed
 * one, then the fullest address, then the most complete contact record, then
 * the earliest. Same order as the repair script's pickKeeper.
 */
export function pickKeeper(rows: SourceReportLead[]): SourceReportLead {
  return [...rows].sort((a, b) => {
    const ap = a.status === 'PARTIAL' ? 1 : 0;
    const bp = b.status === 'PARTIAL' ? 1 : 0;
    if (ap !== bp) return ap - bp;
    const ae = (a.email ?? '').length;
    const be = (b.email ?? '').length;
    if (ae !== be) return be - ae;
    const af = filledCount(a);
    const bf = filledCount(b);
    if (af !== bf) return bf - af;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0];
}

/** Two addresses belong to one person when one was typed on the way to the other. */
function related(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= MIN_FRAGMENT_LEN && b.startsWith(a)) return true;
  if (b.length >= MIN_FRAGMENT_LEN && a.startsWith(b)) return true;
  return false;
}

export interface CollapsedPerson {
  keeper: SourceReportLead;
  rows: SourceReportLead[];
}

/**
 * Group rows into people. Email is the primary key; rows with no usable email
 * fall back to the last ten phone digits. Rows with neither are unreachable —
 * counted separately and never included in a rate.
 */
export function collapseToPeople(leads: SourceReportLead[]): {
  people: CollapsedPerson[];
  unreachable: SourceReportLead[];
} {
  const byEmail = new Map<string, SourceReportLead[]>();
  const byPhone = new Map<string, SourceReportLead[]>();
  const unreachable: SourceReportLead[] = [];

  for (const lead of leads) {
    const email = normalizeEmailForReport(lead.email);
    if (email) {
      const bucket = byEmail.get(email);
      if (bucket) bucket.push(lead);
      else byEmail.set(email, [lead]);
      continue;
    }
    const phone = normalizePhoneForReport(lead.phone);
    if (phone) {
      const bucket = byPhone.get(phone);
      if (bucket) bucket.push(lead);
      else byPhone.set(phone, [lead]);
      continue;
    }
    unreachable.push(lead);
  }

  // Union-find over the addresses so a typing chain collapses to one person
  // however many intermediate saves it left behind.
  const emails = [...byEmail.keys()];
  const parent = new Map(emails.map((e) => [e, e]));
  const find = (e: string): string => {
    let root = e;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  for (let i = 0; i < emails.length; i += 1) {
    for (let j = i + 1; j < emails.length; j += 1) {
      if (!related(emails[i], emails[j])) continue;
      const a = find(emails[i]);
      const b = find(emails[j]);
      if (a !== b) parent.set(a, b);
    }
  }

  const groups = new Map<string, SourceReportLead[]>();
  for (const [email, rows] of byEmail) {
    const key = `e:${find(email)}`;
    groups.set(key, (groups.get(key) ?? []).concat(rows));
  }
  for (const [phone, rows] of byPhone) groups.set(`p:${phone}`, rows);

  return {
    people: [...groups.values()].map((rows) => ({ keeper: pickKeeper(rows), rows })),
    unreachable,
  };
}

/**
 * A person's provenance is the richest one across their rows — fragments are
 * saved before the form is submitted, so the keeper is often the row with the
 * LEAST metadata.
 */
function provenanceFor(person: CollapsedPerson): ReturnType<typeof classifyLeadSource> {
  const classified = person.rows.map((row) =>
    classifyLeadSource({
      sourceWidget: row.sourceWidget,
      utmMedium: row.utmMedium,
      metadata: row.metadata,
      hasAffiliate: row.affiliateId != null,
    }),
  );
  const withForm = classified.find((c) => c.formKey != null);
  const withChannel = classified.find((c) => c.channel !== 'direct');
  const base = withForm ?? classified[0];
  return { ...base, channel: withForm?.channel ?? withChannel?.channel ?? base.channel };
}

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/**
 * Build the rollup. `outboundRows` are our own cold prospects — they are
 * counted once for transparency and then excluded, because mixing outreach we
 * sent into "where our leads come from" makes every rate meaningless.
 */
export function buildSourcesReport(
  leads: SourceReportLead[],
  buyers: BuyerRow[],
  windowDays: number | null,
): SourcesReport {
  const outbound = leads.filter((l) => l.sourceWidget === 'PARTNER_OUTREACH');
  const inbound = leads.filter((l) => l.sourceWidget !== 'PARTNER_OUTREACH');
  const { people, unreachable } = collapseToPeople(inbound);
  const buyerByEmail = new Map(buyers.map((b) => [b.email.toLowerCase(), b]));

  const channelAcc = new Map<LeadChannel, { people: number; open: number; won: number; ordered: number }>();
  const formAcc = new Map<string, SourceRow>();
  const monthAcc = new Map<string, { people: number; ordered: number }>();
  let fragmentsCollapsed = 0;

  for (const person of people) {
    fragmentsCollapsed += person.rows.length - 1;
    const source = provenanceFor(person);
    const keeper = person.keeper;
    const stage = keeper.pipelineStage;
    const won = person.rows.some((r) => r.pipelineStage === 'WON');
    const lost = !won && person.rows.some((r) => r.pipelineStage === 'LOST');
    const open = !won && !lost && stage != null;

    // Only an order placed at or after the lead was captured counts — an
    // existing customer who later fills in a form did not convert from it.
    const email = normalizeEmailForReport(keeper.email);
    const buyer = email ? buyerByEmail.get(email) : undefined;
    const ordered =
      buyer != null && buyer.firstPaidAt.getTime() >= keeper.createdAt.getTime();

    const channel = channelAcc.get(source.channel) ?? {
      people: 0,
      open: 0,
      won: 0,
      ordered: 0,
    };
    channel.people += 1;
    if (open) channel.open += 1;
    if (won) channel.won += 1;
    if (ordered) channel.ordered += 1;
    channelAcc.set(source.channel, channel);

    const formKey = source.formKey ?? '(unattributed)';
    const capturedAt = keeper.createdAt.toISOString();
    const form =
      formAcc.get(formKey) ??
      ({
        key: formKey,
        label: source.formLabel ?? 'No form recorded',
        channel: source.channel,
        people: 0,
        open: 0,
        won: 0,
        lost: 0,
        ordered: 0,
        lastCapturedAt: capturedAt,
      } satisfies SourceRow);
    form.people += 1;
    if (open) form.open += 1;
    if (won) form.won += 1;
    if (lost) form.lost += 1;
    if (ordered) form.ordered += 1;
    if (capturedAt > form.lastCapturedAt) form.lastCapturedAt = capturedAt;
    formAcc.set(formKey, form);

    const month = monthKey(keeper.createdAt);
    const bucket = monthAcc.get(month) ?? { people: 0, ordered: 0 };
    bucket.people += 1;
    if (ordered) bucket.ordered += 1;
    monthAcc.set(month, bucket);
  }

  return {
    windowDays,
    totals: {
      leadRows: leads.length,
      people: people.length,
      fragmentsCollapsed,
      unreachableRows: unreachable.length,
      outboundRows: outbound.length,
    },
    channels: [...channelAcc.entries()]
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.people - a.people),
    forms: [...formAcc.values()].sort((a, b) => b.people - a.people),
    monthly: [...monthAcc.entries()]
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}
