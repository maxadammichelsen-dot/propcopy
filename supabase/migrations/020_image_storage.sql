-- 020_image_storage.sql
-- Storage-bucket för objektbilder.
-- Server-side upload via service-role; mäklare läser egna bilder via RLS.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'object-images',
  'object-images',
  false,
  10485760,  -- 10 MB per fil
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Mäklare kan läsa bilder för sina egna objekt.
-- Path-konvention: <object_id>/<uuid>.jpg — första mappen är object_id.
-- INSERT/UPDATE/DELETE enbart via service-role (server-side); inga policies för dem.
CREATE POLICY "object_images_read_own"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'object-images'
  AND (storage.foldername(name))[1] IN (
    SELECT objects.id::text
    FROM   objects
    JOIN   agencies ON agencies.id = objects.agency_id
    WHERE  agencies.user_id = auth.uid()
  )
);
