import { prisma } from '@/lib/database/client';

/**
 * Brian's Stuff → Leads tab.
 *
 * Server component. Renders a flat table of every Lead row plus an
 * anonymous-session counter at the top (how many visitor sessions we have
 * with no identifying info yet).
 *
 * Intentionally minimal — once we start enriching leads (IP geo,
 * Clearbit/RB2B, AI chat outcomes) we'll expand this into a real CRM
 * panel. For now this is the proof-of-concept storage view so Brian can
 * confirm leads are being captured from forms across the site.
 */
export const dynamic = 'force-dynamic';

const WIDGET_LABELS: Record<string, string> = {
  QUICK_BUY: 'Quick-Buy',
  PACKAGE_BUILDER: 'Build-My-Package',
  A_LA_CARTE: 'A-la-carte',
  CALL_BOOKING: 'Call booking',
  EMAIL_SIGNUP: 'Email signup',
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

function fmtDate(d: Date) {
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function LeadsView() {
  const [leads, totalLeads, anonSessions, partialCount, submittedCount, convertedCount, conciergeCount] =
    await Promise.all([
      prisma.lead.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 200,
        include: {
          events: { orderBy: { occurredAt: 'desc' }, take: 1 },
          sessions: { orderBy: { lastSeenAt: 'desc' }, take: 1 },
        },
      }),
      prisma.lead.count(),
      prisma.visitorSession.count({ where: { leadId: null } }),
      prisma.lead.count({ where: { status: 'PARTIAL' } }),
      prisma.lead.count({ where: { status: 'SUBMITTED' } }),
      prisma.lead.count({ where: { status: 'CONVERTED' } }),
      // Premier Concierge leads — stored in metadata.partner so we don't
      // need a schema migration for a new enum value. If we ever start
      // seeing dozens per day we'll promote this to its own column.
      prisma.lead.count({
        where: { metadata: { path: ['partner'], equals: 'premier-concierge' } },
      }),
    ]);

  return (
    <div className="space-y-6">
      {/* Top-line counters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Total leads" value={totalLeads} />
        <Stat label="Anonymous sessions" value={anonSessions} />
        <Stat label="Partial" value={partialCount} color="#92400E" />
        <Stat label="Submitted" value={submittedCount} color="#1E40AF" />
        <Stat label="Converted" value={convertedCount} color="#166534" />
        <Stat label="🥃 Concierge" value={conciergeCount} color="#5B21B6" />
      </div>

      <div className="rounded-md border border-gray-200 overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-sm tracking-wide text-gray-800">
            Recent leads ({leads.length})
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Captured from any form on the site — page is the origin URL,
            widget is which on-site component captured them.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <Th>When</Th>
                <Th>Status</Th>
                <Th>Name</Th>
                <Th>Email / Phone</Th>
                <Th>Widget</Th>
                <Th>Page</Th>
                <Th>Last event</Th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No leads yet — type into any form on the site and refresh
                    this page to see them appear here.
                  </td>
                </tr>
              )}
              {leads.map((l) => {
                const sc = STATUS_COLOR[l.status] ?? STATUS_COLOR.PARTIAL;
                const lastEvent = l.events[0];
                const meta = (l.metadata as Record<string, unknown> | null) ?? {};
                const isConcierge = meta.partner === 'premier-concierge';
                return (
                  <tr
                    key={l.id}
                    className="border-t border-gray-100 align-top"
                    style={isConcierge ? { background: '#FAF5FF' } : undefined}
                  >
                    <Td>{fmtDate(l.updatedAt)}</Td>
                    <Td>
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                        style={{ background: sc.bg, color: sc.fg }}
                      >
                        {l.status}
                      </span>
                    </Td>
                    <Td>
                      {[l.firstName, l.lastName].filter(Boolean).join(' ') || (
                        <span className="text-gray-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="text-gray-800">{l.email || '—'}</div>
                      <div className="text-gray-500 text-xs">{l.phone || ''}</div>
                    </Td>
                    <Td>
                      {isConcierge && (
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider mr-1"
                          style={{ background: '#5B21B6', color: '#F2D34F' }}
                        >
                          🥃 CONCIERGE
                        </span>
                      )}
                      {l.sourceWidget ? (
                        <span className="text-xs font-semibold text-purple-700">
                          {WIDGET_LABELS[l.sourceWidget] ?? l.sourceWidget}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-600">{l.sourcePage || '—'}</span>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-600">
                        {lastEvent
                          ? `${lastEvent.type}${
                              lastEvent.fieldName ? ` (${lastEvent.fieldName})` : ''
                            }`
                          : '—'}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = '#111827',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 text-left">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2">{children}</td>;
}
