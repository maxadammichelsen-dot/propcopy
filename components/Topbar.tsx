'use client'

import { Agency } from '@/types'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

type View = 'home' | 'detail' | 'new' | 'tone' | 'competition' | 'prospects' | 'followup'

interface TopbarProps {
  agency: Agency | null
  currentView: View
  onHome: () => void
  onCompetition: () => void
  onProspects: () => void
  onFollowup: () => void
  onTone: () => void
}

type HandlerKey = 'onHome' | 'onCompetition' | 'onProspects' | 'onFollowup' | 'onTone'

const NAV: { label: string; views: View[]; action: HandlerKey }[] = [
  { label: 'Idag',        views: ['home'],          action: 'onHome' },
  { label: 'Objekt',      views: ['detail', 'new'], action: 'onHome' },
  { label: 'Spekulanter', views: ['prospects'],     action: 'onProspects' },
  { label: 'Uppföljning', views: ['followup'],      action: 'onFollowup' },
  { label: 'Tonalitet',   views: ['tone'],          action: 'onTone' },
  { label: 'Marknad',     views: ['competition'],   action: 'onCompetition' },
]

export default function Topbar({
  agency,
  currentView,
  onHome,
  onCompetition,
  onProspects,
  onFollowup,
  onTone,
}: TopbarProps) {
  const router = useRouter()
  const handlers = { onHome, onCompetition, onProspects, onFollowup, onTone }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = agency?.name
    ? agency.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : 'E'

  return (
    <header className="h-14 border-b border-line flex items-center px-6 gap-8 bg-bg shrink-0">

      {/* Logo */}
      <button onClick={onHome} className="estatio-logo shrink-0">
        <span className="part-estat text-[22px]">Estat</span>
        <span className="part-slash text-[15px]">/</span>
        <span className="part-io text-[15px]">io</span>
      </button>

      {/* Pill nav */}
      <nav className="flex-1 flex justify-center">
        <div className="flex gap-0.5 p-[3px] bg-tint rounded-full">
          {NAV.map(({ label, views, action }) => {
            const active = views.includes(currentView)
            return (
              <button
                key={label}
                onClick={handlers[action] as () => void}
                className={[
                  'px-4 py-[7px] rounded-full text-[13px] font-medium transition-all duration-150',
                  'leading-none tracking-normal',
                  active
                    ? 'bg-bg text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_var(--line)]'
                    : 'text-mute hover:text-ink-2',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Right: agency + logout */}
      <div className="shrink-0 flex items-center gap-3">
        {agency?.name && (
          <span className="font-data text-[11px] text-mute tracking-snug hidden lg:block">
            {agency.name}
          </span>
        )}

        <button
          onClick={handleLogout}
          className="font-data text-[11px] text-mute hover:text-ink transition-colors tracking-snug"
        >
          Logga ut
        </button>

        {/* Avatar */}
        <div className="w-[30px] h-[30px] rounded-full bg-ink text-bg flex items-center justify-center font-data text-[11px] font-medium tracking-snug shrink-0">
          {initials}
        </div>
      </div>
    </header>
  )
}
