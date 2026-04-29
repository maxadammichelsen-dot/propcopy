-- PR 1/3: Förbereder objects-tabellen för PDF-import (PR 2 lägger till själva importen).
-- Alla kolumner är NULLable och idempotent (IF NOT EXISTS) — inga befintliga flöden påverkas.
--
-- Notera: PDF-importern (PR 2) skriver till befintliga engelska fält
-- (monthly_fee, construction_year, parking, plot_area, tenure, heating,
-- operating_cost_yearly) för data som redan finns i schemat. Endast genuint
-- nya fält adderas i denna migration.

ALTER TABLE objects
ADD COLUMN IF NOT EXISTS vaning text,
ADD COLUMN IF NOT EXISTS antal_vaningar integer,
ADD COLUMN IF NOT EXISTS lagenhetsnummer text,
ADD COLUMN IF NOT EXISTS balkong boolean,
ADD COLUMN IF NOT EXISTS balkong_orientering text,
ADD COLUMN IF NOT EXISTS oppen_spis boolean,
ADD COLUMN IF NOT EXISTS antal_badrum integer,
ADD COLUMN IF NOT EXISTS antal_wc integer,
ADD COLUMN IF NOT EXISTS tvattstuga text,
ADD COLUMN IF NOT EXISTS hiss boolean,
ADD COLUMN IF NOT EXISTS forrad text,
ADD COLUMN IF NOT EXISTS fastighetsbeteckning text,
ADD COLUMN IF NOT EXISTS tomt_form text,
ADD COLUMN IF NOT EXISTS byggnadsmaterial text,
ADD COLUMN IF NOT EXISTS import_source text,
ADD COLUMN IF NOT EXISTS import_confidence jsonb;
