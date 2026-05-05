import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { ImageObservationUpdate } from '@/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json() as ImageObservationUpdate

    if (!body.status && body.value === undefined) {
      return NextResponse.json({ error: 'status eller value krävs' }, { status: 400 })
    }

    const update: Record<string, unknown> = {}

    if (body.status) {
      update.status = body.status
      if (body.status === 'confirmed') {
        update.confirmed_by = user.id
        update.confirmed_at = new Date().toISOString()
      } else {
        // rejected — clear any previous confirmation
        update.confirmed_by = null
        update.confirmed_at = null
      }
    }

    if (body.value !== undefined) {
      update.value = body.value
    }

    // User client — RLS policy image_observations_own enforces ownership
    const { data: observation, error: updateError } = await supabase
      .from('image_observations')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Observation hittades inte' }, { status: 404 })
      }
      throw new Error(updateError.message)
    }

    return NextResponse.json({ observation })
  } catch (err) {
    console.error('[/api/image-observations/[id]]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
