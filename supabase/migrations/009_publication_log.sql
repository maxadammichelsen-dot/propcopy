CREATE TABLE publication_log (
  id           uuid primary key default uuid_generate_v4(),
  object_id    uuid references objects(id) on delete cascade,
  agency_id    uuid references agencies(id) on delete cascade,
  channel      text not null,
  published_at timestamptz default now(),
  status       text not null default 'success',
  external_id  text,
  note         text
);

ALTER TABLE publication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency owns its logs"
ON publication_log FOR ALL USING (
  agency_id IN (
    SELECT id FROM agencies WHERE user_id = auth.uid()
  )
);

CREATE INDEX publication_log_object_idx ON publication_log(object_id);
CREATE INDEX publication_log_agency_idx ON publication_log(agency_id, published_at DESC);
