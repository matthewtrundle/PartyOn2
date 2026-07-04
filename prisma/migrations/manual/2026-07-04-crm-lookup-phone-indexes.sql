-- CRM lookup phone indexes (Phase 2 CoreLinq bridge)
--
-- GET /api/v1/crm/lookup?phone= matches on the last 10 digits of
-- orders.customer_phone / orders.delivery_phone via
--   RIGHT(REGEXP_REPLACE(COALESCE(col, ''), '\D', '', 'g'), 10)
-- Without these expression indexes every phone lookup is a full-table
-- regex scan — a latency + enumeration-throughput problem as orders grows.
-- The expressions below must stay byte-identical to the query in
-- src/app/api/v1/crm/lookup/route.ts.

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone_last10
  ON orders (RIGHT(REGEXP_REPLACE(COALESCE(customer_phone, ''), '\D', '', 'g'), 10));

CREATE INDEX IF NOT EXISTS idx_orders_delivery_phone_last10
  ON orders (RIGHT(REGEXP_REPLACE(COALESCE(delivery_phone, ''), '\D', '', 'g'), 10));
