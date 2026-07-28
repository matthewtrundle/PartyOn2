-- A2P 10DLC SMS consent enforcement — persist the marketing opt-in on the Order.
--
-- Consent is captured at checkout (unchecked affirmative SmsConsentCheckbox) and
-- written to Stripe session metadata, but until now nothing read it back: the
-- order webhooks forwarded the phone to GHL/CoreLinq on every order regardless,
-- and follow-ups defaulted consent to false. This column is the persisted "who
-- said yes" signal read at the order-fan-out boundary (buildGhlPayload) and by
-- the follow-up engine, so only affirmative opt-ins are eligible for
-- marketing/reminder SMS. Transactional order texts are unaffected — the phone
-- still flows; this flag only gates marketing downstream.
--
-- Matches prisma/schema.prisma `Order.smsConsent Boolean @default(false)`.
-- Additive + idempotent; NOT NULL DEFAULT FALSE backfills every existing row to
-- the safe "no marketing consent" value (fail closed).

BEGIN;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "sms_consent" BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
