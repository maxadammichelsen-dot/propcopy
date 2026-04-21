-- Meta integration columns on agencies
alter table agencies
  add column if not exists meta_access_token    text,
  add column if not exists meta_page_id         text,
  add column if not exists instagram_account_id text,
  add column if not exists social_tone_profile  jsonb;

-- Scheduled social posts
create table if not exists scheduled_posts (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid references agencies(id) on delete cascade,
  object_id     uuid references objects(id) on delete set null,
  platform      text not null check (platform in ('facebook', 'instagram', 'both')),
  content       text,
  media_urls    text[],
  scheduled_for timestamptz,
  published_at  timestamptz,
  meta_post_id  text,
  status        text not null default 'scheduled'
                  check (status in ('scheduled', 'published', 'failed', 'cancelled')),
  created_at    timestamptz not null default now()
);
alter table scheduled_posts enable row level security;
drop policy if exists "Agency owns its scheduled posts" on scheduled_posts;
create policy "Agency owns its scheduled posts"
  on scheduled_posts for all
  using (agency_id in (select id from agencies where user_id = auth.uid()))
  with check (agency_id in (select id from agencies where user_id = auth.uid()));
create index if not exists scheduled_posts_agency_idx on scheduled_posts(agency_id);
create index if not exists scheduled_posts_status_idx on scheduled_posts(agency_id, status);
