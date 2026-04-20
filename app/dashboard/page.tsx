'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Agency, PropertyObject, ToneProfile } from '@/types'
import Topbar from '@/components/Topbar'
import Sidebar from '@/components/Sidebar'
import ObjectDetail from '@/components/ObjectDetail'
import NewObjectForm from '@/components/NewObjectForm'
import ToneView from '@/components/ToneView'
import DashboardHome from '@/components/DashboardHome'
import CompetitionView from '@/components/CompetitionView'
import BrandProvider from '@/components/BrandProvider'

type View = 'home' | 'detail' | 'new' | 'tone' | 'competition'

export default function DashboardPage() {
  const router = useRouter()
  const [agency, setAgency] = useState<Agency | null>(null)
  const [objects, setObjects] = useState<PropertyObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<View>('home')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const [agencyRes, objectsRes] = await Promise.all([
        supabase.from('agencies').select('*').eq('user_id', user.id).single(),
        fetch('/api/objects'),
      ])

      if (agencyRes.data) setAgency(agencyRes.data as Agency)

      const objectsData = await objectsRes.json()
      const objs: PropertyObject[] = objectsData.objects ?? []
      setObjects(objs)

      setLoading(false)
    }
    bootstrap()
  }, [router])

  function handleObjectCreated(newObj: PropertyObject) {
    setObjects((prev) => [newObj, ...prev])
    setSelectedId(newObj.id)
    setView('detail')
  }

  function handleNewObject() {
    setView('new')
    setSelectedId(null)
  }

  function handleSelectObject(id: string) {
    setSelectedId(id)
    setView('detail')
  }

  function handleHome() {
    setView('home')
    setSelectedId(null)
  }

  function handleCompetition() {
    setView('competition')
    setSelectedId(null)
  }

  function handleToneUpdated(profile: ToneProfile) {
    setAgency((prev) => prev ? { ...prev, tone_profile: profile } : prev)
  }

  const selectedObject = objects.find((o) => o.id === selectedId) ?? null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#b8965a] rounded-full animate-spin" />
          <p className="text-[#555] text-sm">Laddar…</p>
        </div>
      </div>
    )
  }

  return (
    <BrandProvider agency={agency}>
    <div className="min-h-screen bg-[#111111] flex flex-col">
      <Topbar agency={agency} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          objects={objects}
          selectedId={selectedId}
          currentView={view}
          agency={agency}
          onSelect={handleSelectObject}
          onNewObject={handleNewObject}
          onTone={() => setView('tone')}
          onHome={handleHome}
          onCompetition={handleCompetition}
        />

        <main className="flex-1 overflow-hidden">
          {view === 'home' ? (
            <DashboardHome
              agency={agency}
              onSelectObject={handleSelectObject}
              onNewObject={handleNewObject}
            />
          ) : view === 'competition' ? (
            <CompetitionView />
          ) : view === 'new' ? (
            <NewObjectForm
              onCreated={handleObjectCreated}
              onCancel={() => setView('detail')}
            />
          ) : view === 'tone' && agency ? (
            <ToneView
              agency={agency}
              onToneUpdated={handleToneUpdated}
              onAgencyUpdated={setAgency}
            />
          ) : selectedObject ? (
            <ObjectDetail object={selectedObject} agency={agency} />
          ) : (
            <EmptyState onNewObject={handleNewObject} />
          )}
        </main>
      </div>
    </div>
    </BrandProvider>
  )
}

function EmptyState({ onNewObject }: { onNewObject: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <h2 className="font-serif text-4xl text-[#f0ece4] mb-3">Välkommen till PropCopy</h2>
      <p className="text-[#555] text-sm max-w-xs leading-relaxed mb-8">
        Skapa ditt första objekt och generera professionella marknadsföringstexter för alla kanaler på sekunder.
      </p>
      <button
        onClick={onNewObject}
        className="px-6 py-3 bg-[#b8965a] hover:bg-[#d4b07a] text-[#111111] rounded text-sm font-medium transition-colors"
      >
        Skapa första objektet
      </button>
    </div>
  )
}
