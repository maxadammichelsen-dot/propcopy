-- Migrate mail → email and remove unused channels
UPDATE generated_content SET channel = 'email' WHERE channel = 'mail';

DELETE FROM generated_content
WHERE channel NOT IN ('hemnet', 'meta', 'email', 'social_organic');

-- Update channel check constraint
ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_channel_check;
ALTER TABLE generated_content
  ADD CONSTRAINT generated_content_channel_check
  CHECK (channel IN ('hemnet', 'meta', 'email', 'social_organic'));
