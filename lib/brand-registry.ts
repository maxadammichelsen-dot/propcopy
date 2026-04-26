export interface BrandCategory {
  label: string
  options: string[]
}

export const BRAND_REGISTRY: Record<string, BrandCategory> = {
  kitchen: {
    label: 'Kök',
    options: [
      'SieMatic',
      'Bulthaup',
      'Poggenpohl',
      'Boffi',
      'Vipp',
      'Marbodal',
      'Kvänum',
      'Ballingslöv',
      'Nordiska Kök',
      'A-kök',
      'Drømmekjøkkenet',
      'snickeritillverkat platsbyggt',
      'köksö',
      'Silestone-bänkskiva',
      'bänkskiva i massiv valnöt',
      'bänkskiva i massiv marmor',
      'Quooker',
    ],
  },
  appliances: {
    label: 'Vitvaror',
    options: [
      'Gaggenau',
      'Miele',
      'Wolf',
      'Sub-Zero',
      'Fisher & Paykel',
      'AEG',
      'Siemens',
      'Bosch',
      'Smeg',
      'Liebherr',
      'Asko',
      'Quooker',
      'Franke',
      'Neff',
      'V-Zug',
    ],
  },
  flooring: {
    label: 'Golv & ytor',
    options: [
      'Berg & Berg ekparkett',
      'Kährs ekparkett',
      'Tarkett',
      'Bjelin',
      'Junckers',
      'massiv ek',
      'massiv valnöt',
      'massiv ask',
      'kalksten',
      'travertin',
      'marmor',
      'klinker storformat',
      'mikrocement',
      'gjuten betong',
      'flerfältparkett',
      'natursten',
    ],
  },
  windows: {
    label: 'Fönster',
    options: [
      'Welfac',
      'Velfac',
      'Schüco',
      'Elitfönster',
      'NorDan',
      'SP Fönster',
      'aluminiumbeklädda',
      'specialtillverkade',
      'tre-glas isolerruta',
      'fönster golvhöjd',
      'takfönster',
    ],
  },
  bathroom: {
    label: 'Bad',
    options: [
      'Vola',
      'Dornbracht',
      'Tapwell',
      'Hansgrohe',
      'Duravit',
      'Catalano',
      'Villeroy & Boch',
      'Axor',
      'italiensk marmor',
      'travertin',
      'mikrocement',
      'kalksten',
      'golvvärme',
      'inbyggd belysning',
      'fritstående badkar',
      'regndusch',
      'ångbastu',
    ],
  },
  architect: {
    label: 'Arkitekt',
    options: [],
  },
  builder: {
    label: 'Byggbolag',
    options: [],
  },
  custom: {
    label: 'Övrigt',
    options: [],
  },
}

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(BRAND_REGISTRY).map(([k, v]) => [k, v.label])
)
