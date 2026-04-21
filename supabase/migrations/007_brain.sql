-- Brain memory system for agency-specific learning

CREATE TABLE agency_brain (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid references agencies(id) on delete cascade,
  category text not null,
  -- 'tone', 'market', 'object_type', 'winning_text',
  -- 'area_insight', 'buyer_profile', 'feedback'
  key text not null,
  value text not null,
  confidence float default 0.5,
  source text not null default 'manual',
  -- 'manual', 'scraped', 'generated', 'feedback'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE generation_feedback (
  id uuid primary key default uuid_generate_v4(),
  agency_id uuid references agencies(id) on delete cascade,
  object_id uuid references objects(id) on delete cascade,
  channel text not null,
  generated_text text not null,
  action text not null, -- 'approved', 'rejected', 'edited'
  edited_version text,
  created_at timestamptz default now()
);

-- RLS
ALTER TABLE agency_brain ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_brain_own" ON agency_brain
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "generation_feedback_own" ON generation_feedback
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

-- Index for fast lookups
CREATE INDEX agency_brain_agency_id_idx ON agency_brain(agency_id);
CREATE INDEX agency_brain_category_idx ON agency_brain(agency_id, category);
CREATE INDEX generation_feedback_agency_id_idx ON generation_feedback(agency_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agency_brain_updated_at
  BEFORE UPDATE ON agency_brain
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
