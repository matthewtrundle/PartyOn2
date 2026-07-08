#!/usr/bin/env node
/**
 * Create per-occasion GA4 lead key events (bachelorette / corporate / wedding)
 * that mirror the existing `lead_bachelor` setup, via the GA4 Admin API.
 *
 * WHY A SCRIPT: GA4's 2024 UI removed the ability to create parameter-matched
 * "Create event" rules; the flexible form only opens for grandfathered events
 * like `lead_bachelor`. The Admin API (eventCreateRules + keyEvents) still
 * supports the full pattern.
 *
 * WHAT IT DOES (idempotent — safe to re-run):
 *   1. Finds the web data stream for measurement id G-WVLPHPQBJ1.
 *   2. Reads the existing `lead_bachelor` event-create rule + key event and uses
 *      them as the template (does NOT guess the condition shape from memory).
 *   3. For each of bachelorette / corporate / wedding, creates a matching
 *      event-create rule (event_name=generate_lead AND <occasion field>=<x>,
 *      copy source params) and registers `lead_<x>` as a key event with a
 *      $1 USD default value. Anything that already exists is skipped.
 *
 * AUTH: reuses the existing analytics service account
 * (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY). Discovery needs
 * `analytics.readonly` + Viewer on the property. --apply needs `analytics.edit`
 * + Editor/Administrator on the property AND the Google Analytics Admin API
 * enabled in the service account's GCP project.
 *
 * USAGE:
 *   node scripts/analytics/create-lead-occasion-events.mjs           # dry run (default)
 *   node scripts/analytics/create-lead-occasion-events.mjs --apply   # create the missing config
 */

import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import { google } from 'googleapis';

const APPLY = process.argv.includes('--apply');
const EXPECTED_PROPERTY = '376300916';
const MEASUREMENT_ID = 'G-WVLPHPQBJ1';
const TEMPLATE_OCCASION = 'bachelor';
const TARGET_OCCASIONS = ['bachelorette', 'corporate', 'wedding'];
const KEY_EVENT_VALUE = 1;
const KEY_EVENT_CURRENCY = 'USD';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Walk up from the script dir to find the repo-root .env.local (works from a git worktree too). */
async function loadEnv() {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, '.env.local');
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let v = m[2];
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        if (!process.env[m[1]]) process.env[m[1]] = v;
      }
      return candidate;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function makeAuth(scope) {
  const client_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const private_key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!client_email || !private_key) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY in env');
  }
  return new google.auth.GoogleAuth({ credentials: { client_email, private_key }, scopes: [scope] });
}

function describeApiError(e) {
  const err = e?.response?.data?.error || e;
  const status = err?.status || err?.code || e?.code;
  const message = err?.message || String(e);
  return `${status || 'ERROR'}: ${message}`;
}

const indent = (obj) =>
  JSON.stringify(obj, null, 2).split('\n').map((l) => '     ' + l).join('\n');

async function main() {
  const envPath = await loadEnv();
  const propertyId = EXPECTED_PROPERTY; // user-authoritative; measurement-id check below backstops it
  const envProperty = process.env.GOOGLE_GA4_PROPERTY_ID;

  console.log(`\n=== GA4 lead-occasion event setup (${APPLY ? 'APPLY' : 'DRY RUN'}) ===`);
  console.log(`env.local:        ${envPath || '(not found — relying on process env)'}`);
  console.log(`service account:  ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '(missing)'}`);
  console.log(`property:         properties/${propertyId}` +
    (envProperty && envProperty !== propertyId ? `  (WARNING: env GOOGLE_GA4_PROPERTY_ID=${envProperty})` : ''));
  console.log(`measurement id:   ${MEASUREMENT_ID}`);

  // Discovery uses read-only scope so it works even before the SA is granted edit.
  const readAuth = makeAuth('https://www.googleapis.com/auth/analytics.readonly');
  const beta = google.analyticsadmin({ version: 'v1beta', auth: readAuth });
  const alpha = google.analyticsadmin({ version: 'v1alpha', auth: readAuth });

  // 1. Find the data stream for the measurement id.
  let stream;
  try {
    const res = await beta.properties.dataStreams.list({ parent: `properties/${propertyId}`, pageSize: 200 });
    const streams = res.data.dataStreams || [];
    stream = streams.find((s) => s.webStreamData?.measurementId === MEASUREMENT_ID);
    if (!stream) {
      console.error(`\n✖ No web data stream with measurement id ${MEASUREMENT_ID} on properties/${propertyId}. Streams found:`);
      for (const s of streams) console.error(`   - ${s.displayName} (${s.webStreamData?.measurementId || s.type}) → ${s.name}`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`\n✖ Failed to list data streams — ${describeApiError(e)}`);
    console.error('  Likely: Google Analytics Admin API not enabled in the SA project, OR the SA lacks Viewer on the property.');
    process.exit(1);
  }
  console.log(`\ndata stream:      ${stream.displayName} → ${stream.name}`);

  // 2. Read the existing rules + key events (the template).
  const rulesRes = await alpha.properties.dataStreams.eventCreateRules.list({ parent: stream.name, pageSize: 200 });
  const rules = rulesRes.data.eventCreateRules || [];
  const template = rules.find((r) => r.destinationEvent === `lead_${TEMPLATE_OCCASION}`);
  if (!template) {
    console.error(`\n✖ Template rule lead_${TEMPLATE_OCCASION} not found on this data stream. Existing rules:`);
    for (const r of rules) console.error(`   - ${r.destinationEvent} → ${r.name}`);
    process.exit(1);
  }
  console.log(`\ntemplate event-create rule (lead_${TEMPLATE_OCCASION}):`);
  console.log(indent(template));

  const keyRes = await beta.properties.keyEvents.list({ parent: `properties/${propertyId}`, pageSize: 200 });
  const keyEvents = keyRes.data.keyEvents || [];
  const templateKey = keyEvents.find((k) => k.eventName === `lead_${TEMPLATE_OCCASION}`);
  console.log(`\ntemplate key event (lead_${TEMPLATE_OCCASION}):`);
  console.log(indent(templateKey || '(NOT a key event — check assumptions)'));

  // Identify the occasion condition (the single non-event_name condition) so we
  // mirror the template's exact shape and only swap the occasion value.
  const conds = template.eventConditions || [];
  const eventNameCond = conds.find((c) => c.field === 'event_name');
  const occasionConds = conds.filter((c) => c.field !== 'event_name');
  if (!eventNameCond || occasionConds.length !== 1) {
    console.error('\n✖ Unexpected template condition shape — aborting so nothing is guessed. Conditions:');
    console.error(indent(conds));
    process.exit(1);
  }
  const occasionField = occasionConds[0].field;
  console.log(`\noccasion condition: field="${occasionField}" comparisonType=${occasionConds[0].comparisonType} value=${JSON.stringify(occasionConds[0].value)}`);

  // 3. Build the idempotent plan.
  const plan = TARGET_OCCASIONS.map((occ) => {
    const dest = `lead_${occ}`;
    const existingRule = rules.find((r) => r.destinationEvent === dest);
    const existingKey = keyEvents.find((k) => k.eventName === dest);
    const eventConditions = conds.map((c) => (c.field === occasionField ? { ...c, value: occ } : { ...c }));
    const ruleBody = {
      destinationEvent: dest,
      eventConditions,
      sourceCopyParameters: template.sourceCopyParameters ?? true,
      ...(template.parameterMutations?.length ? { parameterMutations: template.parameterMutations } : {}),
    };
    const keyBody = {
      eventName: dest,
      countingMethod: templateKey?.countingMethod || 'ONCE_PER_EVENT',
      defaultValue: { numericValue: KEY_EVENT_VALUE, currencyCode: templateKey?.defaultValue?.currencyCode || KEY_EVENT_CURRENCY },
    };
    return { occ, dest, existingRule, existingKey, ruleBody, keyBody };
  });

  console.log('\n=== PLAN ===');
  for (const p of plan) {
    console.log(`\n• ${p.dest}`);
    console.log(`   event-create rule: ${p.existingRule ? `EXISTS (${p.existingRule.name}) — skip` : 'CREATE'}`);
    if (!p.existingRule) console.log(indent(p.ruleBody));
    console.log(`   key event:         ${p.existingKey ? `EXISTS (${p.existingKey.name}) — skip` : 'CREATE'}`);
    if (!p.existingKey) console.log(indent(p.keyBody));
  }

  if (!APPLY) {
    console.log('\nDry run only — nothing was changed.');
    console.log('Re-run with --apply to create the missing rules + key events.');
    console.log('(Apply needs the analytics.edit scope + Editor/Administrator on the property.)');
    return;
  }

  // --- APPLY: mint an edit-scoped client. ---
  const editAuth = makeAuth('https://www.googleapis.com/auth/analytics.edit');
  const betaW = google.analyticsadmin({ version: 'v1beta', auth: editAuth });
  const alphaW = google.analyticsadmin({ version: 'v1alpha', auth: editAuth });

  let created = 0;
  let failed = 0;
  for (const p of plan) {
    if (!p.existingRule) {
      try {
        const res = await alphaW.properties.dataStreams.eventCreateRules.create({ parent: stream.name, requestBody: p.ruleBody });
        console.log(`✔ created event-create rule ${p.dest} → ${res.data.name}`);
        created++;
      } catch (e) {
        console.error(`✖ event-create rule ${p.dest} FAILED — ${describeApiError(e)}`);
        failed++;
      }
    }
    if (!p.existingKey) {
      try {
        const res = await betaW.properties.keyEvents.create({ parent: `properties/${propertyId}`, requestBody: p.keyBody });
        console.log(`✔ created key event ${p.dest} → ${res.data.name}`);
        created++;
      } catch (e) {
        console.error(`✖ key event ${p.dest} FAILED — ${describeApiError(e)}`);
        failed++;
      }
    }
  }
  console.log(`\nApply complete: ${created} created, ${failed} failed.`);
  if (failed === 0) {
    console.log('Next: fire one test generate_lead per occasion, wait ~24h for GA4 to surface each');
    console.log('key event, then import each into Google Ads (CID 891-835-6854) and set as the');
    console.log('respective campaign goal, replacing the interim generate_lead goal.');
  }
}

main().catch((e) => { console.error('\n✖ ' + describeApiError(e)); process.exit(1); });
