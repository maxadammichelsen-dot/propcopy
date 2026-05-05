import { createSupabaseAdminClient } from './supabase-admin'

const BUCKET = 'object-images'

/**
 * Uploads a base64 data-URL image to Storage under <objectId>/<uuid>.<ext>.
 * Uses service-role — bypasses RLS (same pattern as openstreetmap.ts persist).
 * Returns { storage_path, signed_url } where signed_url expires in 1 hour.
 */
export async function uploadObjectImage(
  objectId: string,
  dataUrl: string
): Promise<{ storage_path: string; signed_url: string }> {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid image data URL')

  const mimeType = match[1]
  const base64Data = match[2]
  const buffer = Buffer.from(base64Data, 'base64')

  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]
  const storage_path = `${objectId}/${crypto.randomUUID()}.${ext}`

  const admin = createSupabaseAdminClient()

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storage_path, buffer, { contentType: mimeType, upsert: false })

  if (uploadErr) {
    console.error('[storage] upload failed:', uploadErr)
    throw new Error(`Storage upload failed: ${uploadErr.message}`)
  }

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storage_path, 3600)

  if (!signed?.signedUrl) throw new Error('Could not create signed URL')

  return { storage_path, signed_url: signed.signedUrl }
}

export async function getSignedUrlForPath(storage_path: string): Promise<string | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(storage_path, 3600)
  return data?.signedUrl ?? null
}
