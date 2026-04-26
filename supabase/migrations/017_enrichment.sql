CREATE TABLE IF NOT EXISTS object_enrichment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  source text NOT NULL,
  data jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(object_id, source)
);

CREATE INDEX IF NOT EXISTS idx_enrichment_object ON object_enrichment(object_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_source ON object_enrichment(source);

ALTER TABLE objects
ADD COLUMN IF NOT EXISTS enabled_enrichment_facts text[] DEFAULT '{}';
