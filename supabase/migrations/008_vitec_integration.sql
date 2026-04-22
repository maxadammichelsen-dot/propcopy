-- Vitec integration fields

ALTER TABLE objects
  ADD COLUMN IF NOT EXISTS vitec_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Index for deduplication check
CREATE INDEX IF NOT EXISTS objects_vitec_id_idx ON objects(vitec_id) WHERE vitec_id IS NOT NULL;

-- Vitec Basic Auth credentials + customer ID stored on agencies
-- vitec_username: Vitec Express username
-- vitec_password: Vitec Express password
-- vitec_customer_id: numerical customer/office ID
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS vitec_username    text,
  ADD COLUMN IF NOT EXISTS vitec_password    text,
  ADD COLUMN IF NOT EXISTS vitec_customer_id text;
