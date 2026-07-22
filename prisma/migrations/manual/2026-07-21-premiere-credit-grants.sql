-- Premiere Credit automation — grants ledger.
--
-- One row per POD-credit grant sourced from the Premiere "POD Credits" sheet
-- tab. Each grant mints a single-use FIXED_AMOUNT Discount and delivers the
-- code to the customer. Redemption is NOT stored here — it is derived live
-- from the linked Discount (usageCount / DiscountUsage). Expiry lives only on
-- Discount.expiresAt. See src/lib/premiere-credits/.
--
-- Additive + idempotent per the manual-migration rules (README.md).

BEGIN;

CREATE TABLE IF NOT EXISTS premiere_credit_grants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Idempotency: sha256 of normalized client name + booking date + amount.
  -- Row numbers are never identity (humans insert/reorder rows), so this hash
  -- is the dedupe key. UNIQUE so concurrent cron ticks cannot double-mint.
  source_key          TEXT NOT NULL UNIQUE,
  -- Last-seen 1-based sheet row (informational only, for the admin UI).
  sheet_row           INTEGER,
  client_name         TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  booking_date        DATE,
  cruise_date         DATE,
  amount              NUMERIC(10,2) NOT NULL,
  -- Linked minted discount (NULL until minted — NEEDS_CONTACT never mints).
  discount_id         UUID REFERENCES discounts(id),
  code                TEXT,
  -- Lifecycle: PENDING | NEEDS_CONTACT | READY | HELD_FOR_APPROVAL | SENT |
  -- SEND_FAILED | CANCELED. Stored as TEXT (not a PG enum) so lifecycle
  -- tweaks never need a migration.
  status              TEXT NOT NULL DEFAULT 'PENDING',
  hold_reason         TEXT,
  error               TEXT,
  approved_at         TIMESTAMPTZ,
  approved_by         TEXT,
  email_sent_at       TIMESTAMPTZ,
  sms_sent_at         TIMESTAMPTZ,
  partner_notified_at TIMESTAMPTZ,
  -- Raw sheet cells captured at ingest, for audit / debugging.
  raw_row             JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS premiere_credit_grants_status_idx
  ON premiere_credit_grants (status);
CREATE INDEX IF NOT EXISTS premiere_credit_grants_discount_idx
  ON premiere_credit_grants (discount_id);

COMMIT;
