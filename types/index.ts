export interface SocialToneProfile {
  tone_tags: string[]
  voice: string
  hashtags: string[]
  keywords: string[]
  formats: string[]
  style_notes: string
}

export interface Agency {
  id: string
  name: string
  url: string
  phone: string | null
  contact_email: string | null
  address: string | null
  tone_profile: ToneProfile | null
  brand_colors: BrandColors | null
  logo_url: string | null
  scraped_data: ScrapedData | null
  meta_access_token: string | null
  meta_page_id: string | null
  instagram_account_id: string | null
  social_tone_profile: SocialToneProfile | null
  created_at: string
  user_id: string
}

export interface ScrapedData {
  phone: string | null
  og_description: string | null
  agents: string[]
  scraped_at: string
}

export interface ToneProfile {
  tags: string[]
  agency_name: string
  examples?: string[]
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

export type Channel =
  | 'hemnet'
  | 'hemnet_raket'
  | 'meta'
  | 'mail'
  | 'website'
  | 'booli'
  | 'boneo'
  | 'boneo_kommande'
  | 'hjem'
  | 'bovision'

export interface GenerateResult {
  channel: Channel
  content: string
  char_count: number
}

export type LocationCategory =
  | 'transport'
  | 'nature'
  | 'education'
  | 'shopping'
  | 'view'
  | 'recreation'
  | 'other'

export interface LocationArgument {
  id: string
  icon: string
  text: string
  category: LocationCategory
  source: string
}

export interface DashboardStats {
  active_objects: number
  avg_days_on_market: number
  needs_action: number
  texts_this_month: number
}

export interface ObjectHealth {
  id: string
  address: string
  area: string
  status: 'draft' | 'active' | 'sold'
  health_score: number
  days_on_market: number
  issues: string[]
}

export interface ActionItem {
  id: string
  priority: 'high' | 'medium' | 'low'
  icon: string
  title: string
  description: string
  object_id?: string
}

export interface KeyInsightStrength {
  argument: string
  why: string
}

export interface KeyInsightRisk {
  issue: string
  how_to_handle: string
}

export interface KeyInsights {
  strengths: KeyInsightStrength[]
  risks: KeyInsightRisk[]
  positioning: string
}

export interface PerformancePoint {
  month: string
  texts_generated: number
}

export interface CompetitionAreaData {
  area: string
  refreshed_at: string
  market_count: number
  avg_price: number
  avg_days_on_market: number
  price_trend: 'rising' | 'stable' | 'falling'
  our_objects: {
    id: string
    address: string
    price: number
    size: number
    type: string
  }[]
  price_diff_pct: number | null
  listings: {
    address: string
    object_type: string
    price: number
    days_on_market: number
    competitor_agency: string
  }[]
  insight: string
}
