import type { ImportResult, PropertyImporter } from './types'

// TODO(PR 2b): Ersätt denna mock med riktig Claude vision-extraktion när vi har
// en Vitec/Mspecs-PDF att testa mot. Mocken returnerar realistisk struktur så
// att API-endpointen och konsumenter kan utvecklas och testas mot stabilt
// kontrakt.
export class PdfImporter implements PropertyImporter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async extract(_file: File | Buffer): Promise<ImportResult> {
    return {
      fields: {
        address: 'Lilla Bergsgatan 3, Vasastaden',
        size: 147.5,
        bedrooms: '4',
        vaning: '2 av 6',
        construction_year: 1965,
        monthly_fee: 5800,
      },
      confidence: {
        address: 0.95,
        size: 0.92,
        bedrooms: 0.88,
        vaning: 0.75,
        construction_year: 0.85,
        monthly_fee: 0.78,
      },
      source: 'pdf-mock',
    }
  }
}
