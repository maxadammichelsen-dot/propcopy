'use client'

import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient internally handles singleton per URL+key pair,
// so it's safe to call on every render.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
