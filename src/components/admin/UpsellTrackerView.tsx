/**
 * Upsell A/B Tracker — shared view component.
 *
 * Async server component that pulls draft-order data, buckets by variant,
 * and renders the scoreboard + per-variant top-item cards. Rendered inside
 * /admin/brians-stuff (primary location) and /admin/upsell-tracker (legacy
 * direct URL kept for backwards-compat / deep-linking).
 *
 * DATA SOURCE (verified 2026-07-10):
 *   - Real Postgres DraftOrder rows filtered by `upsellVariantId IS NOT NULL`.
 *   - No mock data, no aggregate cron, no caching layer. Fresh Prisma query
 *     on every page load. Rolling window of the last 1000 draft orders.
 *
 * COVERAGE GAP (see the "Where upsells fire today" card below):
 *   - QuickBuyModal (landing pages "BUY THIS NOW") persists variantId +
 *     per-item viaUpsell flags. Fully tracked.
 *   - PackageBuilderModal (landing pages "Build My Package") SHOWS the
 *     overlay but drops variantId at submit time (routes to
 *     /api/v1/quote/start which doesn't take that field). So its
 *     impressions are invisible here — this is a fixable bug, not a
 *     display issue.
 *   - Dashboard checkout, /invoice, Disco Cruise, Buckarodeo: no upsell
 *     overlay is presented today.
 */

import Link from 'next/link';
import { prisma } from '@/lib/database/client';
import { UPSELL_VARIANTS } from '@/lib/landing/getUpsellProducts';

type Item = {
  title?: string;
  quantity?: number;
  price?: number;
  viaUpsell?: boolean;
};

type OrderRow = {
  id: string;
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  deliveryDate: Date;
  deliveryTime: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryZip: string;
  total: number;
  status: string;
  paid: boolean;
  upsellItems: Array<{ title: string; qty: number; price: number }>;
  upsellRevenue: number;
  variantId: string;
  variantLabel: string;
  token: string;
};

type Row = {
  variantId: string;
  label: string;
  orders: number;
  ordersWithUpsell: number;
  totalRevenue: number;
  upsellRevenue: number;
  attachRate: number;
  upsellShare: number;
  topUpsells: Array<{ title: string; quantity: number; revenue: number }>;
  transactions: OrderRow[];
};

async function loadStats(): Promise<{ rows: Row[]; recent: OrderRow[] }> {
  const orders = await prisma.draftOrder.findMany({
    where: { upsellVariantId: { not: null } },
    select: {
      id: true,
      token: true,
      status: true,
      paidAt: true,
      upsellVariantId: true,
      total: true,
      items: true,
      createdAt: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      deliveryDate: true,
      deliveryTime: true,
      deliveryAddress: true,
      deliveryCity: true,
      deliveryZip: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const variantLabelById = new Map(UPSELL_VARIANTS.map((v) => [v.id, v.label]));

  const emptyBucket = (): {
    orders: number;
    ordersWithUpsell: number;
    totalRevenue: number;
    upsellRevenue: number;
    itemTotals: Map<string, { qty: number; rev: number }>;
    transactions: OrderRow[];
  } => ({
    orders: 0,
    ordersWithUpsell: 0,
    totalRevenue: 0,
    upsellRevenue: 0,
    itemTotals: new Map(),
    transactions: [],
  });

  const buckets: Record<string, ReturnType<typeof emptyBucket>> = {};
  const allTransactions: OrderRow[] = [];

  for (const o of orders) {
    const vid = o.upsellVariantId!;
    if (!buckets[vid]) buckets[vid] = emptyBucket();
    const b = buckets[vid];
    b.orders++;
    b.totalRevenue += Number(o.total);

    const items = Array.isArray(o.items) ? (o.items as Item[]) : [];
    let orderUpsellRevenue = 0;
    const upsellItems: OrderRow['upsellItems'] = [];
    let orderHasUpsell = false;

    for (const it of items) {
      if (!it.viaUpsell) continue;
      orderHasUpsell = true;
      const rev = (it.price ?? 0) * (it.quantity ?? 1);
      orderUpsellRevenue += rev;
      b.upsellRevenue += rev;
      const cur = b.itemTotals.get(it.title ?? 'Unknown') ?? { qty: 0, rev: 0 };
      cur.qty += it.quantity ?? 1;
      cur.rev += rev;
      b.itemTotals.set(it.title ?? 'Unknown', cur);
      upsellItems.push({
        title: it.title ?? 'Unknown',
        qty: it.quantity ?? 1,
        price: it.price ?? 0,
      });
    }
    if (orderHasUpsell) b.ordersWithUpsell++;

    // Only surface transactions in the "Recent" list if the customer
    // actually took the upsell — otherwise they're just impressions and
    // not what founder wants to see.
    if (orderHasUpsell) {
      const tx: OrderRow = {
        id: o.id,
        token: o.token,
        createdAt: o.createdAt,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        deliveryDate: o.deliveryDate,
        deliveryTime: o.deliveryTime,
        deliveryAddress: o.deliveryAddress,
        deliveryCity: o.deliveryCity,
        deliveryZip: o.deliveryZip,
        total: Number(o.total),
        status: o.status,
        paid: !!o.paidAt,
        upsellItems,
        upsellRevenue: orderUpsellRevenue,
        variantId: vid,
        variantLabel: variantLabelById.get(vid) ?? '(unknown variant)',
      };
      b.transactions.push(tx);
      allTransactions.push(tx);
    }
  }

  const rows: Row[] = UPSELL_VARIANTS.map((v) => {
    const b = buckets[v.id] ?? emptyBucket();
    const topUpsells = Array.from(b.itemTotals.entries())
      .map(([title, { qty, rev }]) => ({ title, quantity: qty, revenue: rev }))
      .sort((a, c) => c.revenue - a.revenue)
      .slice(0, 5);
    return {
      variantId: v.id,
      label: v.label,
      orders: b.orders,
      ordersWithUpsell: b.ordersWithUpsell,
      totalRevenue: b.totalRevenue,
      upsellRevenue: b.upsellRevenue,
      attachRate: b.orders > 0 ? b.ordersWithUpsell / b.orders : 0,
      upsellShare: b.totalRevenue > 0 ? b.upsellRevenue / b.totalRevenue : 0,
      topUpsells,
      transactions: b.transactions,
    };
  });

  return { rows, recent: allTransactions.slice(0, 50) };
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const dollars = (n: number) =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const dollars2 = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const shortDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDateTime = (d: Date) =>
  d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  });
const shortOrderId = (id: string) => id.slice(0, 8).toUpperCase();

export default async function UpsellTrackerView() {
  const { rows: stats, recent } = await loadStats();
  const total = stats.reduce(
    (acc, r) => ({
      orders: acc.orders + r.orders,
      withUpsell: acc.withUpsell + r.ordersWithUpsell,
      revenue: acc.revenue + r.totalRevenue,
      upsellRevenue: acc.upsellRevenue + r.upsellRevenue,
    }),
    { orders: 0, withUpsell: 0, revenue: 0, upsellRevenue: 0 },
  );
  const leader = [...stats].sort((a, b) => b.upsellRevenue - a.upsellRevenue)[0];

  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <p className="text-xs font-bold tracking-[0.22em] text-purple-700 mb-1">
          A/B TRACKER · REAL POSTGRES DATA · LAST 1000 DRAFT ORDERS
        </p>
        <h1 className="text-3xl font-bold text-gray-900 leading-tight">
          Upsell Performance
        </h1>
        <p className="text-gray-600 mt-2 max-w-2xl">
          Three different arrangements of the pre-checkout upsell overlay are
          rotated at random for every landing-page visit. This page rolls up
          which variant converts best — measured by upsell-revenue share and
          attach rate (% of orders that took at least one upsell).
        </p>
      </header>

      {/* ─── Coverage / limitations disclosure ───────────────────────── */}
      <CoverageCard />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Orders with variant shown" value={fmt(total.orders)} />
        <Stat label="Orders with ≥1 upsell" value={fmt(total.withUpsell)} />
        <Stat label="Upsell revenue" value={dollars(total.upsellRevenue)} />
        <Stat
          label="Upsell share of revenue"
          value={total.revenue > 0 ? pct(total.upsellRevenue / total.revenue) : '—'}
        />
      </section>

      {total.orders === 0 && (
        <div className="rounded-xl p-6 bg-amber-50 border border-amber-200 mb-8 text-sm text-amber-900">
          No upsell-tagged orders yet. Once customers convert through the
          landing-page popup, attribution rolls up here automatically.
        </div>
      )}

      {leader && leader.orders > 0 && (
        <div className="rounded-xl p-5 bg-purple-50 border border-purple-200 mb-8 flex items-center gap-4">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg"
            style={{ background: '#7C3AED' }}
          >
            ★
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-purple-700 uppercase">
              Current leader
            </div>
            <div className="text-lg font-bold text-gray-900">
              {leader.variantId} — {leader.label}
            </div>
            <div className="text-sm text-gray-700">
              {dollars(leader.upsellRevenue)} in upsell revenue across{' '}
              {fmt(leader.orders)} {leader.orders === 1 ? 'order' : 'orders'} ·{' '}
              {pct(leader.attachRate)} attach rate
            </div>
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Variant</th>
              <th className="text-right p-3">Orders shown</th>
              <th className="text-right p-3">Took upsell</th>
              <th className="text-right p-3">Attach rate</th>
              <th className="text-right p-3">Upsell $</th>
              <th className="text-right p-3">Upsell share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.map((r) => (
              <tr key={r.variantId} className="hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-semibold text-gray-900">{r.variantId}</div>
                  <div className="text-xs text-gray-500">{r.label}</div>
                </td>
                <td className="p-3 text-right font-medium">{fmt(r.orders)}</td>
                <td className="p-3 text-right">{fmt(r.ordersWithUpsell)}</td>
                <td className="p-3 text-right font-medium">
                  {r.orders > 0 ? pct(r.attachRate) : '—'}
                </td>
                <td className="p-3 text-right font-bold text-purple-700">
                  {dollars(r.upsellRevenue)}
                </td>
                <td className="p-3 text-right">
                  {r.totalRevenue > 0 ? pct(r.upsellShare) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ─── Per-variant top upsell items ─────────────────────────────── */}
      <section className="mt-2 grid md:grid-cols-3 gap-4 mb-10">
        {stats.map((r) => (
          <div
            key={`top-${r.variantId}`}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="text-xs font-bold tracking-widest text-purple-700 mb-2">
              {r.variantId} · TOP UPSELLS
            </div>
            {r.topUpsells.length === 0 ? (
              <p className="text-sm text-gray-400">No upsell sales yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {r.topUpsells.map((it) => (
                  <li
                    key={it.title}
                    className="flex justify-between gap-3 text-gray-700"
                  >
                    <span className="flex-1 truncate">
                      <strong>{it.quantity}×</strong> {it.title}
                    </span>
                    <span className="font-bold whitespace-nowrap text-gray-900">
                      {dollars(it.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* ─── Recent upsell transactions ─────────────────────────────── */}
      <section className="mt-2">
        <header className="mb-3">
          <h2 className="text-xl font-bold text-gray-900">
            Recent Upsell Transactions
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            The last {recent.length} orders where the customer actually took
            an upsell. Click a row to expand contact info, delivery details,
            and the items they bought via the overlay.
          </p>
        </header>

        {recent.length === 0 ? (
          <div className="rounded-xl p-6 bg-gray-50 border border-gray-200 text-sm text-gray-600">
            No upsell conversions yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-10 text-xs text-gray-500">
        Variants are defined in{' '}
        <code className="px-1 py-0.5 bg-gray-100 rounded">
          src/lib/landing/getUpsellProducts.ts
        </code>
        . To add a new arrangement, append to{' '}
        <code className="px-1 py-0.5 bg-gray-100 rounded">UPSELL_VARIANTS</code>{' '}
        and redeploy — the rotation picks one at random per request.
        <br />
        Related:{' '}
        <Link href="/ops/orders?view=invoices" className="text-purple-700 underline">
          Invoices list
        </Link>
      </footer>
    </div>
  );
}

// ─── Primitives ─────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

/**
 * Static disclosure card at the top of the tracker. Explains exactly
 * which checkout paths do and don't fire an upsell today so the numbers
 * aren't misread as site-wide.
 */
function CoverageCard() {
  const rows: Array<{
    path: string;
    status: 'tracked' | 'shown-not-tracked' | 'not-shown';
    note: string;
  }> = [
    {
      path: 'Landing-page QuickBuyModal ("BUY THIS NOW" on package cards)',
      status: 'tracked',
      note: 'Full variant + per-item viaUpsell attribution. Numbers below are 100% accurate here.',
    },
    {
      path: 'Landing-page PackageBuilderModal ("Build My Package")',
      status: 'shown-not-tracked',
      note: "Overlay shows to the customer, but /api/v1/quote/start drops the variantId. Impressions are invisible in this tracker. Fixable.",
    },
    {
      path: 'Universal Dashboard checkout (/dashboard/<code> → Checkout)',
      status: 'not-shown',
      note: 'No upsell overlay is presented in this flow today.',
    },
    {
      path: 'Invoice checkout (/invoice/<token>)',
      status: 'not-shown',
      note: 'Admin- and affiliate-created invoices skip the upsell overlay entirely.',
    },
    {
      path: 'PartyChat 🥂 bubble & AI planner',
      status: 'not-shown',
      note: 'Both funnel to /dashboard/<code> — same as above.',
    },
    {
      path: 'Event invites (Disco Cruise, Buckarodeo)',
      status: 'not-shown',
      note: 'Standalone event flows; no upsell overlay wired in.',
    },
  ];

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 mb-8">
      <div className="text-xs font-bold tracking-widest text-purple-700 mb-2">
        WHERE UPSELLS FIRE TODAY
      </div>
      <p className="text-sm text-gray-700 mb-3">
        This dashboard measures ONE surface — the landing-page pre-checkout
        overlay. Read this list so the attach rate isn&apos;t misread as
        site-wide.
      </p>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.path} className="flex gap-3 items-start">
            <StatusPill status={r.status} />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{r.path}</div>
              <div className="text-xs text-gray-600">{r.note}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: 'tracked' | 'shown-not-tracked' | 'not-shown';
}) {
  const map = {
    tracked: {
      label: '✓ TRACKED',
      cls: 'bg-green-100 text-green-800 border-green-300',
    },
    'shown-not-tracked': {
      label: '⚠ SHOWN · NOT TRACKED',
      cls: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    'not-shown': {
      label: '— NO UPSELL',
      cls: 'bg-gray-100 text-gray-700 border-gray-300',
    },
  };
  const m = map[status];
  return (
    <span
      className={`flex-shrink-0 mt-0.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider whitespace-nowrap ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

/**
 * Collapsed-by-default customer row. Uses <details> for the disclosure
 * pattern so this stays a pure server component — no client bundle
 * needed for the accordion.
 */
function TransactionRow({ tx }: { tx: OrderRow }) {
  return (
    <details className="group">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-purple-50/40 select-none list-none">
        <span className="text-purple-500 group-open:rotate-90 transition-transform inline-block w-3 flex-shrink-0">
          ▶
        </span>
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
          <div className="col-span-4">
            <div className="font-semibold text-gray-900 truncate">
              {tx.customerName || '(no name)'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {tx.customerEmail}
            </div>
          </div>
          <div className="col-span-2 text-xs text-gray-600">
            <div className="font-semibold text-gray-800">
              #{shortOrderId(tx.id)}
            </div>
            <div>{tx.variantId}</div>
          </div>
          <div className="col-span-3 text-xs text-gray-600">
            <div>Deliver {shortDate(tx.deliveryDate)}</div>
            <div className="truncate">
              {tx.deliveryCity}, {tx.deliveryZip}
            </div>
          </div>
          <div className="col-span-2 text-right">
            <div className="font-bold text-purple-700">
              +{dollars2(tx.upsellRevenue)}
            </div>
            <div className="text-[10px] text-gray-500">upsell</div>
          </div>
          <div className="col-span-1 text-right">
            <StatusChip status={tx.status} paid={tx.paid} />
          </div>
        </div>
      </summary>

      <div className="px-4 pb-4 pt-1 bg-gray-50/50">
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <Field label="Contact">
            <div>{tx.customerName || '(no name)'}</div>
            <div className="text-xs">
              <a
                href={`mailto:${tx.customerEmail}`}
                className="text-purple-700 underline"
              >
                {tx.customerEmail}
              </a>
            </div>
            {tx.customerPhone && (
              <div className="text-xs">
                <a
                  href={`tel:${tx.customerPhone.replace(/\D/g, '')}`}
                  className="text-purple-700 underline"
                >
                  {tx.customerPhone}
                </a>
              </div>
            )}
          </Field>
          <Field label="Delivery">
            <div>
              {tx.deliveryDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}{' '}
              · {tx.deliveryTime}
            </div>
            <div className="text-xs">{tx.deliveryAddress}</div>
            <div className="text-xs">
              {tx.deliveryCity}, TX {tx.deliveryZip}
            </div>
          </Field>
          <Field label="Order">
            <div>
              #{shortOrderId(tx.id)} ·{' '}
              <StatusChip status={tx.status} paid={tx.paid} inline />
            </div>
            <div className="text-xs">Total: {dollars2(tx.total)}</div>
            <div className="text-xs">Placed: {longDateTime(tx.createdAt)}</div>
            <div className="text-xs mt-1 flex gap-2">
              <Link
                href={`/invoice/${tx.token}`}
                className="text-purple-700 underline"
              >
                Invoice
              </Link>
              <Link
                href={`/ops/orders?draft=${tx.id}`}
                className="text-purple-700 underline"
              >
                Ops view
              </Link>
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <div className="text-[10px] font-bold tracking-widest text-purple-700 mb-1">
            UPSELL ITEMS · VARIANT {tx.variantId} · {tx.variantLabel}
          </div>
          <ul className="text-sm space-y-1">
            {tx.upsellItems.map((it, i) => (
              <li
                key={`${tx.id}-up-${i}`}
                className="flex justify-between gap-3"
              >
                <span className="text-gray-800">
                  <strong>{it.qty}×</strong> {it.title}
                </span>
                <span className="font-mono text-gray-900">
                  {dollars2(it.price * it.qty)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest text-gray-500 mb-1">
        {label.toUpperCase()}
      </div>
      <div className="text-sm text-gray-800 space-y-0.5">{children}</div>
    </div>
  );
}

function StatusChip({
  status,
  paid,
  inline,
}: {
  status: string;
  paid: boolean;
  inline?: boolean;
}) {
  const cls = paid
    ? 'bg-green-100 text-green-800 border-green-300'
    : status === 'PENDING'
      ? 'bg-gray-100 text-gray-700 border-gray-300'
      : status === 'SENT' || status === 'VIEWED'
        ? 'bg-blue-100 text-blue-800 border-blue-300'
        : 'bg-amber-100 text-amber-800 border-amber-300';
  const label = paid ? 'PAID' : status;
  return (
    <span
      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider ${cls} ${inline ? '' : 'whitespace-nowrap'}`}
    >
      {label}
    </span>
  );
}
