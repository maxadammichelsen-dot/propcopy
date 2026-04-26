export const CHANNEL_OPTIMIZATION = {
  hemnet: {
    psychology: 'Köparen är i aktivt köpläge och scannar snabbt. De jämför 10-20 objekt. Du har 3 sekunder på första meningen att skilja dig från mängden. Specifika detaljer skapar trovärdighet, generiska adjektiv skapar skepsis.',
    what_works: 'Öppna med starkaste konkreta detaljen. Namnge material, arkitekter, årtal, riktningar. Beskriv hur livet ser ut. Hantera invändningar proaktivt. Avsluta med en mening som stannar kvar.',
    what_fails: 'Välkommen till. Generiska fraser som fantastisk, underbar, unik. Uppmaningar att boka visning i texten. Upprepning av fakta som redan syns i annonsen.',
    format: 'Rubrik max 75 tecken, ingen punkt. Säljtext 1500-1875 tecken, löptext, 4 stycken med tydliga syften.',
    example_opening: 'BRA: "Tredje våningen utan hiss. Öppet upp till nock. Postmästaren bodde här från 1936." DÅLIG: "Välkommen till denna charmiga lägenhet i populära området."',
  },
  meta: {
    psychology: 'Köparen är INTE i köpläge. De scrollar. Du har 1-3 sekunder att stoppa scrollet. Livsstil och känsla presterar bättre än faktauppräkning. En CTA per annons.',
    what_works: 'Hook: provocerande fråga eller oväntat påstående. Brödtext: expandera hooken med konkret detalj, visa livsstilen, en tydlig CTA i sista meningen.',
    what_fails: 'Starta med kvm/rum/pris. Generiska rubriker som Drömlägenhet till salu. Flera CTA i samma annons.',
    meta_compliance: 'Meta Housing Policy: undvik perfekt-för-familjer, barnvänligt, specifika målgrupper. Fokusera på egenskaper, läge, livsstil. Neutralt och inkluderande språk.',
    format: 'Hook max 125 tecken. Primary text max 438 tecken. Headline max 40 tecken.',
  },
  email: {
    psychology: 'Mottagaren har visat intresse men inte bestämt sig. Personligt tilltal bygger relation. Ska kännas som tips från en vän som råkar vara expert. Ämnesraden avgör om mailet öppnas.',
    what_works: 'Ämnesrad: personlig och specifik, inte säljig, under 50 tecken. Brödtext: börja med Hej [namn], en anledning varför just detta objekt, max 3 stycken, tydlig uppmaning sist, vänlig signatur.',
    format: 'Ämnesrad max 50 tecken. Brödtext 150-300 ord. Ton: personlig, varm, expert.',
  },
  social_organic: {
    psychology: 'Följaren är där för innehåll, inte annonser. Berättelse slår säljbudskap. Behind-the-scenes och autentiska ögonblick fungerar bäst. Bygger varumärke över tid.',
    what_works: 'Personlig öppning. En konkret detalj som väcker nyfikenhet. Fråga till följaren i slutet skapar engagemang. Hashtags relevanta och specifika.',
    what_fails: 'Aggressiva säljbudskap. Generiska hashtags som drömhem och mäklare. Att låta som en annons istället för en person.',
    format: 'Max 2200 tecken. Hashtags 5-10 i slutet. Inkludera lokal hashtag plus objekttyp plus känsla.',
  },
}

export function getChannelOptimization(channel: string): string {
  const opt = CHANNEL_OPTIMIZATION[channel as keyof typeof CHANNEL_OPTIMIZATION]
  if (!opt) return ''

  const lines = [
    `KANALOPTIMERING FÖR ${channel.toUpperCase()}:`,
    '',
    `PSYKOLOGI: ${opt.psychology}`,
    '',
    `VAD SOM FUNGERAR: ${opt.what_works}`,
  ]

  const o = opt as Record<string, string>
  if (o.what_fails)      lines.push('', `VAD SOM MISSLYCKAS: ${o.what_fails}`)
  if (o.meta_compliance) lines.push('', `COMPLIANCE: ${o.meta_compliance}`)
  lines.push('', `FORMAT: ${opt.format}`)
  if (o.example_opening) lines.push('', `EXEMPEL: ${o.example_opening}`)

  return lines.join('\n')
}
