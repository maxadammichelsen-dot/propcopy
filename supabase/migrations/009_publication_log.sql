-- Publication log for tracking all publish events

CREATE TABLE publication_log (
  id          uuid primary key default uuid_generate_v4(),
  object_id   uuid references objects(id) on delete cascade,
  agency_id   uuid references agencies(id) on delete cascade,
  channel     text not null,
  -- 'hemnet_copy', 'hemnet_vitec', 'meta_organic', 'meta_ad', 'email'
  status      text not null default 'success',
  -- 'success', 'failed', 'scheduled'
  external_id text,
  note        text,
  published_at timestamptz default now()
);

ALTER TABLE publication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pub_log_own" ON publication_log
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM users WHERE id = auth.uid()
    )
  );

CREATE INDEX publication_log_object_idx ON publication_log(object_id);
CREATE INDEX publication_log_agency_idx ON publication_log(agency_id, published_at DESC);
