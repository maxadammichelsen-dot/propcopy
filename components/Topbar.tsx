'use client'

import Image from 'next/image'
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

  const hasBranding = !!(agency?.logo_url || agency?.brand_colors?.primary)

  return (
    <header className="h-16 border-b border-[#2a2a2a] flex items-center justify-between px-6 bg-[#111111] shrink-0">
      {/* Left: logo or agency name */}
      <div className="flex items-center gap-4">
        {agency?.logo_url ? (
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-32">
              <Image
                src={agency.logo_url}
                alt={agency.name}
                fill
                className="object-contain object-left"
                unoptimized
              />
            </div>
            {/* Small branding indicator dot */}
            {hasBranding && (
              <span
                className="w-1.5 h-1.5 rounded-full opacity-60"
                style={{ backgroundColor: 'var(--brand-primary, #b8965a)' }}
              />
            )}
          </div>
        ) : (
          <span className="font-serif text-xl text-[#f0ece4] tracking-tight">
            {agency?.name ?? 'PropCopy'}
          </span>
        )}

        {/* Tone tags */}
        {agency?.tone_profile?.tags && (
          <div className="hidden lg:flex items-center gap-1.5 ml-1">
            {agency.tone_profile.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 border"
                style={{
                  color: 'var(--brand-primary, #b8965a)',
                  borderColor: 'var(--brand-primary-dim, #b8965a33)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: PropCopy wordmark + logout */}
      <div className="flex items-center gap-4">
        {/* Brand color swatch – subtle visual indicator */}
        {agency?.brand_colors?.primary && (
          <div className="hidden sm:flex items-center gap-1">
            {[agency.brand_colors.primary, agency.brand_colors.secondary, agency.brand_colors.accent]
              .filter(Boolean)
              .map((color, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border border-[#ffffff11]"
                  style={{ backgroundColor: color! }}
                  title={color!}
                />
              ))}
          </div>
        )}
        <span className="text-[10px] uppercase tracking-widest text-[#333]">PropCopy</span>
        <button
          onClick={handleLogout}
          className="text-xs text-[#555] hover:text-[#f0ece4] transition-colors"
        >
          Logga ut
        </button>
      </div>
    </header>
  )
}
