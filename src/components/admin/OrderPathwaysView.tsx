/**
 * Admin reference doc — every customer purchase path on the site, plus
 * the post-checkout convergence verdict.
 *
 * Verbatim copy of the founder briefing Brian asked to share with his
 * business partner. Lives in /admin/brians-stuff?tab=pathways so it's
 * easy to pull up in a meeting. Pure static content — no DB, no API
 * calls; safe to render server-side.
 *
 * If a new entry point or terminal behavior is added, update this file
 * directly. There's no automated linkage between the engine code and
 * this doc — by design, since this is a strategic/business map, not a
 * runtime spec.
 */

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';
const CREAM = '#FFF7E1';
const SOFT_GRAY = '#F4F4F4';

export default function OrderPathwaysView() {
  return (
    <div className="max-w-4xl mx-auto" style={{ color: NAVY }}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-heading text-3xl md:text-4xl font-bold tracking-wide mb-2"
          style={{ color: NAVY }}
        >
          🛒 Order Pathways
        </h1>
        <p className="text-gray-700 text-sm md:text-base">
          Every way a customer can buy on Party On Delivery, plus
          confirmation that all paths converge identically after payment.
          Share this with the business partner for the strategy convo.
        </p>
      </div>

      {/* ─── SECTION 1 — Convergence verdict ─────────────────────── */}
      <Card
        accentColor={GOLD}
        background={CREAM}
        title="✅ Verdict: all paths unified after checkout"
      >
        <p className="text-sm md:text-base leading-relaxed mb-3">
          Both checkout surfaces terminate in the <strong>same</strong>{' '}
          <code className="text-xs bg-white px-1.5 py-0.5 rounded">Order</code>{' '}
          row schema, with the same status flags
          (<code className="text-xs bg-white px-1 rounded">CONFIRMED</code> /{' '}
          <code className="text-xs bg-white px-1 rounded">PAID</code> /{' '}
          <code className="text-xs bg-white px-1 rounded">UNFULFILLED</code>),
          the same delivery scheduling (date normalized to noon UTC,
          address copied verbatim, fee from the same calculator), and the
          same side effects (Resend confirmation email, GHL SMS webhook,
          inventory commitment via{' '}
          <code className="text-xs bg-white px-1 rounded">
            commitInventoryForOrderItem
          </code>
          ). Ops queries the <code className="text-xs bg-white px-1 rounded">Order</code>{' '}
          table directly with no origin filter, so dashboard-originated
          and invoice-originated orders both appear in the boat manifest,
          pick list, and delivery schedule sheet identically.
        </p>
        <p className="text-sm md:text-base leading-relaxed">
          <strong>Bottom line:</strong> safe to keep multiple checkout
          paths. The divergence is purely in how the customer <em>arrives</em>{' '}
          at payment, not in what happens <em>after</em>.
        </p>
      </Card>

      {/* ─── SECTION 2 — The 2 final buying surfaces ─────────────── */}
      <SectionHeading id="surfaces">
        🎯 The 2 final buying surfaces (where money is actually collected)
      </SectionHeading>
      <p className="text-sm text-gray-700 mb-4">
        Every entry point below funnels into one of these. Memorize these
        two and the rest is just plumbing.
      </p>

      <Card title="A. Universal Group Order Dashboard">
        <CodeChip>/dashboard/&lt;shareCode&gt;</CodeChip>
        <ul className="mt-3 space-y-2 text-sm">
          <Bullet label="What it is">
            the shareable, multi-tab, split-pay order shell. A &ldquo;live&rdquo;
            cart that can have multiple delivery locations, multiple
            participants, and multiple payment splits.
          </Bullet>
          <Bullet label="Backed by">
            <code className="text-xs bg-gray-100 px-1 rounded">GroupOrderV2</code>{' '}
            + <code className="text-xs bg-gray-100 px-1 rounded">SubOrder</code>{' '}
            + <code className="text-xs bg-gray-100 px-1 rounded">DraftCartItem</code>{' '}
            Postgres tables.
          </Bullet>
          <Bullet label="Payment routes">
            <code className="text-xs bg-gray-100 px-1 rounded">
              /api/v2/group-orders/&lt;code&gt;/tabs/&lt;tabId&gt;/checkout
            </code>{' '}
            (pay-my-share) and <code className="text-xs bg-gray-100 px-1 rounded">/checkout-all</code>{' '}
            (pay-for-everything).
          </Bullet>
          <Bullet label="Stripe behavior">
            redirects to hosted Stripe checkout.
          </Bullet>
        </ul>
      </Card>

      <Card title="B. Single-Recipient Invoice">
        <CodeChip>/invoice/&lt;token&gt;</CodeChip>
        <ul className="mt-3 space-y-2 text-sm">
          <Bullet label="What it is">
            a fixed, token-gated invoice page. One person, one cart, one
            delivery, one payment. Editable line items + discount +
            delivery details.
          </Bullet>
          <Bullet label="Backed by">
            <code className="text-xs bg-gray-100 px-1 rounded">DraftOrder</code>{' '}
            +{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">DraftOrderItem</code>{' '}
            Postgres tables.
          </Bullet>
          <Bullet label="Payment route">
            <code className="text-xs bg-gray-100 px-1 rounded">
              /api/v1/invoice/&lt;token&gt;/checkout
            </code>
            .
          </Bullet>
          <Bullet label="Stripe behavior">
            redirects (or embeds) Stripe checkout.
          </Bullet>
        </ul>
      </Card>

      {/* ─── SECTION 3 — The 14 entry points ─────────────────────── */}
      <SectionHeading id="entry-points">
        🚪 The 14 entry points, grouped by where they land
      </SectionHeading>

      {/* 3.1 — Paths that land on the Universal Dashboard */}
      <h3
        className="font-heading text-xl md:text-2xl font-bold tracking-wide mt-8 mb-3"
        style={{ color: NAVY }}
      >
        1. Paths that land on the Universal Dashboard{' '}
        <code className="text-base bg-gray-100 px-2 py-0.5 rounded">
          /dashboard/&lt;code&gt;
        </code>
      </h3>
      <p className="text-sm text-gray-700 mb-4">
        These all converge through{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">/api/v1/quote/start</code>{' '}
        (or its sibling endpoints). They create a{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">GroupOrderV2</code>,
        seed it with items, and redirect.
      </p>

      <EntryPoint
        index="1.1"
        title="PackageBuilderModal (the &ldquo;Build My Package&rdquo; CTA on landing pages)"
        rows={[
          ['Entry', 'the 4 paid landing pages — /austin-bachelor-party-delivery, /austin-bachelorette-party-delivery, /austin-corporate-event-delivery, /austin-wedding-weekend-delivery.'],
          ['Component', 'src/components/landing/PackageBuilderModal.tsx'],
          ['Flow', '5-step modal (vibe → basics → menu → contact → review) → POST /api/v1/quote/start → redirect.'],
          ['Item seeding', 'customer-curated items from the 5 steps.'],
        ]}
      />
      <EntryPoint
        index="1.2"
        title="PartyChat bubble (the floating 🥂 widget)"
        rows={[
          ['Entry', 'homepage + all 4 landing pages. Bottom-right corner.'],
          ['Component', 'src/components/chat/PartyChat.tsx'],
          ['Flow', 'party type → date → headcount → contact → AI-recommended cart → POST /api/v1/quote/start → redirect.'],
          ['Item seeding', 'drink-planner engine output for the chosen party type + headcount.'],
        ]}
      />
      <EntryPoint
        index="1.3"
        title="AI Test free-form planner (new — preview branch only)"
        rows={[
          ['Entry', '/austin-bachelor-party-delivery-ai-test (noindex, not in nav).'],
          ['Component', 'src/components/landing/AIPartyChatBar.tsx'],
          ['Flow', 'natural-language prompt → Claude extracts party type + headcount + duration + drink categories → /api/v1/ai-party-planner → creates GroupOrderV2 directly → redirect.'],
          ['Item seeding', 'same engine as PartyChat, but driven by free-form prompt.'],
        ]}
      />
      <EntryPoint
        index="1.4"
        title="Event Quiz (the routing funnel)"
        rows={[
          ['Entry', '/event-quiz (paid ad destination).'],
          ['Component', 'src/app/event-quiz/page.tsx'],
          ['Flow', '3-step quiz → routes to the matching landing page (e.g. wedding picks → /austin-wedding-weekend-delivery?welcome=1).'],
          ['Final buy', 'customer THEN uses PackageBuilderModal or QuickBuyModal on that destination page — quiz itself doesn\'t buy anything.'],
        ]}
      />
      <EntryPoint
        index="1.5"
        title="Direct last-minute entry"
        rows={[
          ['Entry', '/order/last-minute (often hit from email links or partner pages).'],
          ['Component', 'src/app/order/last-minute/page.tsx'],
          ['Flow', 'server creates a fresh GroupOrderV2 flagged isLastMinute=true → immediate redirect.'],
          ['Item seeding', 'empty cart, last-minute menu filter active.'],
        ]}
      />
      <EntryPoint
        index="1.6"
        title="Partner pages (affiliate-attributed)"
        rows={[
          ['Entry', '/partners/<slug> (e.g. /partners/premier-party-cruises, /partners/inn-cahoots).'],
          ['Flow', 'partner-branded landing page → CTA → /order/last-minute?a=<affiliateId> or PackageBuilderModal with attribution → /dashboard/<code> with affiliate stamped on the order.'],
          ['Item seeding', 'empty or partner-recommended starter cart.'],
        ]}
      />
      <EntryPoint
        index="1.7"
        title="Existing customer returning to a saved share link"
        rows={[
          ['Entry', 'anyone with a /dashboard/<code> URL (shared via group chat, email, or saved bookmark).'],
          ['No funnel', 'they go straight to the existing dashboard, can add items, then checkout.'],
        ]}
      />

      {/* 3.2 — Paths that land on the Invoice page */}
      <h3
        className="font-heading text-xl md:text-2xl font-bold tracking-wide mt-10 mb-3"
        style={{ color: NAVY }}
      >
        2. Paths that land on the Invoice page{' '}
        <code className="text-base bg-gray-100 px-2 py-0.5 rounded">
          /invoice/&lt;token&gt;
        </code>
      </h3>
      <p className="text-sm text-gray-700 mb-4">
        These create a{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">DraftOrder</code>{' '}
        (not a <code className="text-xs bg-gray-100 px-1 rounded">GroupOrderV2</code>)
        and send the customer to a single-recipient invoice instead of the
        multi-tab dashboard.
      </p>

      <EntryPoint
        index="2.1"
        flagged
        title="⚠️ QuickBuyModal (the &ldquo;BUY THIS PACKAGE NOW&rdquo; CTA on package cards) — YOUR FLAGGED PATH"
        rows={[
          ['Entry', 'the same 4 landing pages — under each package card.'],
          ['Component', 'src/components/landing/QuickBuyModal.tsx'],
          ['Flow', 'adjust headcount → edit qty → delivery details → contact → POST /api/v1/landing/quote (mode: pay-now) → returns {token, invoiceUrl} → embeds or redirects to /api/v1/invoice/<token>/checkout.'],
          ['Why it bypasses the dashboard', 'designed as a "checkout-this-exact-recipe-right-now" path — no item editing, no group sharing, no multi-tab.'],
          ['Trade-off', 'faster path to payment, but the customer loses the ability to share with friends, split-pay, or browse the full catalog.'],
        ]}
      />
      <EntryPoint
        index="2.2"
        title="Invoice link sent by an admin"
        rows={[
          ['Entry', '/invoice/<token> via an email Brian or ops sent.'],
          ['Source', 'admin creates a DraftOrder at /ops/orders/create → customer receives the invoice email → clicks the link → pays.'],
          ['Use case', 'custom quotes, corporate bulk orders, special events, anything that needs hand-massaged pricing.'],
        ]}
      />
      <EntryPoint
        index="2.3"
        title="Affiliate-created invoice"
        rows={[
          ['Entry', '/invoice/<token> from an affiliate\'s portal.'],
          ['Flow', 'affiliate fills a form in the affiliate dashboard → backend creates a DraftOrder → affiliate sends invoice link to their customer → customer pays.'],
          ['Use case', 'event planners, hotel concierges, party-bus operators booking on behalf of their guests.'],
        ]}
      />
      <EntryPoint
        index="2.4"
        title="Invoice as guest payment after share"
        rows={[
          ['Entry', 'the same /invoice/<token> URL but accessed by someone OTHER than the original creator.'],
          ['Flow', 'the recipient can add items or pay their portion of the existing invoice.'],
          ['Use case', 'rare — most multi-person splits route through the dashboard instead.'],
        ]}
      />

      {/* 3.3 — Paths that do NOT directly result in a purchase */}
      <h3
        className="font-heading text-xl md:text-2xl font-bold tracking-wide mt-10 mb-3"
        style={{ color: NAVY }}
      >
        3. Paths that do NOT directly result in a purchase
      </h3>

      <EntryPoint
        index="3.1"
        muted
        title="/products browse"
        rows={[
          ['Note', 'Pure discovery surface. Filter, search, product modal — but no add-to-cart at this level. Customer has to navigate to a landing page or open the chat bubble to actually buy.'],
        ]}
      />
      <EntryPoint
        index="3.2"
        muted
        title="Blog posts (/blog/<slug>)"
        rows={[
          ['Note', '134 MDX posts. SEO + content marketing only — no "buy now" button.'],
        ]}
      />
      <EntryPoint
        index="3.3"
        muted
        title="/cart/shared/<id> (legacy)"
        rows={[
          ['Note', 'Old shared-cart system from before GroupOrderV2. Not in active use; superseded by the dashboard.'],
        ]}
      />

      {/* ─── SECTION 4 — The 2 most important divergences ─────────── */}
      <SectionHeading id="divergences">
        🔀 The 2 most important divergences
      </SectionHeading>

      <Card title="🟢 Path-to-dashboard pattern (7 of 14 entry points)">
        <ul className="space-y-2 text-sm">
          <Bullet label="Creates">
            <code className="text-xs bg-gray-100 px-1 rounded">GroupOrderV2</code>
          </Bullet>
          <Bullet label="Behavior">
            sharable URL, multi-tab, split-pay, customer can keep
            shopping, recommended items are starting points (not locked).
          </Bullet>
          <Bullet label="Best for">
            real parties where multiple people are involved or where the
            cart needs to evolve.
          </Bullet>
        </ul>
      </Card>

      <Card title="🟡 Path-to-invoice pattern (4 of 14 entry points, incl. QuickBuyModal)">
        <ul className="space-y-2 text-sm">
          <Bullet label="Creates">
            <code className="text-xs bg-gray-100 px-1 rounded">DraftOrder</code>
          </Bullet>
          <Bullet label="Behavior">
            fixed cart, single recipient, pay-or-walk.
          </Bullet>
          <Bullet label="Best for">
            &ldquo;I want this exact thing right now,&rdquo; admin-created
            quotes, affiliate-on-behalf-of bookings.
          </Bullet>
        </ul>
      </Card>

      {/* ─── SECTION 5 — Convergence verification ─────────────────── */}
      <SectionHeading id="convergence">
        🔬 Post-checkout convergence — verified across 7 dimensions
      </SectionHeading>
      <p className="text-sm text-gray-700 mb-4">
        Both buying surfaces produce <strong>identical downstream behavior</strong>.
        The <code className="text-xs bg-gray-100 px-1 rounded">Order</code> row
        has the same shape, statuses, and delivery metadata regardless of
        origin. Side effects (email, GHL SMS, inventory commit) trigger
        identically. Both appear in ops queries unless explicitly filtered
        by <code className="text-xs bg-gray-100 px-1 rounded">groupOrderV2Id</code>.
      </p>

      <div className="overflow-x-auto rounded-lg border-2" style={{ borderColor: NAVY }}>
        <table className="w-full text-sm">
          <thead style={{ background: NAVY, color: '#FFFFFF' }}>
            <tr>
              <th className="px-4 py-3 text-left font-bold tracking-wide">
                Dimension
              </th>
              <th className="px-4 py-3 text-left font-bold tracking-wide">
                GroupOrderV2 path
              </th>
              <th className="px-4 py-3 text-left font-bold tracking-wide">
                DraftOrder path
              </th>
              <th className="px-4 py-3 text-left font-bold tracking-wide">
                Verdict
              </th>
            </tr>
          </thead>
          <tbody>
            <ConvergenceRow
              dimension="Stripe webhook → Order creation"
              groupPath="handleGroupV2PaymentCompleted() — group-v2-payments.ts:377; creates Order @ 506-546"
              draftPath="handleDraftOrderPayment() — webhooks.ts:219 → createOrderFromDraftOrder() — order-service.ts:912; creates Order @ 970-994"
              verdict="Same Order schema, same statuses (CONFIRMED / PAID / UNFULFILLED)."
            />
            <ConvergenceRow
              dimension="Delivery scheduling (date / time / address / fee)"
              groupPath="sourced from SubOrder → copied to Order.deliveryDate/Time/Address @ 521-523"
              draftPath="sourced from DraftOrder → copied identically @ 984-986"
              verdict="Both normalize date to noon UTC. Both use calculateDeliveryFee() from delivery/rates.ts."
            />
            <ConvergenceRow
              dimension="Customer order confirmation email"
              groupPath="sendOrderConfirmationEmail() @ 667"
              draftPath="sendOrderConfirmationEmail() @ webhooks.ts:350"
              verdict="Same Resend template, same params."
            />
            <ConvergenceRow
              dimension="Internal order notification (GHL)"
              groupPath="notifyNewOrder(buildGhlPayload(order, 'group_v2')) @ 632"
              draftPath="notifyNewOrder(buildGhlPayload(order, 'draft')) @ webhooks.ts:258"
              verdict="Same webhooks/ghl.ts handler, identical payload shape."
            />
            <ConvergenceRow
              dimension="GoHighLevel SMS webhook"
              groupPath="fires from notifyNewOrder()"
              draftPath="fires from notifyNewOrder()"
              verdict="Single fire-and-forget POST. Same idempotency guarantees."
            />
            <ConvergenceRow
              dimension="Ops dashboard visibility"
              groupPath="Order rows with groupOrderV2Id set"
              draftPath="Order rows with draftOrderId set"
              verdict="Ops query (/api/v1/admin/orders) hits Order table directly with no origin filter. Boat manifest + pick list + delivery sheet also query Order directly."
            />
            <ConvergenceRow
              dimension="Inventory deduction"
              groupPath="commitInventoryForOrderItem() @ 565-578"
              draftPath="commitInventoryForOrderItem() @ order-service.ts:1060-1067"
              verdict="Identical function. Both increment committedQuantity at order creation; both defer inventoryQuantity decrement to fulfillment."
            />
          </tbody>
        </table>
      </div>

      {/* ─── SECTION 6 — Strategic flags ───────────────────────────── */}
      <SectionHeading id="flags">
        🛑 Things worth flagging
      </SectionHeading>

      <ol className="space-y-4 text-sm md:text-base">
        <FlagItem n={1} heading="QuickBuyModal is the only customer-self-serve path that doesn't go to the dashboard.">
          Every other customer-facing entry point lands them on{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">/dashboard/&lt;code&gt;</code>.
          This inconsistency might be intentional (&ldquo;they picked a
          package, send them straight to pay&rdquo;) — but if you want
          every flow to look and feel the same, QuickBuyModal needs to
          route through{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">/api/v1/quote/start</code>{' '}
          instead of <code className="text-xs bg-gray-100 px-1 rounded">/api/v1/landing/quote</code>.
          That&apos;s a one-day change.
        </FlagItem>
        <FlagItem n={2} heading="The drink-planner engine is the single source of truth for ALL recommendation math.">
          <code className="text-xs bg-gray-100 px-1 rounded">
            src/lib/drinkPlannerLogic.ts
          </code>{' '}
          — every recommendation surface (chat bubble, AI test,
          /api/v2/group-orders/.../recommendations, the standalone quiz
          page) calls{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">calculateQuizResults</code>.
          No drift risk.
        </FlagItem>
        <FlagItem n={3} heading="Affiliate attribution is stamped on the order via the ?ref= query param + ref_code cookie (30-day TTL).">
          Handled in <code className="text-xs bg-gray-100 px-1 rounded">src/middleware.ts</code>.
          Works across BOTH the dashboard and invoice paths — so revenue
          attribution is consistent regardless of which buying surface
          the customer lands on.
        </FlagItem>
        <FlagItem n={4} heading="Last-minute mode flows through both surfaces.">
          Dashboard has the <code className="text-xs bg-gray-100 px-1 rounded">isLastMinute=true</code>{' '}
          flag and the new view-full-menu toggle. Invoice path
          doesn&apos;t yet have an equivalent banner — if you want
          consistency there too, it&apos;s another small follow-up.
        </FlagItem>
      </ol>

      <div
        className="mt-12 p-4 rounded-lg text-xs text-gray-500 text-center"
        style={{ background: SOFT_GRAY }}
      >
        This doc is a verbatim copy of the founder briefing. Static —
        edit{' '}
        <code className="text-xs bg-white px-1 rounded">
          src/components/admin/OrderPathwaysView.tsx
        </code>{' '}
        to update.
      </div>
    </div>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-heading text-2xl md:text-3xl font-bold tracking-wide mt-12 mb-4 pb-2 border-b-2"
      style={{ color: NAVY, borderColor: GOLD }}
    >
      {children}
    </h2>
  );
}

function Card({
  title,
  children,
  accentColor,
  background,
}: {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
  background?: string;
}) {
  return (
    <div
      className="rounded-lg p-5 md:p-6 mb-4 shadow-sm"
      style={{
        background: background ?? '#FFFFFF',
        border: `2px solid ${accentColor ?? '#E5E7EB'}`,
      }}
    >
      <h3
        className="font-heading text-lg md:text-xl font-bold tracking-wide mb-3"
        style={{ color: NAVY }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="inline-block text-sm font-mono px-3 py-1 rounded"
      style={{ background: NAVY, color: GOLD }}
    >
      {children}
    </code>
  );
}

function Bullet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col sm:flex-row gap-1 sm:gap-2">
      <span className="font-bold flex-shrink-0" style={{ color: NAVY }}>
        {label}:
      </span>
      <span className="text-gray-800">{children}</span>
    </li>
  );
}

function EntryPoint({
  index,
  title,
  rows,
  flagged,
  muted,
}: {
  index: string;
  title: string;
  rows: [string, string][];
  flagged?: boolean;
  muted?: boolean;
}) {
  const border = flagged ? GOLD : muted ? '#D1D5DB' : '#E5E7EB';
  const bg = flagged ? CREAM : muted ? SOFT_GRAY : '#FFFFFF';
  return (
    <div
      className="rounded-lg p-4 md:p-5 mb-3"
      style={{ background: bg, border: `${flagged ? '2px' : '1.5px'} solid ${border}` }}
    >
      <div className="flex items-baseline gap-2 mb-2 flex-wrap">
        <span
          className="text-xs font-mono font-bold px-2 py-0.5 rounded"
          style={{ background: NAVY, color: GOLD }}
        >
          {index}
        </span>
        <span
          className="font-heading text-base md:text-lg font-bold tracking-wide"
          style={{ color: NAVY }}
        >
          {title}
        </span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <li key={label} className="flex flex-col sm:flex-row gap-1 sm:gap-2">
            <span className="font-bold flex-shrink-0" style={{ color: NAVY }}>
              {label}:
            </span>
            <span className="text-gray-800">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConvergenceRow({
  dimension,
  groupPath,
  draftPath,
  verdict,
}: {
  dimension: string;
  groupPath: string;
  draftPath: string;
  verdict: string;
}) {
  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-3 align-top font-bold" style={{ color: NAVY }}>
        {dimension}
      </td>
      <td className="px-4 py-3 align-top text-xs text-gray-800 font-mono">
        {groupPath}
      </td>
      <td className="px-4 py-3 align-top text-xs text-gray-800 font-mono">
        {draftPath}
      </td>
      <td className="px-4 py-3 align-top text-sm">
        <span style={{ color: '#0F8141' }}>✅</span> {verdict}
      </td>
    </tr>
  );
}

function FlagItem({
  n,
  heading,
  children,
}: {
  n: number;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-lg p-4 md:p-5" style={{ background: SOFT_GRAY }}>
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold"
          style={{ background: NAVY, color: GOLD }}
        >
          {n}
        </span>
        <span className="font-bold" style={{ color: NAVY }}>
          {heading}
        </span>
      </div>
      <div className="ml-10 text-gray-800 leading-relaxed">{children}</div>
    </li>
  );
}
