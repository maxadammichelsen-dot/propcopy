ALTER TABLE objects
ADD COLUMN IF NOT EXISTS brands jsonb DEFAULT '{}'::jsonb;
