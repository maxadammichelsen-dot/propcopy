import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getAnthropicClient, MODEL } from '@/lib/anthropic'

const SEVERITY_ORDER: Record<string, number> = { HÖG: 0, MEDEL: 1, LÅG: 2 }

const SYSTEM_PROMPT = `Du är en erfaren fastighetsmäklare och copywriter
som specialiserar sig på att maximera slutpris
genom stark kommunikation.

Analysera denna objektannons kritiskt. Identifiera:

RISKFAKTORER: Vad skapar osäkerhet eller oro
hos köparen? Vad kan aktivt sänka budgivningen?

POSITIONERING: Är objektets starkaste argument
tydligt? Vad särskiljer det från konkurrenter?

COPY-KVALITET: Vilka formuleringar är generiska,
defensiva eller svaga?

För varje problem:
- Förklara varför det är ett problem psykologiskt
- Ge ett konkret alternativ (omskriven version)
- Betygsätt allvarlighetsgrad: HÖG / MEDEL / LÅG

Avsluta med:
- Helhetsbetyg copy: X/10
- Helhetsbetyg strategi: X/10
- En mening om vad som avgör slutpriset mest

Svara som JSON med exakt denna struktur:
{
  "risks": [{
    "title": string,
    "problem": string,
    "psychology": string,
    "fix": string,
    "severity": "HÖG" | "MEDEL" | "LÅG"
  }],
  "positioning": {
    "strength": string,
    "weakness": string,
    "suggestion": string
  },
  "copy_score": number,
  "strategy_score": number,
  "verdict": string
}`

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { existing_text, object_id } = body as {
      existing_text: string
      object_id?: string
    }

    if (!existing_text?.trim()) {
      return NextResponse.json({ error: 'existing_text krävs' }, { status: 400 })
    }

    // Optionally fetch object context for comparison
    let objectContext = ''
    if (object_id) {
      const { data: obj } = await supabase
        .from('objects')
        .select('address, area, type, size, price')
        .eq('id', object_id)
        .eq('user_id', user.id)
        .single()

      if (obj) {
        objectContext = `\n\nObjektkontext (för jämförelse): ${obj.address}, ${obj.area} – ${obj.type} ${obj.size} kvm, ${new Intl.NumberFormat('sv-SE').format(obj.price)} kr. Inkludera fältet "estatio_advantage" i JSON:t med en mening om hur en AI-optimerad annons för detta objekt skulle prestera bättre.`
      }
    }

    const anthropic = getAnthropicClient()
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Annons att analysera:\n\n${existing_text.trim()}${objectContext}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = raw.match(/\{[\s\S]+\}/)
    if (!match) {
      console.error('[/api/revision] Unexpected Claude response:', raw)
      return NextResponse.json({ error: 'Kunde inte tolka analysen' }, { status: 500 })
    }

    const analysis = JSON.parse(match[0])

    if (Array.isArray(analysis.risks)) {
      analysis.risks.sort(
        (a: { severity: string }, b: { severity: string }) =>
          (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
      )
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('[/api/revision]', err)
    return NextResponse.json({ error: 'Serverfel' }, { status: 500 })
  }
}
