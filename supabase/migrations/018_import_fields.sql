-- PR 1/3: Förbereder objects-tabellen för PDF-import (PR 2 lägger till själva importen).
-- Alla kolumner är NULLable och idempotent (IF NOT EXISTS) — inga befintliga flöden påverkas.
-- Vissa fält överlappar engelsknamngivna kolumner (monthly_fee, operating_cost_yearly,
-- parking, construction_year, plot_area, tenure, heating) och kommer att konsolideras senare.

ALTER TABLE objects
ADD COLUMN IF NOT EXISTS vaning text,
ADD COLUMN IF NOT EXISTS antal_vaningar integer,
ADD COLUMN IF NOT EXISTS lagenhetsnummer text,
ADD COLUMN IF NOT EXISTS manadsavgift_kr integer,
ADD COLUMN IF NOT EXISTS driftkostnad_kr_ar integer,
ADD COLUMN IF NOT EXISTS balkong boolean,
ADD COLUMN IF NOT EXISTS balkong_orientering text,
ADD COLUMN IF NOT EXISTS oppen_spis boolean,
ADD COLUMN IF NOT EXISTS antal_badrum integer,
ADD COLUMN IF NOT EXISTS antal_wc integer,
ADD COLUMN IF NOT EXISTS tvattstuga text,
ADD COLUMN IF NOT EXISTS parkering text,
ADD COLUMN IF NOT EXISTS hiss boolean,
ADD COLUMN IF NOT EXISTS forrad text,
ADD COLUMN IF NOT EXISTS fastighetsbeteckning text,
ADD COLUMN IF NOT EXISTS byggar integer,
ADD COLUMN IF NOT EXISTS upplatelseform text,
ADD COLUMN IF NOT EXISTS tomt_area integer,
ADD COLUMN IF NOT EXISTS tomt_form text,
ADD COLUMN IF NOT EXISTS byggnadsmaterial text,
ADD COLUMN IF NOT EXISTS uppvarmning text,
ADD COLUMN IF NOT EXISTS import_source text,
ADD COLUMN IF NOT EXISTS import_confidence jsonb;
