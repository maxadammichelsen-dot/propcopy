import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('agency_id').eq('id', user.id).single()

    const { object_id, recipients, subject, body } = await req.json()

    if (!recipients || !subject || !body) {
      return NextResponse.json({ error: 'Mottagare, ämnesrad och brödtext krävs' }, { status: 400 })
    }

    const recipientList: string[] = (recipients as string)
      .split(',')
      .map((r: string) => r.trim())
      .filter(Boolean)

    if (recipientList.length === 0) {
      return NextResponse.json({ error: 'Inga giltiga e-postadresser' }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'E-posttjänst ej konfigurerad (RESEND_API_KEY saknas)' }, { status: 500 })
    }

    const { data: agency } = await supabase
      .from('agencies')
      .select('name, contact_email')
      .eq('id', profile?.agency_id ?? '')
      .single()

    const fromName  = agency?.name ?? 'Estatio'
    const fromEmail = agency?.contact_email ?? 'noreply@estatio.se'

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${fromName} <${fromEmail}>`,
        to:      recipientList,
        subject,
        text:    body,
      }),
    })

    const resData = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: resData.message ?? 'Fel vid e-postsändning' }, { status: 502 })
    }

    // Log publication
    if (profile?.agency_id && object_id) {
      const admin = createSupabaseAdminClient()
      await admin.from('publication_log').insert({
        object_id,
        agency_id:   profile.agency_id,
        channel:     'email',
        status:      'success',
        external_id: resData.id ?? null,
        note:        `Skickat till ${recipientList.length} mottagare`,
      })
    }

    return NextResponse.json({ ok: true, sent_to: recipientList.length, id: resData.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
