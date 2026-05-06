-- 021_image_category.sql
-- Lägg till bildkategori på image_observations.
-- 'property' = interiör/exteriör närbild, analyseras för material/särdrag.
-- 'overview'  = drönare/flygfoto, laddas upp men analyseras EJ.

ALTER TABLE image_observations
  ADD COLUMN IF NOT EXISTS image_category TEXT NOT NULL DEFAULT 'property'
  CHECK (image_category IN ('property', 'overview'));

COMMENT ON COLUMN image_observations.image_category IS
  'property = analyseras för material/särdrag. overview = laddas upp men ej analyserad.';
