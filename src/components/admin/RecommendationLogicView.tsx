/**
 * Admin reference doc — every rule the drink-recommendation engine
 * applies, rendered from ENGINE_SPEC so the doc cannot drift from code.
 *
 * Single source of truth lives in src/lib/drinkPlannerLogic.ts. Every
 * recommendation surface on the site (PartyChat bubble, AI test page,
 * /api/v2/group-orders/<code>/recommendations, the standalone quiz UI)
 * routes through calculateQuizResults() in that file.
 *
 * If a rule needs to change, edit ENGINE_SPEC in drinkPlannerLogic.ts
 * — this panel updates on next page load.
 */

import { ENGINE_SPEC } from '@/lib/drinkPlannerLogic';

const NAVY = '#0A1F33';
const GOLD = '#F2D34F';
const CREAM = '#FFF7E1';
const SOFT_GRAY = '#F4F4F4';

const CATEGORY_LABELS: Record<string, string> = {
  beer: 'Beer',
  wine: 'Wine',
  spirits: 'Spirits',
  seltzers: 'Seltzers',
  'cocktail-kits': 'Cocktail Kits',
};

export default function RecommendationLogicView() {
  return (
    <div className="max-w-4xl mx-auto" style={{ color: NAVY }}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-heading text-3xl md:text-4xl font-bold tracking-wide mb-2"
          style={{ color: NAVY }}
        >
          🧮 Recommendation Logic
        </h1>
        <p className="text-gray-700 text-sm md:text-base">
          The exact rules the drink-planner engine applies when it
          recommends a cart for a party. This panel reads{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">ENGINE_SPEC</code>{' '}
          from{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">
            src/lib/drinkPlannerLogic.ts
          </code>{' '}
          — if the page is wrong, the engine is wrong (and vice-versa). No
          hand-maintained doc.
        </p>
      </div>

      {/* ─── Source of truth banner ─────────────────────────────── */}
      <Card
        title="✅ One source of truth"
        accentColor={GOLD}
        background={CREAM}
      >
        <p className="text-sm leading-relaxed">
          All four recommendation surfaces route through{' '}
          <code className="text-xs bg-white px-1 py-0.5 rounded">
            calculateQuizResults()
          </code>{' '}
          in{' '}
          <code className="text-xs bg-white px-1 py-0.5 rounded">
            src/lib/drinkPlannerLogic.ts
          </code>
          :
        </p>
        <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-gray-800">
          <li>PartyChat bubble (the floating 🥂 widget)</li>
          <li>AI test page free-form chat</li>
          <li>
            <code className="text-xs bg-white px-1 rounded">
              /api/v2/group-orders/&lt;code&gt;/recommendations
            </code>{' '}
            (the dashboard&apos;s &quot;Get recommendations&quot; button)
          </li>
          <li>Standalone quiz UI at /drink-planner</li>
        </ul>
      </Card>

      {/* ─── Total-drink formulas ───────────────────────────────── */}
      <SectionHeading>📐 Total-drink formulas</SectionHeading>
      <p className="text-sm text-gray-700 mb-3">
        Two tracks. Boat/Bach gets a flat 2 drinks/person/hour; everything
        else gets a heavier first-hour count.
      </p>

      <Card title="Boat / Bach track">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
          Applies to event types
        </p>
        <p className="text-sm mb-3">
          {ENGINE_SPEC.boatBachTypes.join(', ')}
        </p>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
          Formula
        </p>
        <CodeBlock>{ENGINE_SPEC.formulas.boatBach}</CodeBlock>
        <p className="text-xs text-gray-500 mt-2">
          BOAT_BACH_RATE = {ENGINE_SPEC.boatBachRate} drinks per person per
          hour.
        </p>
      </Card>

      <Card title="Everything-else track">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
          Applies to
        </p>
        <p className="text-sm mb-3">
          wedding, corporate, house-party, other
        </p>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
          Formula
        </p>
        <CodeBlock>{ENGINE_SPEC.formulas.everythingElse}</CodeBlock>
      </Card>

      <Card title="Ice — always added">
        <CodeBlock>{ENGINE_SPEC.formulas.ice}</CodeBlock>
      </Card>

      {/* ─── Duration → hours ───────────────────────────────────── */}
      <SectionHeading>⏱ Duration → hours</SectionHeading>
      <p className="text-sm text-gray-700 mb-3">
        How the customer&apos;s duration choice maps to hours in the
        formulas above.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
        <table className="w-full text-sm">
          <thead style={{ background: NAVY, color: '#FFFFFF' }}>
            <tr>
              <th className="px-4 py-2 text-left font-bold">Duration choice</th>
              <th className="px-4 py-2 text-left font-bold">Hours</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ENGINE_SPEC.durationHours).map(([k, v]) => (
              <tr key={k} className="border-t border-gray-200">
                <td className="px-4 py-2 font-mono text-sm">{k}</td>
                <td className="px-4 py-2 font-mono text-sm">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Note: <code className="bg-gray-100 px-1 rounded">multi-day</code>{' '}
        collapses an entire weekend into 16 active drinking hours, not 24×
        the day count.
      </p>

      {/* ─── Category splits ────────────────────────────────────── */}
      <SectionHeading>🥃 Category splits</SectionHeading>
      <p className="text-sm text-gray-700 mb-3">
        Once total drinks are computed, the engine divides them across the
        customer&apos;s selected categories using the base weights below.
        When categories are deselected, weights are redistributed
        proportionally so shares still sum to 1.0.
      </p>

      <Card title="Boat / Bach — equal split (1/3 each across selected)">
        <SplitTable split={ENGINE_SPEC.splits.boatBach} />
        <p className="text-xs text-gray-500 mt-2">
          All five categories get equal weight; in practice the customer
          rarely picks more than 3, and the redistribution math lands at
          1/3 each.
        </p>
      </Card>

      <Card title="Everything else — base split (no cocktail kits)">
        <SplitTable split={ENGINE_SPEC.splits.everythingElseNoKits} />
      </Card>

      <Card title="Everything else — with cocktail kits">
        <SplitTable split={ENGINE_SPEC.splits.everythingElseWithKits} />
        <p className="text-xs text-gray-500 mt-2">
          When the customer adds cocktail kits, spirits share drops from
          50% → 15% to make room for kits at 35%.
        </p>
      </Card>

      {/* ─── Product mix per category ───────────────────────────── */}
      <SectionHeading>📦 Product mix per category</SectionHeading>
      <p className="text-sm text-gray-700 mb-3">
        Inside each category, the per-category drink count is allocated
        across a curated product list. Shares always sum to 1.0.
      </p>

      {(['beer', 'seltzers', 'wine', 'spirits'] as const).map((cat) => (
        <Card key={cat} title={CATEGORY_LABELS[cat] || cat}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-2 py-2 text-left font-bold text-xs uppercase tracking-wide">
                  Product
                </th>
                <th className="px-2 py-2 text-right font-bold text-xs uppercase tracking-wide">
                  Share
                </th>
                <th className="px-2 py-2 text-right font-bold text-xs uppercase tracking-wide">
                  Servings/unit
                </th>
              </tr>
            </thead>
            <tbody>
              {ENGINE_SPEC.productMix[cat].map(
                (row) => {
                  const share = row.share;
                  const servings =
                    ENGINE_SPEC.servingsPerUnit[row.product];
                  return (
                    <tr key={row.product} className="border-b border-gray-100">
                      <td className="px-2 py-2">{row.product}</td>
                      <td className="px-2 py-2 text-right font-mono">
                        {`${Math.round(share * 100)}%`}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {servings ?? '—'}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </Card>
      ))}

      <Card title={CATEGORY_LABELS['cocktail-kits']}>
        <p className="text-sm mb-2 text-gray-700">
          Three kits, split evenly across the cocktail-kit drink count.
          Minimum 1 kit of each.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-2 text-left font-bold text-xs uppercase tracking-wide">
                Kit
              </th>
              <th className="px-2 py-2 text-right font-bold text-xs uppercase tracking-wide">
                Servings/kit
              </th>
            </tr>
          </thead>
          <tbody>
            {ENGINE_SPEC.productMix.cocktailKits.map((row) => (
              <tr key={row.product} className="border-b border-gray-100">
                <td className="px-2 py-2">{row.product}</td>
                <td className="px-2 py-2 text-right font-mono">
                  {ENGINE_SPEC.servingsPerUnit[row.product] ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ─── Search overrides ────────────────────────────────────── */}
      <SectionHeading>🔎 Recommendation name → DB lookup</SectionHeading>
      <p className="text-sm text-gray-700 mb-3">
        The engine produces a recommendation name (e.g. &ldquo;Miller Lite
        24pk&rdquo;) which is then resolved to a live{' '}
        <code className="text-xs bg-gray-100 px-1 rounded">Product</code>{' '}
        by the search override table. <strong>variantHint</strong>{' '}
        disambiguates products that have multiple pack sizes.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead style={{ background: NAVY, color: '#FFFFFF' }}>
            <tr>
              <th className="px-3 py-2 text-left font-bold">Recommendation</th>
              <th className="px-3 py-2 text-left font-bold">DB search</th>
              <th className="px-3 py-2 text-left font-bold">Variant hint</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ENGINE_SPEC.searchOverrides).map(([name, ov]) => (
              <tr key={name} className="border-t border-gray-200">
                <td className="px-3 py-2 font-mono text-xs">{name}</td>
                <td className="px-3 py-2 font-mono text-xs">{ov.search}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">
                  {ov.variantHint || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="mt-12 p-4 rounded-lg text-xs text-gray-500 text-center"
        style={{ background: SOFT_GRAY }}
      >
        This panel reads{' '}
        <code className="text-xs bg-white px-1 rounded">ENGINE_SPEC</code>{' '}
        at render time. To change a rule, edit{' '}
        <code className="text-xs bg-white px-1 rounded">
          src/lib/drinkPlannerLogic.ts
        </code>{' '}
        — the engine + this panel update together.
      </div>
    </div>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-heading text-2xl md:text-3xl font-bold tracking-wide mt-12 mb-3 pb-2 border-b-2"
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

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className="text-xs sm:text-sm font-mono p-3 rounded overflow-x-auto"
      style={{ background: NAVY, color: GOLD }}
    >
      {children}
    </pre>
  );
}

function SplitTable({ split }: { split: Record<string, number> }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="px-2 py-2 text-left font-bold text-xs uppercase tracking-wide">
            Category
          </th>
          <th className="px-2 py-2 text-right font-bold text-xs uppercase tracking-wide">
            Base weight
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(split).map(([cat, weight]) => (
          <tr key={cat} className="border-b border-gray-100">
            <td className="px-2 py-2">{CATEGORY_LABELS[cat] || cat}</td>
            <td className="px-2 py-2 text-right font-mono">
              {(weight * 100).toFixed(0)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
