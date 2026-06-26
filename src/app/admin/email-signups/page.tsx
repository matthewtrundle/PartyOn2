import Link from 'next/link';
import { prisma } from '@/lib/database/client';
import { getOpsSession } from '@/lib/auth/ops-session';
import type { Prisma } from '@prisma/client';

/**
 * Admin → Emails → Signups.
 *
 * Read-only view of every email address being collected across the site. The
 * canonical store is the `leads` table — the footer/blog newsletter form, the
 * event quiz, and the on-site lead pixel all write here. Newsletter opt-ins are
 * `sourceWidget = EMAIL_SIGNUP` with a `metadata.newsletter` record.
 *
 * Server component. Filters via URL params (?q=, ?source=) so there's no client
 * JS. A defensive server-side admin check keeps the email PII from being
 * fetched/serialized for non-admins (the /admin layout gate is client-side).
 */
export const dynamic = 'force-dynamic';

const WIDGET_LABELS: Record<string, string> = {
  QUICK_BUY: 'Quick-Buy',
  PACKAGE_BUILDER: 'Build-My-Package',
  A_LA_CARTE: 'A-la-carte',
  CALL_BOOKING: 'Call booking',
  EMAIL_SIGNUP: 'Newsletter signup',
  CONTACT_FORM: 'Contact form',
  DRINK_CALCULATOR: 'Drink calculator',
  OTHER: 'Other',
};

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  ANONYMOUS: { bg: '#F3F4F6', fg: '#374151' },
  PARTIAL: { bg: '#FEF3C7', fg: '#92400E' },
  SUBMITTED: { bg: '#DBEAFE', fg: '#1E40AF' },
  CONVERTED: { bg: '#DCFCE7', fg: '#166534' },
  ARCHIVED: { bg: '#FEE2E2', fg: '#991B1B' },
};

const TAKE = 500;

function fmtDate(d: Date) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function newsletterStatus(meta: Prisma.JsonValue | null): string | null {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const nl = (meta as Record<string, unknown>).newsletter;
    if (nl && typeof nl === 'object') return (nl as Record<string, unknown>).status as string ?? 'pending';
  }
  return null;
}

export default async function EmailSignupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string }>;
}) {
  const session = await getOpsSession();
  if (!session || session.role !== 'admin') {
    return (
      <div className="p-8">
        <p className="text-gray-700">
          Admin sign-in required.{' '}
          <Link href="/admin" className="text-brand-blue underline">Go to /admin</Link>.
        </p>
      </div>
    );
  }

  const { q, source } = await searchParams;
  const search = (q || '').trim();
  const onlyNewsletter = source === 'newsletter';

  // base filter: rows that actually have an email
  const where: Prisma.LeadWhereInput = { email: { not: null } };
  if (onlyNewsletter) where.sourceWidget = 'EMAIL_SIGNUP';
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [leads, totalEmails, newsletterCount, confirmedCount, last7, drinkCalc] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: TAKE }),
    prisma.lead.count({ where: { email: { not: null } } }),
    prisma.lead.count({ where: { email: { not: null }, sourceWidget: 'EMAIL_SIGNUP' } }),
    prisma.lead.count({ where: { metadata: { path: ['newsletter', 'status'], equals: 'confirmed' } } }),
    prisma.lead.count({ where: { email: { not: null }, createdAt: { gte: weekAgo } } }),
    prisma.drinkCalculatorLead.count(),
  ]);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header + sub-nav */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Signups</h1>
            <p className="text-gray-500 mt-0.5">Every email address collected across the site (the leads store).</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Link href="/admin/emails" className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">Email Preview</Link>
          <span className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-pink-600 text-white">Signups</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Total emails collected" value={totalEmails} />
        <Stat label="Newsletter signups" value={newsletterCount} color="#BE185D" />
        <Stat label="Confirmed newsletter" value={confirmedCount} color="#166534" />
        <Stat label="New (last 7 days)" value={last7} color="#1E40AF" />
        <Stat label="Drink-calc leads*" value={drinkCalc} color="#6B7280" />
      </div>

      {/* Filter bar (server-side, GET form) */}
      <form method="GET" className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search email or name…"
          className="flex-1 min-w-[220px] max-w-md px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
        />
        <select name="source" defaultValue={source || 'all'} className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500">
          <option value="all">All sources</option>
          <option value="newsletter">Newsletter signups only</option>
        </select>
        <button type="submit" className="px-5 py-2.5 bg-brand-blue text-white rounded-lg font-semibold hover:bg-blue-700">Search</button>
        {(search || onlyNewsletter) && (
          <Link href="/admin/email-signups" className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Clear</Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-md border border-gray-200 overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide text-gray-800">
            {onlyNewsletter ? 'Newsletter signups' : 'Collected emails'}{search ? ` matching “${search}”` : ''} ({leads.length}{leads.length === TAKE ? `+, showing newest ${TAKE}` : ''})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <Th>When</Th><Th>Email</Th><Th>Name</Th><Th>Phone</Th><Th>Source</Th><Th>Newsletter</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">No emails collected yet for this filter.</td></tr>
              )}
              {leads.map((l) => {
                const sc = STATUS_COLOR[l.status] ?? STATUS_COLOR.PARTIAL;
                const nl = newsletterStatus(l.metadata);
                return (
                  <tr key={l.id} className="border-t border-gray-100 align-top hover:bg-gray-50">
                    <Td>{fmtDate(l.createdAt)}</Td>
                    <Td><span className="text-gray-900 font-medium">{l.email}</span></Td>
                    <Td>{[l.firstName, l.lastName].filter(Boolean).join(' ') || <span className="text-gray-400">—</span>}</Td>
                    <Td><span className="text-gray-600">{l.phone || '—'}</span></Td>
                    <Td>
                      <span className="text-xs font-semibold text-purple-700">{l.sourceWidget ? (WIDGET_LABELS[l.sourceWidget] ?? l.sourceWidget) : '—'}</span>
                      {l.sourcePage && <div className="text-xs text-gray-400">{l.sourcePage}</div>}
                    </Td>
                    <Td>
                      {nl ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={nl === 'confirmed' ? { background: '#DCFCE7', color: '#166534' } : { background: '#FEF3C7', color: '#92400E' }}>
                          {nl}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </Td>
                    <Td>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ background: sc.bg, color: sc.fg }}>{l.status}</span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        * Drink-calculator leads live in a separate legacy table and aren&apos;t listed above — count shown for completeness.
        Newsletter signups appear here once <code className="bg-gray-100 px-1 rounded">/api/newsletter</code> is deployed (PR&nbsp;#157).
      </p>
    </div>
  );
}

function Stat({ label, value, color = '#111827' }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>{value.toLocaleString()}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="px-4 py-2 text-left">{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-2">{children}</td>; }
