# Importers

Adapter-mönster för att ta in objektdata från olika källor (PDF-prospekt, Vitec API, Mspecs API, etc.) och normalisera till `PropertyObject`-fält.

## Användning

```ts
import { getImporter } from '@/lib/importers'

const importer = getImporter('pdf')
const result = await importer.extract(file)
// result: { fields: Partial<PropertyObject>, confidence: Record<string, number>, source: string }
```

## Lägga till en ny importer

1. Skapa `lib/importers/<name>-importer.ts` med en klass som implementerar `PropertyImporter`.
2. Registrera den i `REGISTRY` i `lib/importers/index.ts`.
3. Returnera fält i kanonisk `PropertyObject`-form (engelska fältnamn). Importer-specifik mappning från källans vokabulär görs internt i adaptern.

## Status

| Source | State |
|--------|-------|
| `pdf` | **Mock** — returnerar fast testdata. Ersätts med Claude vision-extraktion i PR 2b när vi har riktig Vitec-PDF att kalibrera mot. |
| `vitec-api` | Inte implementerad |
| `mspecs-api` | Inte implementerad |

## Konventioner

- `fields` använder kanoniska engelska fältnamn från `PropertyObject` (`address`, `size`, `monthly_fee`, …) — inte källans språk.
- `confidence` är ett tal mellan 0 och 1 per fält. Saknas konfidens — utelämna nyckeln.
- `source` är en kort identifierare (t.ex. `pdf-mock`, `pdf-claude-vision-v1`, `vitec-api-v3`) som sparas i `objects.import_source`.
