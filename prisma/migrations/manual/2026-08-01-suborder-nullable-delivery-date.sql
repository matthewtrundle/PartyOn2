-- Make sub_orders.delivery_date / order_deadline nullable.
--
-- Self-serve partner dashboards were born with a silent fake delivery date
-- (creation + 7 days) because the column was NOT NULL; customers checked out
-- against it without ever being asked (wrong-date orders — LTYR order #425).
-- NULL now means "customer has not chosen a date yet"; checkout is gated on a
-- confirmed date, and real-date creation paths (Premier webhook, event
-- presets, portal) set delivery_date_confirmed=true at creation.
--
-- Constraint relaxation only — the safe "expand" direction: old code always
-- writes non-null values, no reads break, no data changes. Idempotent (a
-- second DROP NOT NULL is a no-op).
BEGIN;

ALTER TABLE sub_orders ALTER COLUMN delivery_date DROP NOT NULL;
ALTER TABLE sub_orders ALTER COLUMN order_deadline DROP NOT NULL;

COMMIT;
