'use client'

import { Agency, PropertyObject } from '@/types'

interface SidebarProps {
  objects: PropertyObject[]
  selectedId: string | null
  currentView: string
  agency: Agency | null
  onSelect: (id: string) => void
  onNewObject: () => void
  onTone: () => void
  onHome: () => void
  onCompetition: () => void
  onProspects: () => void
  onFollowup: () => void
}

const STATUS_COLORS: Record<string, string> = {
  draft:  'var(--mute-2)',
  active: 'var(--ink)',
  sold:   'var(--mute-2)',
}

const STATUS_DOT: Record<string, string> = {
  draft:  'var(--line-2)',
  active: 'var(--accent)',
  sold:   'var(--mute-2)',
}

export default function Sidebar({
  objects,
  selectedId,
  currentView,
  agency,
  onSelect,
  onNewObject,
  onTone,
}: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 border-r border-line flex flex-col bg-tint">

      {/* New object */}
      <div className="p-4 border-b border-line">
        <button
          onClick={onNewObject}
          className="w-full flex items-center justify-between px-3 py-2 rounded-full bg-ink text-bg text-[12px] font-medium hover:opacity-80 transition-opacity"
        >
          <span>Nytt objekt</span>
          <span className="font-data text-[14px] leading-none">+</span>
        </button>
      </div>

      {/* Column headers */}
      <div className="px-4 py-2 border-b border-line flex justify-between">
        <span className="font-data text-[10px] text-mute uppercase tracking-[0.02em]">Adress</span>
        <span className="font-data text-[10px] text-mute uppercase tracking-[0.02em]">Dagar</span>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto">
        {objects.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-data text-[11px] text-mute-2 tracking-snug leading-relaxed">
              Inga objekt ännu
            </p>
          </div>
        ) : (
          <ul>
            {objects.map((obj, i) => {
              const isActive = selectedId === obj.id && currentView === 'detail'
              const daysOnMarket = Math.floor(
                (Date.now() - new Date(obj.created_at).getTime()) / 86_400_000
              )
              return (
                <li key={obj.id}>
                  <button
                    onClick={() => onSelect(obj.id)}
                    className={[
                      'w-full text-left px-4 py-3 flex items-start gap-2.5',
                      'border-b border-line transition-colors border-l-2',
                      isActive
                        ? 'bg-bg border-l-accent'
                        : 'hover:bg-bg/60 border-l-transparent',
                    ].join(' ')}
                  >
                    {/* Row number */}
                    <span className="font-data text-[10px] text-mute-2 pt-[3px] tabular-nums w-5 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Address + area */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-medium truncate leading-snug"
                        style={{ color: STATUS_COLORS[obj.status] }}
                      >
                        {obj.address}
                      </p>
                      <p className="font-data text-[10px] text-mute truncate mt-0.5 tracking-snug">
                        {obj.area}
                      </p>
                    </div>

                    {/* Days + dot */}
                    <div className="flex flex-col items-end gap-1 shrink-0 pt-[2px]">
                      <span className="font-data text-[11px] text-mute tabular-nums">
                        {daysOnMarket}d
                      </span>
                      <span
                        className="w-[5px] h-[5px] rounded-full"
                        style={{ background: STATUS_DOT[obj.status] }}
                      />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Tone status footer */}
      <div className="border-t border-line p-3">
        <button
          onClick={onTone}
          className="w-full text-left px-3 py-2 rounded hover:bg-bg/80 transition-colors"
        >
          <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">
            Tonalitet
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: agency?.tone_profile ? 'var(--accent)' : 'var(--line-2)' }}
            />
            <p className="font-data text-[11px] text-ink-2 truncate tracking-snug">
              {agency?.tone_profile?.tags?.slice(0, 2).join(', ') ?? 'Ej konfigurerad'}
            </p>
          </div>
        </button>
      </div>
    </aside>
  )
}
