import { PdfImporter } from './pdf-importer'
import type { PropertyImporter } from './types'

export type { ExtractedFields, ImportResult, PropertyImporter } from './types'

const REGISTRY: Record<string, () => PropertyImporter> = {
  pdf: () => new PdfImporter(),
  // Future: 'vitec-api': () => new VitecApiImporter()
  // Future: 'mspecs-api': () => new MspecsApiImporter()
}

export function getImporter(source: string): PropertyImporter {
  const factory = REGISTRY[source]
  if (!factory) {
    throw new Error(`Unknown import source: ${source}. Known sources: ${Object.keys(REGISTRY).join(', ')}`)
  }
  return factory()
}
