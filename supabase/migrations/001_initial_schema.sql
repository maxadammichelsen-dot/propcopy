-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- AGENCIES
-- ─────────────────────────────────────────
create table if not exists agencies (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  url         text not null,
  tone_profile jsonb,
  brand_colors jsonb,
  created_at  timestamptz not null default now()
);

alter table agencies enable row level security;

create policy "Users can manage their own agency"
  on agencies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- OBJECTS
-- ─────────────────────────────────────────
create table if not exists objects (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid not null references agencies(id) on delete cascade,
  address     text not null,
  area        text not null,
  type        text not null,
  size        numeric not null,
  price       bigint not null,
  details     text,
  status      text not null default 'draft' check (status in ('draft', 'active', 'sold')),
  created_at  timestamptz not null default now()
);

alter table objects enable row level security;

create policy "Users can manage objects for their agency"
  on objects for all
  using (
    agency_id in (
      select id from agencies where user_id = auth.uid()
    )
  )
  with check (
    agency_id in (
      select id from agencies where user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- GENERATED CONTENT
-- ─────────────────────────────────────────
create table if not exists generated_content (
  id          uuid primary key default uuid_generate_v4(),
  object_id   uuid not null references objects(id) on delete cascade,
  channel     text not null check (channel in ('hemnet', 'hemnet_raket', 'meta', 'mail', 'website')),
  content     text not null,
  char_count  integer not null,
  created_at  timestamptz not null default now()
);

alter table generated_content enable row level security;

create policy "Users can manage generated content for their objects"
  on generated_content for all
  using (
    object_id in (
      select o.id from objects o
      join agencies a on a.id = o.agency_id
      where a.user_id = auth.uid()
    )
  )
  with check (
    object_id in (
      select o.id from objects o
      join agencies a on a.id = o.agency_id
      where a.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index if not exists objects_agency_id_idx on objects(agency_id);
create index if not exists generated_content_object_id_idx on generated_content(object_id);
create index if not exists agencies_user_id_idx on agencies(user_id);
