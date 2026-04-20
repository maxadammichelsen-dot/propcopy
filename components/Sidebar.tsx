'use client'

import { PropertyObject } from '@/types'

interface SidebarProps {
  objects: PropertyObject[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewObject: () => void
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

export default function Sidebar({ objects, selectedId, onSelect, onNewObject }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-[#2a2a2a] flex flex-col bg-[#111111]">
      <div className="p-4 border-b border-[#2a2a2a]">
        <button
          onClick={onNewObject}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#b8965a33] rounded text-[#b8965a] text-xs uppercase tracking-widest hover:bg-[#b8965a0d] transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nytt objekt
        </button>
      </div>

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
                    selectedId === obj.id
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
    </aside>
  )
}
