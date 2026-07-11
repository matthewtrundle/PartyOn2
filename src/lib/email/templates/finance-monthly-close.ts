/**
 * Finance Director — monthly-close P&L email template.
 *
 * Same cream-paper / gold-accent aesthetic as the weekly finance briefing, but
 * structured as a P&L statement: Revenue → COGS → Gross Profit (margin) → OpEx
 * by category → Net income.
 *
 * HONESTY GATE: net income renders as a number ONLY when
 * `payload.netIncomeReliable` is true. Otherwise it shows "Pending" plus the
 * `dataHealth` flags that explain why — never a number the data can't support.
 *
 * The bank-sourced figures are CASH-BASIS (alcohol PURCHASED that month, not
 * cost-of-goods-SOLD); the template labels this so a lumpy restock month isn't
 * misread as a margin collapse.
 */

import type {
  MonthlyClosePayload,
  MonthlyCloseExpenseRow,
} from '@/lib/finance/monthly-close-payload';

const COLORS = {
  paper: '#FBFAF5',
  ink: '#0a0a0a',
  inkBody: '#1a1a1a',
  hairline: '#e7e3d6',
  goldAccent: '#7a6a1f',
  gold: '#D4AF37',
  blue: '#0B74B8',
  good: '#15803d',
  caution: '#d97706',
  urgent: '#dc2626',
  muteText: '#6b6b6b',
};

function esc(s: string): string {
  // Vendor / merchant names come from QuickBooks + Plaid (external systems), so
  // escape the full set incl. the single quote — defense-in-depth even though
  // interpolations currently sit in double-quoted attributes / text nodes.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Whole-dollar money for the P&L (cents rounded). Negative → parenthesised. */
function money(cents: number): string {
  const dollars = Math.round(cents / 100);
  const abs = Math.abs(dollars).toLocaleString('en-US');
  return dollars < 0 ? `($${abs})` : `$${abs}`;
}

function pct(p: number | null): string {
  return p === null ? '—' : `${p.toFixed(1)}%`;
}

/** One P&L line: label on the left, amount right-aligned. `strong` bolds it. */
function plLine(
  label: string,
  amount: string,
  opts: { strong?: boolean; indent?: boolean; sub?: string; color?: string } = {}
): string {
  const weight = opts.strong ? '700' : '400';
  const size = opts.strong ? '15px' : '14px';
  const pad = opts.indent ? '0 0 0 20px' : '0';
  const sub = opts.sub
    ? `<div style="font-size:11px;color:${COLORS.muteText};font-weight:400;">${esc(opts.sub)}</div>`
    : '';
  return `
    <tr>
      <td style="padding:7px 0;border-bottom:1px solid ${COLORS.hairline};">
        <div style="font-size:${size};color:${COLORS.inkBody};font-weight:${weight};padding:${pad};">${esc(label)}</div>
        ${sub}
      </td>
      <td align="right" style="padding:7px 0;border-bottom:1px solid ${COLORS.hairline};white-space:nowrap;">
        <span style="font-size:${size};color:${opts.color ?? COLORS.ink};font-weight:${weight};">${esc(amount)}</span>
      </td>
    </tr>`;
}

function opexRowsHtml(rows: MonthlyCloseExpenseRow[]): string {
  if (rows.length === 0) return '';
  return rows
    .map((r) =>
      plLine(r.label, money(r.cents), {
        indent: true,
        sub: r.topVendor ? `top: ${r.topVendor}` : undefined,
      })
    )
    .join('');
}

function flagsBlock(flags: string[]): string {
  if (flags.length === 0) return '';
  return `
    <div style="background:${COLORS.paper};border-left:3px solid ${COLORS.caution};padding:12px 16px;margin:16px 0 0 0;">
      <div style="font-size:11px;color:${COLORS.caution};text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:8px;">Why net income is withheld (${flags.length})</div>
      ${flags
        .map(
          (f) =>
            `<div style="font-size:13px;color:${COLORS.inkBody};line-height:1.5;margin-bottom:6px;">• ${esc(f)}</div>`
        )
        .join('')}
    </div>`;
}

/** Reconciliation status: income-vs-deposits check + the "other income" gap. */
function reconciliationBlock(d: MonthlyClosePayload): string {
  const rows: string[] = [];

  if (d.expenseSource === 'none') {
    // No bank/QB data for this month — nothing to reconcile; don't claim a
    // deposit anomaly that doesn't exist.
    rows.push(
      `Expense source: <strong>none yet</strong> — no QuickBooks or production bank data for this month, so COGS / OpEx / net income are unavailable. (Early-2026 months fill in automatically as Plaid backfills more bank history.)`
    );
    return `
    <div style="background:${COLORS.paper};padding:14px 16px;margin:20px 0 0 0;border:1px solid ${COLORS.hairline};">
      <div style="font-size:11px;color:${COLORS.muteText};text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:8px;">Reconciliation status</div>
      <div style="font-size:13px;color:${COLORS.inkBody};line-height:1.7;">${rows.join('<br>')}</div>
    </div>`;
  }

  rows.push(
    `Expense source: <strong>${d.expenseSource === 'bank' ? 'bank feed (cash-basis)' : 'QuickBooks'}</strong>`
  );

  if (d.ownerCapitalCents !== null && d.ownerCapitalCents > 0) {
    // Itemize the transfers — the audit trail that makes a misclassified
    // deposit visible instead of hidden inside an aggregate.
    const txns = d.ownerCapitalTxns
      .map((t) => `${money(t.cents)} — ${esc(t.name)}`)
      .join('<br>&nbsp;&nbsp;');
    rows.push(
      `Owner capital: <strong>${money(d.ownerCapitalCents)}</strong> received this month — ` +
        `classified as financing (equity injection), excluded from income.` +
        (txns ? `<br>&nbsp;&nbsp;${txns}` : '')
    );
  }

  if (d.vendorRefundCents !== null && d.vendorRefundCents > 0) {
    rows.push(
      `Vendor refunds: ${money(d.vendorRefundCents)} in distributor credits — excluded from income.`
    );
  }

  if (d.incomeReconciled === true) {
    rows.push(`Income: ✅ bank deposits reconcile to known Stripe revenue.`);
  } else if (d.incomeReconciled === false) {
    const gap = d.otherIncomeCents ? ` (~${money(d.otherIncomeCents)} unexplained)` : '';
    rows.push(
      `Income: ⚠️ bank deposits <strong>exceed</strong> known Stripe revenue${gap}. This is an <strong>operator question</strong>, not a bug — the account both repays a loan and receives non-sales deposits (loan proceeds / owner capital / transfers / possibly unrecorded income). Confirm what these deposits are; once explained, the month's net income becomes reliable.`
    );
  }

  return `
    <div style="background:${COLORS.paper};padding:14px 16px;margin:20px 0 0 0;border:1px solid ${COLORS.hairline};">
      <div style="font-size:11px;color:${COLORS.muteText};text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin-bottom:8px;">Reconciliation status</div>
      <div style="font-size:13px;color:${COLORS.inkBody};line-height:1.7;">
        ${rows.join('<br>')}
      </div>
    </div>`;
}

/** The net-income line — the honesty gate lives here. */
function netIncomeHtml(d: MonthlyClosePayload): string {
  if (d.netIncomeReliable && d.netIncomeCents !== null) {
    const color = d.netIncomeCents >= 0 ? COLORS.good : COLORS.urgent;
    return plLine('Net income', money(d.netIncomeCents), { strong: true, color });
  }
  return plLine('Net income', 'Pending', {
    strong: true,
    color: COLORS.caution,
    sub: 'withheld until the data is complete — see below',
  });
}

export function renderFinanceMonthlyCloseEmail(d: MonthlyClosePayload): string {
  const revMoM =
    d.revenueMoMPct !== null
      ? `<span style="font-size:11px;color:${
          d.revenueMoMPct >= 0 ? COLORS.good : COLORS.urgent
        };"> ${d.revenueMoMPct >= 0 ? '↑' : '↓'} ${Math.abs(d.revenueMoMPct).toFixed(1)}% vs prior month</span>`
      : '';

  const cogsLabel = d.cashBasis ? 'COGS (cash-basis — alcohol purchased)' : 'COGS';
  const hasExpenses = d.expenseSource !== 'none';

  // P&L body — revenue always; COGS/GP/OpEx/net only when an expense source exists.
  const plRows: string[] = [
    plLine('Revenue', money(d.revenueCents), {
      strong: true,
      sub: `${d.orderCount} orders · ${money(d.revenueFromOrdersCents)} dashboard + ${money(
        d.revenueFromShopifyCents
      )} Shopify`,
    }),
  ];

  const cogsLine = plLine(cogsLabel, d.cogsCents === null ? '—' : money(d.cogsCents), {
    indent: true,
    sub: d.cogsTopVendor ? `top: ${d.cogsTopVendor}` : undefined,
  });
  const grossProfitLine = plLine(
    'Gross profit',
    d.grossProfitCents === null ? '—' : money(d.grossProfitCents),
    { strong: true, sub: `gross margin ${pct(d.grossMarginPct)}` }
  );
  // Accrual view: true product margin (cost of what SOLD), over the covered
  // basket only. Supplements the lumpy cash-basis line above; safe to show even
  // on withheld months (independent of OpEx, so it can't reconstruct net).
  const accrualLine =
    d.accrualGrossMarginPct !== null && d.accrualCoveragePct !== null
      ? plLine('Product margin (accrual est.)', pct(d.accrualGrossMarginPct), {
          indent: true,
          sub: `cost of goods sold this month · based on ${d.accrualCoveragePct.toFixed(0)}% of item revenue with known cost`,
        })
      : '';

  if (!hasExpenses) {
    plRows.push(
      plLine('Expenses', 'Pending', {
        indent: true,
        sub: 'awaiting bank / QuickBooks data for this month',
      })
    );
  } else if (d.netIncomeReliable) {
    plRows.push(
      cogsLine,
      grossProfitLine,
      accrualLine,
      plLine('Operating expenses', d.opexCents === null ? '—' : money(d.opexCents), { strong: true }),
      opexRowsHtml(d.opexRows)
    );
  } else {
    // HONESTY GATE: net income is unreliable this month. Show COGS + gross margin
    // (gross profit is just Revenue − COGS, already visible), but WITHHOLD
    // operating expenses so the unreliable net income CANNOT be reconstructed as
    // (gross profit − operating expenses). Net income itself renders "Pending".
    plRows.push(
      cogsLine,
      grossProfitLine,
      accrualLine,
      plLine('Operating expenses', 'Withheld', {
        strong: true,
        sub: 'withheld until the flags below are resolved — net income can’t be stated',
      })
    );
  }
  // Net income line always renders — as a number only when reliable, else "Pending".
  plRows.push(netIncomeHtml(d));

  const bodyTable = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${plRows.join('')}
    </table>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Finance Monthly Close — ${esc(d.monthLabel)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f3ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f3ea;padding:32px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background:#ffffff;border:1px solid ${COLORS.hairline};">
          <!-- header -->
          <tr>
            <td style="padding:28px 32px 16px 32px;border-bottom:1px solid ${COLORS.hairline};">
              <div style="font-size:11px;color:${COLORS.goldAccent};text-transform:uppercase;letter-spacing:0.15em;font-weight:600;">Finance Director · monthly close</div>
              <h1 style="font-size:24px;color:${COLORS.ink};margin:8px 0 4px 0;font-weight:700;">${esc(d.monthLabel)} P&amp;L${revMoM}</h1>
              <div style="font-size:12px;color:${COLORS.muteText};">Generated ${esc(new Date(d.generatedAtIso).toUTCString())}${
                d.cashBasis ? ' · figures are cash-basis' : ''
              }</div>
            </td>
          </tr>

          <!-- P&L body -->
          <tr>
            <td style="padding:20px 32px;">
              ${bodyTable}
              ${!d.netIncomeReliable ? flagsBlock(d.flags) : ''}
              ${reconciliationBlock(d)}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;">
                <tr>
                  <td align="center">
                    <a href="${esc(d.dashboardUrl)}" style="display:inline-block;background:${COLORS.blue};color:#ffffff;text-decoration:none;padding:12px 22px;font-size:13px;font-weight:600;">Open finance dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid ${COLORS.hairline};">
              <div style="font-size:11px;color:${COLORS.muteText};line-height:1.5;">
                Party On Delivery · Finance Director (Phase 5)<br>
                Generated automatically on the 1st of each month at 14:00 UTC${
                  d.cashBasis
                    ? '. Cash-basis: COGS is alcohol purchased that month (cash to distributors), not cost-of-goods-sold — restock months spike.'
                    : '.'
                }
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderFinanceMonthlyCloseText(d: MonthlyClosePayload): string {
  const lines: string[] = [];
  lines.push(`Finance Monthly Close — ${d.monthLabel}${d.cashBasis ? ' (cash-basis)' : ''}`);
  lines.push('');
  const momText = d.revenueMoMPct !== null ? ` (${d.revenueMoMPct >= 0 ? '+' : ''}${d.revenueMoMPct.toFixed(1)}% MoM)` : '';
  lines.push(`Revenue: ${money(d.revenueCents)}${momText} — ${d.orderCount} orders`);

  if (d.expenseSource === 'none') {
    lines.push('');
    lines.push('Expenses: none yet (no QB or production bank data this month).');
    lines.push('Net income: Pending.');
  } else {
    lines.push(
      `${d.cashBasis ? 'COGS (cash-basis)' : 'COGS'}: ${d.cogsCents === null ? '—' : money(d.cogsCents)}` +
        (d.cogsTopVendor ? ` (top: ${d.cogsTopVendor})` : '')
    );
    lines.push(
      `Gross profit: ${d.grossProfitCents === null ? '—' : money(d.grossProfitCents)} (margin ${pct(d.grossMarginPct)})`
    );
    if (d.accrualGrossMarginPct !== null && d.accrualCoveragePct !== null) {
      lines.push(
        `Product margin (accrual est.): ${pct(d.accrualGrossMarginPct)} ` +
          `(cost of goods SOLD; ${d.accrualCoveragePct.toFixed(0)}% of item revenue has known cost)`
      );
    }
    if (d.netIncomeReliable) {
      lines.push(`Operating expenses: ${d.opexCents === null ? '—' : money(d.opexCents)}`);
      for (const r of d.opexRows) {
        lines.push(`  - ${r.label}: ${money(r.cents)}${r.topVendor ? ` (top: ${r.topVendor})` : ''}`);
      }
      lines.push('');
      lines.push(`NET INCOME: ${d.netIncomeCents === null ? 'Pending' : money(d.netIncomeCents)}`);
    } else {
      // Withhold OpEx so the unreliable net income can't be reconstructed.
      lines.push('Operating expenses: Withheld (net income can’t be stated this month)');
      lines.push('');
      lines.push('NET INCOME: Pending (withheld until the flags below are resolved)');
      for (const f of d.flags) lines.push(`  ! ${f}`);
    }
  }

  // Income reconciliation only applies when there IS bank data for the month.
  if (d.expenseSource !== 'none') {
    lines.push('');
    lines.push('Reconciliation:');
    if (d.ownerCapitalCents !== null && d.ownerCapitalCents > 0) {
      lines.push(
        `  Owner capital: ${money(d.ownerCapitalCents)} received — financing (equity), excluded from income.`
      );
      for (const t of d.ownerCapitalTxns) {
        lines.push(`    ${money(t.cents)} — ${t.name}`);
      }
    }
    if (d.vendorRefundCents !== null && d.vendorRefundCents > 0) {
      lines.push(
        `  Vendor refunds: ${money(d.vendorRefundCents)} in distributor credits — excluded from income.`
      );
    }
    if (d.incomeReconciled === true) {
      lines.push('  Income reconciles to known Stripe revenue.');
    } else if (d.incomeReconciled === false) {
      const gap = d.otherIncomeCents ? ` (~${money(d.otherIncomeCents)} unexplained)` : '';
      lines.push(
        `  Bank deposits EXCEED known Stripe revenue${gap} — operator question (loan proceeds / owner capital / transfers / unrecorded income?).`
      );
    }
  }
  lines.push('');
  lines.push(`Dashboard: ${d.dashboardUrl}`);
  return lines.join('\n');
}
