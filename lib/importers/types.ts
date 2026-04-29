import type { PropertyObject } from '@/types'

export type ExtractedFields = Partial<PropertyObject>

export interface ImportResult {
  fields: ExtractedFields
  confidence: Record<string, number>
  source: string
}

export interface PropertyImporter {
  extract(file: File | Buffer): Promise<ImportResult>
}
