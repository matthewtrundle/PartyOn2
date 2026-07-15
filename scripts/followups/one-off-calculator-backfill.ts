/**
 * One-off backfill send for the old wedding-drink-calculator leads.
 *
 * Context: the /wedding-drink-calculator saved a Lead row per KEYSTROKE of the
 * email field, so ~95 raw rows collapse to 11 real people (list below, one of
 * the two same-wedding Hathorne addresses dropped → 10 recipients). None have
 * ordered. This sends ONE abandoned-quote touch to each; the live engine then
 * handles only NEW captures going forward (abandoned-quote has no sweep, so
 * these old rows won't be re-contacted by the engine).
 *
 * Renders the EXACT engine copy (buildStepEmail) so recipients get the same
 * sign-off, CAN-SPAM footer, and one-click unsubscribe as a normal follow-up.
 * Respects the suppression list and is idempotent (skips anyone already sent
 * this one-off, tagged in EmailLog.metadata).
 *
 * Usage (from repo root, .env.local sourced):
 *   npx tsx scripts/followups/one-off-calculator-backfill.ts          # dry run
 *   npx tsx scripts/followups/one-off-calculator-backfill.ts --apply  # send
 */

import { createHmac } from 'crypto';
import { PrismaClient, EmailType, EmailStatus } from '@prisma/client';
import { Resend } from 'resend';
import { buildStepEmail } from '../../src/lib/followups/copy';

const APPLY = process.argv.includes('--apply');
const ONE_OFF_TAG = 'calculator-backfill-2026-07';

// 10 real, deliverable people (fragments + test addresses removed; one of the
// two same-wedding Hathorne addresses dropped per Allan).
const RECIPIENTS = [
  'scooper.austin@gmail.com',
  'ajrobinson95@gmail.com',
  'dakota40marshall@gmail.com',
  'sela.hernandez35@gmail.com',
  'jacob.dillon99@gmail.com',
  'qt.wedding.2027@gmail.com',
  'oliviabruner@msn.com',
  'boone.milesse@gmail.com',
  'hathornejessica@gmail.com',
  'thecosimanos@gmail.com',
];

const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://partyondelivery.com').replace(/\/+$/, '');
const FROM_EMAIL = process.env.FOLLOWUP_FROM_EMAIL || 'info@partyondelivery.com';
const FROM_NAME = process.env.FOLLOWUP_FROM_NAME || 'Allan at Party On Delivery';

function unsubToken(email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error('UNSUBSCRIBE_SECRET not set');
  return createHmac('sha256', secret).update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
}
function prefsUrl(email: string): string {
  const e = email.trim().toLowerCase();
  return `${SITE}/email/preferences?email=${encodeURIComponent(e)}&token=${unsubToken(e)}`;
}
function oneClickUrl(email: string): string {
  const e = email.trim().toLowerCase();
  return `${SITE}/api/email/unsubscribe?email=${encodeURIComponent(e)}&token=${unsubToken(e)}`;
}
function link(path: string): string {
  const url = new URL(path, SITE);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'followup');
  url.searchParams.set('utm_campaign', 'abandoned-quote');
  url.searchParams.set('utm_content', 'one-off');
  return url.toString();
}

async function main() {
  const prisma = new PrismaClient();
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  // Admin copy overrides (so a dashboard edit is honored here too).
  const overrideRow = await prisma.emailTemplateContent.findUnique({
    where: { templateType: 'followups' },
  });
  const copyOverrides = (overrideRow?.content as Record<string, unknown>) ?? {};

  console.log(`\n=== One-off calculator backfill — ${APPLY ? 'APPLY (sending)' : 'DRY RUN'} ===`);
  console.log(`From: ${FROM_NAME} <${FROM_EMAIL}>  |  ${RECIPIENTS.length} recipients\n`);

  let sent = 0;
  let skipped = 0;
  let firstPreviewShown = false;

  for (const raw of RECIPIENTS) {
    const email = raw.trim().toLowerCase();

    // Respect the suppression list.
    const suppressed = await prisma.emailSuppression.findUnique({ where: { email } });
    if (suppressed) {
      console.log(`  SKIP  ${email}  (suppressed: ${suppressed.reason})`);
      skipped++;
      continue;
    }

    // Idempotency: never send this one-off twice.
    const already = await prisma.emailLog.findFirst({
      where: { to: email, type: EmailType.FOLLOW_UP, metadata: { path: ['oneOff'], equals: ONE_OFF_TAG } },
    });
    if (already) {
      console.log(`  SKIP  ${email}  (already sent this one-off)`);
      skipped++;
      continue;
    }

    const lead = await prisma.lead.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, firstName: true },
    });

    const rendered = buildStepEmail('abandoned-quote', 1, {
      // buildStepEmail does not read ctx.job — a minimal stub is fine.
      job: { step: 1, email } as never,
      payload: { firstName: lead?.firstName ?? null, resumePath: '/wedding-drink-calculator' },
      link,
      unsubscribeUrl: prefsUrl(email),
      copyOverrides: copyOverrides as never,
    });
    if (!rendered) {
      console.log(`  SKIP  ${email}  (no rendered content)`);
      skipped++;
      continue;
    }

    if (!firstPreviewShown) {
      console.log('----- EMAIL PREVIEW (first recipient) -----');
      console.log(`Subject: ${rendered.subject}\n`);
      console.log(rendered.text);
      console.log('-------------------------------------------\n');
      firstPreviewShown = true;
    }

    if (!APPLY) {
      console.log(`  WOULD SEND  ${email}`);
      continue;
    }

    if (!resend) {
      console.log(`  SKIP  ${email}  (RESEND_API_KEY not set)`);
      skipped++;
      continue;
    }

    const log = await prisma.emailLog.create({
      data: {
        type: EmailType.FOLLOW_UP,
        to: email,
        subject: rendered.subject,
        status: EmailStatus.PENDING,
        metadata: { oneOff: ONE_OFF_TAG, journeyKey: 'abandoned-quote', step: 1, leadId: lead?.id ?? null },
      },
    });

    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        'List-Unsubscribe': `<${oneClickUrl(email)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'journey', value: 'abandoned_quote' },
        { name: 'one_off', value: ONE_OFF_TAG },
      ],
    });

    if (result.error) {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: EmailStatus.FAILED, errorMessage: JSON.stringify(result.error) },
      });
      console.log(`  FAIL  ${email}  (${result.error.message})`);
    } else {
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: EmailStatus.SENT, resendId: result.data?.id, sentAt: new Date() },
      });
      console.log(`  SENT  ${email}  (${result.data?.id})`);
      sent++;
    }
  }

  console.log(`\nDone. ${APPLY ? `sent=${sent} ` : ''}skipped=${skipped}${APPLY ? '' : ` — dry run, re-run with --apply to send`}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
