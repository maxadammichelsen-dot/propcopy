-- 019_image_observations.sql
-- Bildanalys med confidence-baserade kandidat-observationer.
-- Mäklaren bekräftar manuellt; bekräftade observationer går in i texter.
--
-- RLS inkluderat från start (lärdom från 017_enrichment.sql som saknade policy).
-- Server-side skrivningar (Claude vision-persist) använder service-role och
-- bypassar RLS automatiskt. Läsningar för UI använder anon-klient och träffar
-- image_observations_own-policyn nedan.

CREATE TABLE image_observations (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id       UUID         NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  image_url       TEXT         NOT NULL,
  room_type       TEXT,
  observation_type TEXT        NOT NULL,
  value           TEXT         NOT NULL,
  confidence      DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status          TEXT         NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'confirmed', 'rejected')),
  confirmed_by    UUID         REFERENCES auth.users(id),
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_observations_object
  ON image_observations(object_id);

CREATE INDEX idx_image_observations_object_status
  ON image_observations(object_id, status);

ALTER TABLE image_observations ENABLE ROW LEVEL SECURITY;

-- Mäklaren ser och hanterar ENDAST sina egna objekts observationer.
CREATE POLICY image_observations_own ON image_observations
  FOR ALL
  USING (
    object_id IN (
      SELECT objects.id
      FROM   objects
      JOIN   agencies ON agencies.id = objects.agency_id
      WHERE  agencies.user_id = auth.uid()
    )
  );

COMMENT ON TABLE image_observations IS
  'Kandidat-observationer från Claude vision per bild. '
  'Mäklaren bekräftar/avvisar via UI (PR 2). '
  'Bekräftade (status=confirmed) injiceras i CONFIRMED_OBSERVATIONS-blocket '
  'i content-generator och är den enda källan för material-/inredningsfakta i genererad text.';
