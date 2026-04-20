export interface Agency {
  id: string
  name: string
  url: string
  tone_profile: ToneProfile | null
  brand_colors: BrandColors | null
  created_at: string
  user_id: string
}

export interface ToneProfile {
  tags: string[]
  agency_name: string
}

export interface BrandColors {
  primary?: string
  secondary?: string
  accent?: string
}

export interface PropertyObject {
  id: string
  agency_id: string
  address: string
  area: string
  type: string
  size: number
  price: number
  details: string
  status: 'draft' | 'active' | 'sold'
  created_at: string
}

export interface GeneratedContent {
  id: string
  object_id: string
  channel: Channel
  content: string
  char_count: number
  created_at: string
}

export type Channel = 'hemnet' | 'hemnet_raket' | 'meta' | 'mail' | 'website'

export interface GenerateResult {
  channel: Channel
  content: string
  char_count: number
}
