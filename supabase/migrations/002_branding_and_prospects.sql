-- ─────────────────────────────────────────
-- STEG 1 – Lägg till branding-kolumner i agencies
-- ─────────────────────────────────────────
alter table agencies
  add column if not exists logo_url text,
  add column if not exists scraped_data jsonb;

-- ─────────────────────────────────────────
-- STEG 2–5 – Nya tabeller för dashboard,
-- konkurrensintelligens och spekulantspårning
-- ─────────────────────────────────────────

-- Prospect events (tracking pixel data)
create table if not exists prospect_events (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid references agencies(id) on delete cascade,
  object_id     uuid references objects(id) on delete set null,
  session_id    text,
  fingerprint_id text,
  email         text,
  event         text not null,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
alter table prospect_events enable row level security;
create policy "Agency owns its prospect events"
  on prospect_events for all
  using (agency_id in (select id from agencies where user_id = auth.uid()))
  with check (agency_id in (select id from agencies where user_id = auth.uid()));
create index if not exists prospect_events_agency_id_idx on prospect_events(agency_id);
create index if not exists prospect_events_session_idx on prospect_events(session_id);

-- Prospects (identified leads)
create table if not exists prospects (
  id              uuid primary key default uuid_generate_v4(),
  agency_id       uuid not null references agencies(id) on delete cascade,
  session_id      text,
  fingerprint_id  text,
  email           text,
  name            text,
  profile         jsonb,
  engagement_score integer not null default 0,
  status          text not null default 'cold' check (status in ('cold', 'warm', 'hot')),
  created_at      timestamptz not null default now()
);
alter table prospects enable row level security;
create policy "Agency owns its prospects"
  on prospects for all
  using (agency_id in (select id from agencies where user_id = auth.uid()))
  with check (agency_id in (select id from agencies where user_id = auth.uid()));
create index if not exists prospects_agency_id_idx on prospects(agency_id);

-- Prospect follow-up sequences
create table if not exists prospect_sequences (
  id            uuid primary key default uuid_generate_v4(),
  prospect_id   uuid not null references prospects(id) on delete cascade,
  step          integer not null,
  scheduled_for timestamptz,
  sent_at       timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  status        text not null default 'pending'
                  check (status in ('pending', 'sent', 'opened', 'clicked', 'cancelled'))
);
create index if not exists prospect_sequences_prospect_idx on prospect_sequences(prospect_id);

-- Competition data
create table if not exists competition_data (
  id                uuid primary key default uuid_generate_v4(),
  agency_id         uuid not null references agencies(id) on delete cascade,
  address           text,
  area              text not null,
  price             bigint,
  days_on_market    integer,
  competitor_agency text,
  object_type       text,
  scraped_at        timestamptz not null default now()
);
alter table competition_data enable row level security;
create policy "Agency owns its competition data"
  on competition_data for all
  using (agency_id in (select id from agencies where user_id = auth.uid()))
  with check (agency_id in (select id from agencies where user_id = auth.uid()));
create index if not exists competition_data_agency_area_idx on competition_data(agency_id, area);
