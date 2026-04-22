-- Vitec integration fields

ALTER TABLE objects
  ADD COLUMN IF NOT EXISTS vitec_id text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Index for deduplication check
CREATE INDEX IF NOT EXISTS objects_vitec_id_idx ON objects(vitec_id) WHERE vitec_id IS NOT NULL;

-- Encrypted API credentials stored on agencies
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS vitec_api_key text,
  ADD COLUMN IF NOT EXISTS vitec_customer_id text;
