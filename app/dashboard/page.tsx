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
import ProspectsView from '@/components/ProspectsView'
import FollowupView from '@/components/FollowupView'
import RevisionView from '@/components/RevisionView'
import SettingsView from '@/components/SettingsView'
import BrandProvider from '@/components/BrandProvider'

type View = 'home' | 'detail' | 'new' | 'tone' | 'competition' | 'prospects' | 'followup' | 'revision' | 'settings'

export default function DashboardPage() {
  const router = useRouter()
  const [agency, setAgency] = useState<Agency | null>(null)
  const [userEmail, setUserEmail] = useState('')
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

      if (user.email) setUserEmail(user.email)

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

  function handleProspects() {
    setView('prospects')
    setSelectedId(null)
  }

  function handleFollowup() {
    setView('followup')
    setSelectedId(null)
  }

  function handleRevision() {
    setView('revision')
    setSelectedId(null)
  }

  function handleSettings() {
    setView('settings')
    setSelectedId(null)
  }

  function handleToneUpdated(profile: ToneProfile) {
    setAgency((prev) => prev ? { ...prev, tone_profile: profile } : prev)
  }

  const selectedObject = objects.find((o) => o.id === selectedId) ?? null

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="estatio-logo">
            <span className="part-estat text-[28px]">Estat</span>
            <span className="part-slash text-[19px]">/</span>
            <span className="part-io text-[19px]">io</span>
          </div>
          <div className="w-5 h-5 border-[1.5px] border-line border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <BrandProvider agency={agency}>
    <div className="min-h-screen bg-bg flex flex-col">
      <Topbar
        agency={agency}
        currentView={view}
        onHome={handleHome}
        onCompetition={handleCompetition}
        onProspects={handleProspects}
        onFollowup={handleFollowup}
        onTone={() => setView('tone')}
        onSettings={handleSettings}
      />

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
          onProspects={handleProspects}
          onFollowup={handleFollowup}
        />

        <main className="flex-1 overflow-hidden">
          {view === 'settings' && agency ? (
            <SettingsView
              agency={agency}
              userEmail={userEmail}
              onAgencyUpdated={setAgency}
            />
          ) : view === 'home' ? (
            <DashboardHome
              agency={agency}
              onSelectObject={handleSelectObject}
              onNewObject={handleNewObject}
              onProspects={handleProspects}
              onRevision={handleRevision}
            />
          ) : view === 'competition' ? (
            <CompetitionView />
          ) : view === 'prospects' ? (
            <ProspectsView agency={agency} />
          ) : view === 'followup' ? (
            <FollowupView />
          ) : view === 'revision' ? (
            <RevisionView />
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
    <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-6">
      <div>
        <h2 className="font-display text-[44px] tracking-tightest leading-display text-ink mb-3">
          Skapa ditt <em className="italic text-mute">första objekt.</em>
        </h2>
        <p className="font-data text-[13px] text-mute tracking-snug max-w-xs mx-auto leading-relaxed">
          Generera professionella texter för alla kanaler på sekunder.
        </p>
      </div>
      <button
        onClick={onNewObject}
        className="bg-ink text-bg px-5 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity"
      >
        Nytt objekt →
      </button>
    </div>
  )
}
