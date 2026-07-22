/**
 * Extract code-authoritative business facts into content/playbook/facts-generated.yaml.
 *
 * Source of truth per vault Business/Delivery-Zones-and-Fees.md: src/lib/delivery/rates.ts
 * owns zones/fees/minimums; src/lib/tax/rates.ts owns the sales-tax default. When site copy
 * disagrees with these values, the copy is stale — fix the copy, never this file.
 *
 * The output file is DO-NOT-EDIT; the curated registry lives in content/playbook/facts.yaml.
 * scripts/ is excluded from the @/ path alias, so imports below are relative.
 *
 * Run: npx tsx scripts/playbook/extract-code-facts.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { DELIVERY_ZONES } from '../../src/lib/delivery/rates';
import { DEFAULT_TAX_RATE } from '../../src/lib/tax/rates';

interface GeneratedFact {
  id: string;
  statement: string;
  status: 'verified';
  source: string;
  data?: Record<string, unknown>;
}

function money(n: number): string {
  return `$${n}`;
}

const facts: GeneratedFact[] = [];

for (const zone of DELIVERY_ZONES) {
  const slug = zone.name.toLowerCase().replace(/\s+/g, '-');
  // Operator decision 2026-07-07 (Wayne tuning): the customer-facing STATEMENT states
  // only the base delivery fee + order minimum. The express rate and free-delivery
  // threshold are intentionally omitted so the auto-reply bot doesn't proactively
  // advertise them (express fee is not a firmly-decided customer-facing number, and
  // Allan doesn't want free-over-threshold advertised to every visitor). The full
  // numbers are still preserved in `data` for any other consumer / checkout logic.
  facts.push({
    id: `delivery-zone-${slug}`,
    statement:
      `${zone.name} (${zone.description}): delivery fee ${money(zone.baseRate)}, ` +
      `order minimum ${money(zone.minimumOrder)}. ${zone.zipCodes.length} zip codes.`,
    status: 'verified',
    source: 'src/lib/delivery/rates.ts (DELIVERY_ZONES)',
    data: {
      baseRate: zone.baseRate,
      expressRate: zone.expressRate,
      minimumOrder: zone.minimumOrder,
      freeDeliveryThreshold: zone.freeDeliveryThreshold,
      zipCodes: zone.zipCodes,
    },
  });
}

// NOTE: the former `delivery-express-no-free-threshold` fact was removed 2026-07-07 —
// stating it would reintroduce both the express rate and the free-delivery threshold
// into the bot's prompt, which is exactly what the operator asked to keep out.

facts.push({
  id: 'delivery-outside-service-area',
  statement:
    'Zip codes not listed in a delivery zone are outside the service area and not eligible for delivery at checkout.',
  status: 'verified',
  source: 'src/lib/delivery/rates.ts (DEFAULT_RATE)',
});

facts.push({
  id: 'sales-tax-default',
  statement: `Default sales tax for the Austin delivery area is ${(DEFAULT_TAX_RATE * 100).toFixed(2)}% (6.25% Texas state + 2.00% Austin local).`,
  status: 'verified',
  source: 'src/lib/tax/rates.ts (DEFAULT_TAX_RATE)',
});

// --- emit YAML (hand-rolled: flat structure, no dependency needed) ---

function yamlString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const lines: string[] = [
  '# GENERATED FILE — DO NOT EDIT.',
  '# Regenerate with: npx tsx scripts/playbook/extract-code-facts.ts',
  '# Code-authoritative facts; site copy that disagrees with these values is stale.',
  `# generated_at: ${new Date().toISOString()}`,
  'facts:',
];

for (const f of facts) {
  lines.push(`  - id: ${f.id}`);
  lines.push(`    statement: ${yamlString(f.statement)}`);
  lines.push(`    status: ${f.status}`);
  lines.push(`    source: ${yamlString(f.source)}`);
  if (f.data) {
    lines.push('    data:');
    for (const [k, v] of Object.entries(f.data)) {
      if (Array.isArray(v)) {
        lines.push(`      ${k}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`);
      } else {
        lines.push(`      ${k}: ${v === null ? 'null' : JSON.stringify(v)}`);
      }
    }
  }
}

const outPath = path.join(process.cwd(), 'content', 'playbook', 'facts-generated.yaml');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`Wrote ${facts.length} facts → ${outPath}`);
