// Provision the FareHarbor -> Zapier webhook credential for Centex Boat Rentals.
//
// Idempotent: generates a webhookApiKey only if one is not already set, and
// ensures the affiliate is ACTIVE so POST /api/webhooks/create-dashboard will
// accept its requests. Safe to re-run.
//
// Run from the worktree with the env file loaded (Node 20+):
//   node --env-file=../../../.env.local scripts/ops/provision-centex-webhook.mjs
// or from the repo root:
//   node --env-file=.env.local scripts/ops/provision-centex-webhook.mjs
//
// Prints the key + the exact Zapier header value to paste into the Zap.

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

const p = new PrismaClient();
const CODE = 'CENTEXBOATRENTALS';

const aff = await p.affiliate.findUnique({ where: { code: CODE } });
if (!aff) {
  console.error(`✗ No affiliate with code ${CODE}. Aborting (nothing changed).`);
  await p.$disconnect();
  process.exit(1);
}

let key = aff.webhookApiKey;
const generated = !key;
if (!key) {
  key = `whk_centex_${randomBytes(24).toString('hex')}`;
}

await p.affiliate.update({
  where: { code: CODE },
  data: { webhookApiKey: key, status: 'ACTIVE' },
});

console.log('✓ Centex webhook credential provisioned\n');
console.log('  affiliateId   :', aff.id);
console.log('  code          :', CODE);
console.log('  status        : ACTIVE', aff.status === 'ACTIVE' ? '(unchanged)' : `(was ${aff.status})`);
console.log('  webhookApiKey :', key, generated ? '(NEW)' : '(existing — reused)');
console.log('\n--- Paste into the Zapier "Webhooks by Zapier" POST action ---');
console.log('  URL    : https://partyondelivery.com/api/webhooks/create-dashboard');
console.log('  Header : apikey =', key);
console.log('---------------------------------------------------------------');

await p.$disconnect();
