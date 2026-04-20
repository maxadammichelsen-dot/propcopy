'use client'

import { Agency } from '@/types'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

interface TopbarProps {
  agency: Agency | null
}

export default function Topbar({ agency }: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="h-16 border-b border-[#2a2a2a] flex items-center justify-between px-6 bg-[#111111] shrink-0">
      <div className="flex items-center gap-4">
        <span className="font-serif text-xl text-[#f0ece4] tracking-tight">
          {agency?.name ?? 'PropCopy'}
        </span>

        {agency?.tone_profile?.tags && (
          <div className="hidden md:flex items-center gap-2 ml-2">
            {agency.tone_profile.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-widest text-[#b8965a] border border-[#b8965a33] rounded-full px-2.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-[#555]">PropCopy</span>
        <button
          onClick={handleLogout}
          className="text-xs text-[#555] hover:text-[#b8965a] transition-colors"
        >
          Logga ut
        </button>
      </div>
    </header>
  )
}
