import Anthropic from '@anthropic-ai/sdk'

export const MODEL = 'claude-sonnet-4-20250514'

// Lazy singleton – defers instantiation until first use so missing
// ANTHROPIC_API_KEY during build/module-load won't crash route registration
let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY saknas i miljövariabler')
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

// Keep named export for backwards compat – same lazy pattern
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return (getAnthropicClient() as any)[prop]
  },
})
