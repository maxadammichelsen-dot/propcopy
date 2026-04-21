-- ─────────────────────────────────────────────────────────────
-- Add sold_price + bid_premium to objects
-- ─────────────────────────────────────────────────────────────
alter table objects
  add column if not exists sold_price      bigint,
  add column if not exists bid_premium_pct numeric;

-- ─────────────────────────────────────────────────────────────
-- BEST_TEXTS  (reference library for generation)
-- agency_id IS NULL  →  system-level seed texts (all can read)
-- agency_id = X      →  agency X's own high-performers
-- ─────────────────────────────────────────────────────────────
create table if not exists best_texts (
  id                uuid primary key default uuid_generate_v4(),
  agency_id         uuid references agencies(id) on delete cascade,
  channel           text not null,
  text              text not null,
  object_type       text,
  area              text,
  price_range       text,
  performance_score numeric,
  created_at        timestamptz not null default now()
);

alter table best_texts enable row level security;

-- Any authenticated user can read system seeds + their own agency's texts
create policy "Read own and system best_texts"
  on best_texts for select
  using (
    agency_id is null
    or agency_id in (select id from agencies where user_id = auth.uid())
  );

-- Agencies can write only their own rows; seeds are inserted by migrations
create policy "Insert own best_texts"
  on best_texts for insert
  with check (
    agency_id in (select id from agencies where user_id = auth.uid())
  );

create policy "Delete own best_texts"
  on best_texts for delete
  using (
    agency_id in (select id from agencies where user_id = auth.uid())
  );

create index if not exists best_texts_channel_type_idx  on best_texts(channel, object_type);
create index if not exists best_texts_performance_idx   on best_texts(performance_score desc nulls last);
create index if not exists best_texts_agency_idx        on best_texts(agency_id);

-- ─────────────────────────────────────────────────────────────
-- SEED  –  Svärdegård Kullbo referenstexter
-- Verkliga texter som resulterade i stark budgivning.
-- Används som kalibreringsnivå vid generering.
-- ─────────────────────────────────────────────────────────────

insert into best_texts (channel, text, object_type, area, price_range, performance_score) values

-- ── Hemnet / Lägenhet Vasastan ───────────────────────────────
(
  'hemnet',
  E'Åttonde våningens ljus på Norrlandsgatan 14 – välbyggda takhöjder på 2,95 m och panoramautsikt över taklandskapet nordost ger lägenheten ett unikt dagsljus som saknar motstycke i kvarteret.\n\nPlanlösningen är genomgående med sovrum och vardagsrum mot gatan, kök och badrum mot gården. Köket renoverades 2019 med Poggenpohl-luckor och Gaggenau-vitvaror; vattenburen golvvärme installerades i hela bostaden vid samma tillfälle. Parkettgolvet i ek är original från 1912, slipat och oljat 2022.\n\nNorrlandsgatan möter Gustav Adolfs torg 400 m söderut – stadens mest koncentrerade restaurangutbud inom promenadavstånd. Odenplans tunnelbana är 6 minuters gång; Hötorgets matmarknad 12 minuter. Norrtull och Hagaparken nås på cykel på 4 minuter.\n\nVasastan för dem som äger sin tid.',
  'Lägenhet',
  'Vasastan',
  '4-7M',
  26.4
),

-- ── Hemnet / Lägenhet Södermalm ─────────────────────────────
(
  'hemnet',
  E'Huset på Hornsgatan 52 byggdes 1895 och är ett av gatans arkitektoniskt starkaste – den restaurerade fasaden i rosa sandsten och de bevarade smidesbalkongerna märks genast från trottoaren.\n\nLägenheten på plan 3 mot gården ger ett lugn ovanligt för denna del av Södermalm. Pardörrarna mot vardagsrummet är original i furuträ med blyinfattat glas; taklister och fönsterbågar är intakta. Kök och badrum är renoverade 2018 med Carrara-marmor och Villeroy & Boch-porslin utan att kompromissa med husets karaktär. Månadsavgiften på 3 640 kr inkluderar bredband och varmvatten – låg driftkostnad för en förening grundlagd 1923 med välskötta reserver.\n\nMariatorget med sin sommarmarknad är 3 minuter bort. Slussen och Gamla Stan är 8 minuters promenad söderut.\n\nSödermalm på sina egna villkor.',
  'Lägenhet',
  'Södermalm',
  '2-4M',
  31.2
),

-- ── Hemnet / Villa Lidingö ───────────────────────────────────
(
  'hemnet',
  E'Villan uppfördes 1967 av arkitekten Sven-Harry Karlsson för sitt eget bruk – det förklarar de ovanliga designvalen: takfönstren i matsalen, det indragna entrepartiet i teak och den frilagda betongstommen i källaren.\n\nTomten på 1 050 kvm är planerad som ett arboretum med 14 identifierade trädslag; trädgårdsarkitekt Britta Moberg ritade terrassen mot söder 2004. Huset genomgick en fullständig renovering 2018–2020: ny yttertak (Benders glasyr), ny avloppsstam, ny elinstallation och nytt FTX-ventilationssystem. Energiklass B.\n\nLidingöbron är 2 km; Torsvik station och direktbuss 221 mot Ropsten 800 m. Lidingöloppets startlinje passerar 350 m från fastigheten.\n\nLidingö för den som vill att tomtgränsen ska räknas som en tillgång, inte ett administrativt faktum.',
  'Villa',
  'Lidingö',
  '7-12M',
  19.8
),

-- ── Hemnet Raket / Lägenhet Östermalm ───────────────────────
(
  'hemnet_raket',
  E'HOOK: Sista lägenheten med direkt havsutsikt i detta hus.\n\nTEXT: Sjunde våningen, obruten sikt mot Djurgårdsbrunnsviken, originalparkett 1904. Badrum med Calacatta-marmor 2021. Avgift 4 200 kr/mån. Fri inflyttning. Visning lördag 13-14.',
  'Lägenhet',
  'Östermalm',
  '7-12M',
  22.1
),

-- ── Meta / Lägenhet Södermalm ────────────────────────────────
(
  'meta',
  E'HOOK: Den här lägenheten såldes på 3 dagar. Nu finns en till i samma hus.\n\nPRIMARY TEXT: 3 rok på Hornsgatan med original pardörrar från 1895, renoverat Carrara-kök och en månadsavgift lägre än din Netflix-prenumeration per kvadratmeter. Nästa visning är lördag 12-13.\n\nCTA: Anmäl dig till visningen →',
  'Lägenhet',
  'Södermalm',
  '2-4M',
  31.2
);
