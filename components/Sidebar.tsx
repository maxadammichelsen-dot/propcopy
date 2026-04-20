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
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#555',
  active: '#b8965a',
  sold: '#444',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  active: 'Aktiv',
  sold: 'Såld',
}

export default function Sidebar({
  objects,
  selectedId,
  currentView,
  agency,
  onSelect,
  onNewObject,
  onTone,
  onHome,
  onCompetition,
  onProspects,
}: SidebarProps) {
  const hasTone = !!agency?.tone_profile?.tags?.length
  const toneActive = currentView === 'tone'
  const homeActive = currentView === 'home'
  const competitionActive = currentView === 'competition'
  const prospectsActive = currentView === 'prospects'

  return (
    <aside className="w-64 shrink-0 border-r border-[#2a2a2a] flex flex-col bg-[#111111]">
      {/* Quick nav */}
      <div className="p-3 border-b border-[#2a2a2a] space-y-1">
        <button
          onClick={onHome}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded transition-colors border ${
            homeActive
              ? 'bg-[#b8965a0d] border-[#b8965a33]'
              : 'border-transparent hover:bg-[#1a1a1a]'
          }`}
        >
          <span className="text-sm leading-none">◈</span>
          <span className={`text-xs font-medium ${homeActive ? 'text-[#b8965a]' : 'text-[#888]'}`}>
            Översikt
          </span>
        </button>
        <button
          onClick={onCompetition}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded transition-colors border ${
            competitionActive
              ? 'bg-[#b8965a0d] border-[#b8965a33]'
              : 'border-transparent hover:bg-[#1a1a1a]'
          }`}
        >
          <span className="text-sm leading-none">◎</span>
          <span className={`text-xs font-medium ${competitionActive ? 'text-[#b8965a]' : 'text-[#888]'}`}>
            Marknad
          </span>
        </button>
        <button
          onClick={onProspects}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded transition-colors border ${
            prospectsActive
              ? 'bg-[#b8965a0d] border-[#b8965a33]'
              : 'border-transparent hover:bg-[#1a1a1a]'
          }`}
        >
          <span className="text-sm leading-none">◉</span>
          <span className={`text-xs font-medium ${prospectsActive ? 'text-[#b8965a]' : 'text-[#888]'}`}>
            Spekulanter
          </span>
        </button>
      </div>

      {/* New object */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <button
          onClick={onNewObject}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#b8965a33] rounded text-[#b8965a] text-xs uppercase tracking-widest hover:bg-[#b8965a0d] transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nytt objekt
        </button>
      </div>

      {/* Object list */}
      <div className="flex-1 overflow-y-auto">
        {objects.length === 0 ? (
          <p className="text-[#444] text-xs text-center py-8 px-4">
            Inga objekt ännu.<br />Skapa ditt första ovan.
          </p>
        ) : (
          <ul className="py-2">
            {objects.map((obj) => (
              <li key={obj.id}>
                <button
                  onClick={() => onSelect(obj.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#1a1a1a] transition-colors border-l-2 ${
                    selectedId === obj.id && currentView === 'detail'
                      ? 'border-[#b8965a] bg-[#1a1a1a]'
                      : 'border-transparent'
                  }`}
                >
                  <p className="text-sm text-[#f0ece4] truncate leading-tight">{obj.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#555]">{obj.area}</span>
                    <span className="text-[10px]" style={{ color: STATUS_COLORS[obj.status] }}>
                      {STATUS_LABELS[obj.status]}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tone section */}
      <div className="border-t border-[#2a2a2a] p-3">
        <button
          onClick={onTone}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
            toneActive
              ? 'bg-[#b8965a0d] border border-[#b8965a33]'
              : 'hover:bg-[#1a1a1a] border border-transparent'
          }`}
        >
          <span className="text-base leading-none">{hasTone ? '◆' : '◇'}</span>
          <div className="flex-1 text-left">
            <p className={`text-xs font-medium ${toneActive ? 'text-[#b8965a]' : 'text-[#888]'}`}>
              Byråns tonalitet
            </p>
            {hasTone ? (
              <p className="text-[10px] text-[#555] truncate mt-0.5">
                {agency?.tone_profile?.tags?.slice(0, 3).join(', ')}…
              </p>
            ) : (
              <p className="text-[10px] text-[#444] mt-0.5">Ej hämtad</p>
            )}
          </div>
        </button>
      </div>
    </aside>
  )
}
