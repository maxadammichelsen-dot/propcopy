-- 022_market_intelligence.sql
-- Marknadsdata från Värderingsdata Intagsrapport.
-- Skalära fält lagras direkt på objects; jämförbara och till-salu i egna tabeller.

ALTER TABLE objects
  ADD COLUMN IF NOT EXISTS bedomt_marknadsvarde INTEGER,
  ADD COLUMN IF NOT EXISTS bedomt_marknadsvarde_kr_per_kvm INTEGER,
  ADD COLUMN IF NOT EXISTS statistisk_tillforlitlighet TEXT
    CHECK (statistisk_tillforlitlighet IN ('god', 'normal', 'lag')),
  ADD COLUMN IF NOT EXISTS prisutveckling_3m NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS prisutveckling_6m NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS prisutveckling_12m NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS prisutveckling_24m NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS snitt_annonseringstid_dagar INTEGER,
  ADD COLUMN IF NOT EXISTS marknadsdata_kalla TEXT,
  ADD COLUMN IF NOT EXISTS marknadsdata_extraherad_at TIMESTAMPTZ;

-- Jämförbara försäljningar i området (ur Värderingsdata Intagsrapport)
CREATE TABLE IF NOT EXISTS comparable_sales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id      UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  adress         TEXT NOT NULL,
  forsaljningsdatum DATE NOT NULL,
  pris_kr        INTEGER NOT NULL,
  pris_idag_kr   INTEGER,
  boyta          INTEGER,
  biyta          INTEGER,
  tomt_kvm       INTEGER,
  byggar         INTEGER,
  kr_per_kvm     INTEGER,
  taxvarde_kr    INTEGER,
  kt_faktor      NUMERIC(4,2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aktuella objekt till salu i området (ur Värderingsdata Intagsrapport)
CREATE TABLE IF NOT EXISTS listings_for_sale_in_area (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id      UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  adress         TEXT NOT NULL,
  utgangspris_kr INTEGER NOT NULL,
  kr_per_kvm     INTEGER,
  boyta          INTEGER,
  antal_rum      INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE comparable_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings_for_sale_in_area ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comparable_sales_read_own" ON comparable_sales
  FOR SELECT USING (
    object_id IN (
      SELECT o.id FROM objects o
      JOIN agencies a ON a.id = o.agency_id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "listings_read_own" ON listings_for_sale_in_area
  FOR SELECT USING (
    object_id IN (
      SELECT o.id FROM objects o
      JOIN agencies a ON a.id = o.agency_id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS comparable_sales_object_id_idx ON comparable_sales(object_id);
CREATE INDEX IF NOT EXISTS listings_for_sale_object_id_idx ON listings_for_sale_in_area(object_id);
