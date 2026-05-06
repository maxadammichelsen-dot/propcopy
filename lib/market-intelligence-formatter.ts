import type { MarketIntelligence } from '@/types'

function fmt(n: number): string {
  return new Intl.NumberFormat('sv-SE').format(n)
}

function fmtPct(n: number): string {
  const pct = (n * 100).toFixed(1).replace('.', ',').replace(/,0$/, '')
  return n >= 0 ? `+${pct}%` : `${pct}%`
}

export function formatMarketIntelligenceForPrompt(data: MarketIntelligence): string {
  if (!data.bedomt_marknadsvarde && data.jamforbara_forsaljningar.length === 0) {
    return ''
  }

  const lines: string[] = ['MARKNADSDATA (källa: Värderingsdata via Vitec):']

  if (data.bedomt_marknadsvarde) {
    const kr = data.bedomt_marknadsvarde
    const millions = kr >= 1_000_000
      ? `${(kr / 1_000_000).toFixed(kr % 1_000_000 === 0 ? 0 : 1).replace('.', ',')} miljoner kronor`
      : `${fmt(kr)} kr`
    const perKvm = data.bedomt_marknadsvarde_kr_per_kvm
      ? ` (${fmt(data.bedomt_marknadsvarde_kr_per_kvm)} kr/kvm)`
      : ''
    lines.push(`- Bedömt marknadsvärde: ${millions}${perKvm}`)
  }

  if (data.statistisk_tillforlitlighet) {
    const labels: Record<string, string> = {
      god: 'god',
      normal: 'normal',
      lag: 'låg (få jämförbara försäljningar i området)',
    }
    lines.push(`- Statistisk tillförlitlighet: ${labels[data.statistisk_tillforlitlighet]}`)
  }

  const pcts: string[] = []
  if (data.prisutveckling_3m !== undefined) pcts.push(`3 mån: ${fmtPct(data.prisutveckling_3m)}`)
  if (data.prisutveckling_6m !== undefined) pcts.push(`6 mån: ${fmtPct(data.prisutveckling_6m)}`)
  if (data.prisutveckling_12m !== undefined) pcts.push(`12 mån: ${fmtPct(data.prisutveckling_12m)}`)
  if (data.prisutveckling_24m !== undefined) pcts.push(`24 mån: ${fmtPct(data.prisutveckling_24m)}`)
  if (pcts.length > 0) {
    lines.push(`- Prisutveckling i området: ${pcts.join(' | ')}`)
  }

  if (data.snitt_annonseringstid_dagar !== undefined) {
    lines.push(`- Genomsnittlig annonseringstid i området: ${data.snitt_annonseringstid_dagar} dagar`)
  }

  if (data.jamforbara_forsaljningar.length > 0) {
    lines.push(`- Antal jämförbara försäljningar i underlag: ${data.jamforbara_forsaljningar.length}`)
  }

  if (data.till_salu_i_omradet.length > 0) {
    lines.push(`- Aktuella objekt till salu i området: ${data.till_salu_i_omradet.length}`)
  }

  const tillforlitlighet = data.statistisk_tillforlitlighet
  const reliabilityNote = tillforlitlighet === 'lag'
    ? '\n\nREGEL: Statistisk tillförlitlighet är låg — formulera bedömt värde som "bedömt till" eller "värderat till", ALDRIG som "värt" eller "marknadsvärdet är".'
    : ''

  return (
    '\n\n' + lines.join('\n') +
    '\n\nREGEL: Använd dessa siffror EXAKT som de står om de nämns i texten. ' +
    'Ange Värderingsdata som källa om bedömt marknadsvärde inkluderas. ' +
    'Ange alltid tidsspann vid prisutveckling (t.ex. "+11% senaste 24 månader").' +
    reliabilityNote
  )
}

export function formatMarketConfirmationCard(data: MarketIntelligence): {
  title: string
  rows: { label: string; value: string }[]
} {
  const rows: { label: string; value: string }[] = []

  if (data.bedomt_marknadsvarde) {
    const v = fmt(data.bedomt_marknadsvarde)
    const kvm = data.bedomt_marknadsvarde_kr_per_kvm
      ? ` · ${fmt(data.bedomt_marknadsvarde_kr_per_kvm)} kr/kvm`
      : ''
    rows.push({ label: 'Bedömt marknadsvärde', value: `${v} kr${kvm}` })
  }

  if (data.statistisk_tillforlitlighet) {
    const labels: Record<string, string> = { god: 'God', normal: 'Normal', lag: 'Låg' }
    rows.push({ label: 'Statistisk tillförlitlighet', value: labels[data.statistisk_tillforlitlighet] })
  }

  if (data.prisutveckling_24m !== undefined) {
    rows.push({ label: 'Prisutveckling 24 mån', value: fmtPct(data.prisutveckling_24m) })
  } else if (data.prisutveckling_12m !== undefined) {
    rows.push({ label: 'Prisutveckling 12 mån', value: fmtPct(data.prisutveckling_12m) })
  }

  if (data.snitt_annonseringstid_dagar !== undefined) {
    rows.push({ label: 'Snitt annonseringstid', value: `${data.snitt_annonseringstid_dagar} dagar` })
  }

  if (data.jamforbara_forsaljningar.length > 0) {
    rows.push({ label: 'Jämförbara försäljningar', value: `${data.jamforbara_forsaljningar.length} st` })
  }

  if (data.till_salu_i_omradet.length > 0) {
    rows.push({ label: 'Till salu i området', value: `${data.till_salu_i_omradet.length} st` })
  }

  return { title: 'Intagsrapport — Värderingsdata', rows }
}
