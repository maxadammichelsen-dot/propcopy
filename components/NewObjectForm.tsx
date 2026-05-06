'use client'

import { useEffect, useRef, useState } from 'react'
import LocationCard from './LocationCard'
import BrandSelector from './BrandSelector'
import FactsTechStep, { type RenovationEntry } from './FactsTechStep'
import AddressAutocomplete from './AddressAutocomplete'
import Step0SnabbImport, { type ImportPayload } from './Step0SnabbImport'
import ImageObservationsReview from './ImageObservationsReview'
import type { AddressSuggestion, ImageAnalysis, ImageCategory, ImageWithObservations, MarketIntelligence, PropertyObject } from '@/types'

const AUTO_ANALYZE_DEBOUNCE_MS = 1500
type AnalysisStatus = 'idle' | 'fresh' | 'partially-stale'

interface NewObjectFormProps {
  onCreated: (object: any) => void
  onCancel: () => void
}

const PROPERTY_TYPES = ['Lägenhet', 'Villa', 'Radhus', 'Tomt', 'Fritidshus', 'Lokal']

const CHANNELS = [
  { id: 'hemnet',    icon: '🏠', label: 'Hemnet',      desc: 'Annonstext för Hemnet och Booli' },
  { id: 'instagram', icon: '📸', label: 'Instagram',   desc: 'Bildtext och caption för sociala medier' },
  { id: 'facebook',  icon: '📢', label: 'Facebook',    desc: 'Annonstext och inlägg' },
  { id: 'email',     icon: '✉️',  label: 'Nyhetsbrev', desc: 'E-post till spekulantlista' },
  { id: 'visning',   icon: '📄', label: 'Visningstext', desc: 'PDF till visning och trycksaker' },
]

const STEP_LABELS = ['Adress', 'Fakta', 'Argument', 'Bilder', 'Kanaler', 'Granska']
const MAX_IMAGES = 15

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function NewObjectForm({ onCreated, onCancel }: NewObjectFormProps) {
  const [step, setStep]         = useState(0)
  const [form, setForm]         = useState({
    address: '', area: '', type: 'Lägenhet', size: '', price: '', details: '', story: '',
    tenure: 'Friköpt', plot_area: '', construction_year: '', monthly_fee: '',
    operating_cost_yearly: '', energy_class: '', bedrooms: '',
    standard_class: 'Normal', heating: '', ventilation: '', parking: '',
  })
  const [importSource, setImportSource] = useState<string | undefined>(undefined)
  const [importConfidence, setImportConfidence] = useState<Record<string, number> | undefined>(undefined)
  const [importedFields, setImportedFields] = useState<Partial<PropertyObject> | undefined>(undefined)
  const [renovations, setRenovations] = useState<Record<string, RenovationEntry>>({
    kitchen: { year: '', note: '' },
    bathroom: { year: '', note: '' },
    facade: { year: '', note: '' },
  })
  const [channels, setChannels] = useState<string[]>(['hemnet', 'instagram'])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const detailsRef              = useRef<HTMLTextAreaElement>(null)

  const [, setCoordinates]                = useState<{ lat: number; lng: number } | null>(null)
  const [brands, setBrands]               = useState<Record<string, string[]>>({})

  const [imageBase64s, setImageBase64s]     = useState<string[]>([])
  const [imageCategories, setImageCategories] = useState<ImageCategory[]>([])
  const [imageAnalysis, setImageAnalysis]   = useState<ImageAnalysis | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [analyzing, setAnalyzing]         = useState(false)
  const [analyzeError, setAnalyzeError]   = useState('')
  const [dragOver, setDragOver]           = useState(false)
  const [showAnalysisWarning, setShowAnalysisWarning] = useState(false)
  const [draftObjectId, setDraftObjectId] = useState<string | null>(null)
  const [imageGroups, setImageGroups]     = useState<ImageWithObservations[]>([])
  const [showObservationsReview, setShowObservationsReview] = useState(false)
  const [importedMarketIntelligence, setImportedMarketIntelligence] = useState<MarketIntelligence | null>(null)
  const fileInputRef                      = useRef<HTMLInputElement>(null)
  const debounceTimerRef                  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const analyzeRef                        = useRef<() => Promise<void>>(async () => {})
  const marketDataPersistedRef            = useRef(false)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function applyImportedFields(fields: Partial<PropertyObject>) {
    setForm(f => {
      const next = { ...f }
      if (typeof fields.address === 'string' && fields.address) next.address = fields.address
      if (typeof fields.area === 'string' && fields.area) next.area = fields.area
      if (typeof fields.type === 'string' && fields.type) next.type = fields.type
      if (typeof fields.size === 'number' && Number.isFinite(fields.size)) next.size = String(fields.size)
      if (typeof fields.price === 'number' && Number.isFinite(fields.price)) next.price = String(fields.price)
      if (typeof fields.tenure === 'string' && fields.tenure) next.tenure = fields.tenure
      if (typeof fields.plot_area === 'number' && Number.isFinite(fields.plot_area)) next.plot_area = String(fields.plot_area)
      if (typeof fields.construction_year === 'number' && Number.isFinite(fields.construction_year)) next.construction_year = String(fields.construction_year)
      if (typeof fields.monthly_fee === 'number' && Number.isFinite(fields.monthly_fee)) next.monthly_fee = String(fields.monthly_fee)
      if (typeof fields.operating_cost_yearly === 'number' && Number.isFinite(fields.operating_cost_yearly)) next.operating_cost_yearly = String(fields.operating_cost_yearly)
      if (typeof fields.energy_class === 'string' && fields.energy_class) next.energy_class = fields.energy_class
      if (typeof fields.bedrooms === 'string' && fields.bedrooms) next.bedrooms = fields.bedrooms
      if (typeof fields.standard_class === 'string' && fields.standard_class) next.standard_class = fields.standard_class
      if (typeof fields.heating === 'string' && fields.heating) next.heating = fields.heating
      if (typeof fields.ventilation === 'string' && fields.ventilation) next.ventilation = fields.ventilation
      if (typeof fields.parking === 'string' && fields.parking) next.parking = fields.parking
      if (typeof fields.story === 'string' && fields.story) next.story = fields.story
      return next
    })
    if (fields.brands && typeof fields.brands === 'object') setBrands(fields.brands as Record<string, string[]>)
  }

  async function handleImportDone(payload: ImportPayload, droppedImages: File[]) {
    setImportSource(payload.source)
    setImportConfidence(payload.confidence)
    setImportedFields(payload.fields)
    applyImportedFields(payload.fields)
    if (payload.marketIntelligence) {
      setImportedMarketIntelligence(payload.marketIntelligence)
      marketDataPersistedRef.current = false
    }
    if (droppedImages.length > 0) {
      const remaining = MAX_IMAGES - imageBase64s.length
      if (remaining > 0) {
        const dataUrls = await Promise.all(droppedImages.slice(0, remaining).map(readFileAsDataURL))
        setImageBase64s(prev => [...prev, ...dataUrls])
        setAnalysisStatus(prev => (imageAnalysis ? 'partially-stale' : prev))
        scheduleAutoAnalyze()
      }
    }
    setStep(1)
  }

  function handleSkipImport() {
    setImportSource('manual')
    setImportConfidence(undefined)
    setImportedFields(undefined)
    setStep(1)
  }

  function updateRenovation(section: string, field: 'year' | 'note', value: string) {
    setRenovations(r => ({ ...r, [section]: { ...r[section], [field]: value } }))
  }

  function toggleChannel(id: string) {
    setChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  function appendDetail(text: string) {
    setForm(f => {
      const current = f.details.trim()
      return { ...f, details: current + (current ? '\n' : '') + text }
    })
    setTimeout(() => {
      if (detailsRef.current) detailsRef.current.scrollTop = detailsRef.current.scrollHeight
    }, 50)
  }

  function scheduleAutoAnalyze() {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      void analyzeRef.current()
    }, AUTO_ANALYZE_DEBOUNCE_MS)
  }

  async function addImages(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    const remaining = MAX_IMAGES - imageBase64s.length
    if (remaining <= 0) return
    const dataUrls = await Promise.all(arr.slice(0, remaining).map(readFileAsDataURL))
    setImageBase64s(prev => [...prev, ...dataUrls])
    setImageCategories(prev => [...prev, ...dataUrls.map((): ImageCategory => 'property')])
    setAnalyzeError('')
    setAnalysisStatus(prev => (imageAnalysis ? 'partially-stale' : prev))
    scheduleAutoAnalyze()
  }

  function removeImage(idx: number) {
    setImageBase64s(prev => prev.filter((_, i) => i !== idx))
    setImageCategories(prev => prev.filter((_, i) => i !== idx))
    setAnalysisStatus(prev => (imageAnalysis ? 'partially-stale' : prev))
    scheduleAutoAnalyze()
  }

  function toggleImageCategory(idx: number) {
    setImageCategories(prev =>
      prev.map((cat, i) => i === idx ? (cat === 'property' ? 'overview' : 'property') : cat)
    )
  }

  async function ensureDraftObject(): Promise<string | null> {
    if (draftObjectId) return draftObjectId
    if (!form.address || !form.area || !form.type || !form.size || !form.price) return null
    try {
      const res = await fetch('/api/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          size: Number(form.size),
          price: Number(form.price.replace(/\s/g, '')),
          story: form.story.trim() || null,
          status: 'draft',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.object?.id) return null
      setDraftObjectId(data.object.id)
      return data.object.id
    } catch {
      return null
    }
  }

  async function persistMarketData(objectId: string) {
    if (!importedMarketIntelligence || marketDataPersistedRef.current) return
    marketDataPersistedRef.current = true
    try {
      await fetch(`/api/objects/${objectId}/market-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketIntelligence: importedMarketIntelligence }),
      })
    } catch {
      marketDataPersistedRef.current = false
    }
  }

  async function handleAnalyzeImages() {
    if (imageBase64s.length === 0 || analyzing) return
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const objectId = await ensureDraftObject()
      if (objectId) await persistMarketData(objectId)
      const res = await fetch('/api/analyze-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imageBase64s,
          categories: imageCategories,
          ...(objectId ? { object_id: objectId } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analys misslyckades')
      if (Array.isArray(data.images) && data.images.length > 0) {
        setImageGroups(data.images as ImageWithObservations[])
        setShowObservationsReview(true)
      }
      // Keep legacy imageAnalysis display if present (backwards compat)
      if (data.image_analysis) setImageAnalysis(data.image_analysis)
      setAnalysisStatus('fresh')
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analys misslyckades')
    } finally {
      setAnalyzing(false)
    }
  }

  analyzeRef.current = handleAnalyzeImages

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  function canAdvance(): boolean {
    if (step === 1) return !!form.address.trim() && !!form.area.trim() && !!form.size && !!form.price
    if (step === 2) return true
    if (step === 3) return !!form.details.trim()
    if (step === 4) return true
    if (step === 5) return channels.length > 0
    return true
  }

  async function handleSubmit() {
    const analysisSkipped = imageBase64s.length > 0 && !imageAnalysis && imageGroups.length === 0
    if (analysisSkipped && !analyzing && !showAnalysisWarning) {
      setShowAnalysisWarning(true)
      return
    }
    setShowAnalysisWarning(false)
    setLoading(true)
    setError('')

    const body = JSON.stringify({
      ...form,
      size: Number(form.size),
      price: Number(form.price.replace(/\s/g, '')),
      story: form.story.trim() || null,
      tenure: form.tenure || null,
      plot_area: form.plot_area ? Number(form.plot_area) : null,
      construction_year: form.construction_year ? Number(form.construction_year) : null,
      monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null,
      operating_cost_yearly: form.operating_cost_yearly ? Number(form.operating_cost_yearly) : null,
      energy_class: form.energy_class || null,
      bedrooms: form.bedrooms.trim() || null,
      standard_class: form.standard_class || null,
      heating: form.heating || null,
      ventilation: form.ventilation || null,
      parking: form.parking.trim() || null,
      renovations: (() => {
        const filled = Object.fromEntries(Object.entries(renovations).filter(([, v]) => v.year || v.note))
        return Object.keys(filled).length > 0 ? filled : null
      })(),
      brands: Object.fromEntries(Object.entries(brands).filter(([, v]) => v.length > 0)),
      ...(imageAnalysis ? { image_analysis: imageAnalysis } : {}),
      ...(importSource ? { import_source: importSource } : {}),
      ...(importConfidence ? { import_confidence: importConfidence } : {}),
      status: 'active',
    })

    const res = draftObjectId
      ? await fetch(`/api/objects/${draftObjectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
      : await fetch('/api/objects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Något gick fel')
      setLoading(false)
      return
    }
    if (data.object?.id) await persistMarketData(data.object.id)
    onCreated(data.object)
  }

  const progressPct = (step / 6) * 100

  if (step === 0) {
    return (
      <Step0SnabbImport
        onImportDone={handleImportDone}
        onSkip={handleSkipImport}
        onCancel={onCancel}
      />
    )
  }

  if (showObservationsReview && imageGroups.length > 0) {
    return (
      <ImageObservationsReview
        imageGroups={imageGroups}
        onDone={confirmed => {
          setImageGroups(confirmed)
          setShowObservationsReview(false)
        }}
      />
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      {/* ── Internal header ───────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', borderBottom: '1px solid var(--tint)',
      }}>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)', letterSpacing: '-0.01em' }}>
          Nytt objekt
        </span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {STEP_LABELS.map((_, i) => (
            <span key={i} style={{
              width: '22px', height: '2px', borderRadius: '1px',
              background: i < step - 1 ? 'var(--ink)' : i === step - 1 ? 'var(--accent)' : 'var(--line-2)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
      </div>

      {/* ── Progress bar ──────────────────────────────── */}
      <div style={{ position: 'absolute', top: '48px', left: 0, right: 0, height: '4px', background: 'var(--tint)', zIndex: 9 }}>
        <b style={{ display: 'block', height: '100%', width: `${progressPct}%`, background: 'var(--ink)', transition: 'width 0.3s ease' }} />
      </div>

      {/* ── Task content ──────────────────────────────── */}
      <div style={{
        position: 'absolute', top: '52px', left: 0, right: 0, bottom: '60px',
        padding: '24px 40px', display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '28px', fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)',
        }}>
          <span>Steg {step} av 6</span>
          <span style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>{STEP_LABELS[step - 1]}</span>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.024em', lineHeight: 1.2, color: 'var(--ink)' }}>
            {step === 1 && 'Vilket objekt ska vi hjälpa dig med?'}
            {step === 2 && 'Fakta och teknisk information.'}
            {step === 3 && 'Vad är de starkaste säljargumenten?'}
            {step === 4 && 'Lägg till bilder för djupare analys.'}
            {step === 5 && 'Vilka kanaler ska vi skriva för?'}
            {step === 6 && 'Granska och spara objektet.'}
          </h1>
          {step === 2 && (
            <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--mute)', letterSpacing: '-0.01em' }}>
              Valfritt — ju mer fakta, desto mer korrekt och trovärdig annonstext.
            </p>
          )}
          {step === 4 && (
            <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--mute)', letterSpacing: '-0.01em' }}>
              Valfritt — bilder hjälper AI:n skriva mer precisa och visuellt träffsäkra texter.
            </p>
          )}
        </div>

        {/* ── Step 1: Adress ───────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none', lineHeight: 1, zIndex: 1 }}>
                📍
              </span>
              <AddressAutocomplete
                value={form.address}
                onChange={v => { update('address', v); setCoordinates(null) }}
                onSelect={(s: AddressSuggestion) => {
                  update('address', s.text)
                  if (s.coordinates) setCoordinates(s.coordinates)
                }}
                placeholder="Storgatan 12, 3 tr"
                inputStyle={{
                  width: '100%', padding: '14px 16px 14px 44px', fontSize: '16px',
                  border: '1px solid var(--line)', borderRadius: '8px', outline: 'none',
                  transition: 'border-color 0.15s', background: 'var(--bg)', color: 'var(--ink)',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FieldWrap label="Område">
                <input value={form.area} onChange={e => update('area', e.target.value)} placeholder="Linnéstaden, Göteborg" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }} />
              </FieldWrap>
              <FieldWrap label="Objektstyp">
                <select value={form.type} onChange={e => update('type', e.target.value)} style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FieldWrap>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FieldWrap label="Storlek (kvm)">
                <input type="number" min="1" value={form.size} onChange={e => update('size', e.target.value)} placeholder="85" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }} />
              </FieldWrap>
              <FieldWrap label="Utgångspris (kr)">
                <input value={form.price} onChange={e => update('price', e.target.value)} placeholder="4 950 000" style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }} />
              </FieldWrap>
            </div>
          </div>
        )}

        {/* ── Step 2: Fakta & teknik ───────────────── */}
        {step === 2 && (
          <FactsTechStep
            formData={form}
            updateField={update}
            renovations={renovations}
            updateRenovation={updateRenovation}
          />
        )}

        {/* ── Step 3: Argument ─────────────────────── */}
        {step === 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '28px', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              <span style={sectionLabel}>Platsanalys</span>
              <LocationCard address={form.address} area={form.area} onInclude={appendDetail} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={sectionLabel}>Säljargument &amp; detaljer</span>
                <textarea
                  ref={detailsRef}
                  value={form.details}
                  onChange={e => update('details', e.target.value)}
                  placeholder={"3 rok, ljus och luftig, nyrenoverat kök 2023, parkett i alla rum...\n\nKlicka på platsargumenten till vänster för att lägga till dem."}
                  style={{ minHeight: '160px', padding: '14px 16px', fontSize: '14px', border: '1px solid var(--line)', borderRadius: '8px', outline: 'none', resize: 'none', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'inherit', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={sectionLabel}>Berätta det som inte syns i fakta</span>
                <textarea
                  value={form.story}
                  onChange={e => update('story', e.target.value)}
                  placeholder={"Historik, material, atmosfär, speciella detaljer som postmästarehistorien, takbjälkar, öppen spis, trädgård..."}
                  rows={5}
                  style={{ padding: '14px 16px', fontSize: '14px', border: '1px solid var(--line)', borderRadius: '8px', outline: 'none', resize: 'none', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'inherit', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              <BrandSelector value={brands} onChange={setBrands} />
            </div>
          </div>
        )}

        {/* ── Step 4: Bilder ───────────────────────── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) addImages(e.target.files); e.currentTarget.value = '' }}
            />

            {/* Drop zone */}
            <div
              onClick={() => imageBase64s.length < MAX_IMAGES && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOver(false); addImages(e.dataTransfer.files) }}
              style={{
                border: `2px dashed ${dragOver ? 'var(--ink)' : imageBase64s.length >= MAX_IMAGES ? 'var(--line-2)' : 'var(--line)'}`,
                borderRadius: '10px',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: imageBase64s.length >= MAX_IMAGES ? 'default' : 'pointer',
                background: dragOver ? 'var(--tint)' : 'var(--bg)',
                transition: 'border-color 0.15s, background 0.15s',
                minHeight: '120px',
              }}
            >
              <span style={{ fontSize: '24px', lineHeight: 1 }}>📷</span>
              <span style={{ fontSize: '14px', color: imageBase64s.length >= MAX_IMAGES ? 'var(--mute)' : 'var(--ink)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                {dragOver
                  ? 'Släpp bilderna här'
                  : imageBase64s.length >= MAX_IMAGES
                    ? `Max ${MAX_IMAGES} bilder uppladdade`
                    : 'Dra hit bilder eller klicka för att välja'}
              </span>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>
                JPEG · PNG · WEBP — max {MAX_IMAGES} bilder
              </span>
            </div>

            {/* Thumbnail grid */}
            {imageBase64s.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {imageBase64s.map((src, idx) => {
                    const cat = imageCategories[idx] ?? 'property'
                    const isOverview = cat === 'overview'
                    return (
                      <div key={idx} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', borderRadius: '6px', border: `1px solid ${isOverview ? 'var(--mute)' : 'var(--line)'}` }}>
                        <img src={src} alt={`Bild ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isOverview ? 0.55 : 1 }} />
                        {/* Overview badge */}
                        {isOverview && (
                          <span style={{
                            position: 'absolute', bottom: '24px', left: 0, right: 0,
                            textAlign: 'center', fontFamily: "'Geist Mono', monospace",
                            fontSize: '9px', letterSpacing: '0.04em', textTransform: 'uppercase',
                            color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 0',
                          }}>
                            Översikt
                          </span>
                        )}
                        {/* Category toggle */}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); toggleImageCategory(idx) }}
                          title={isOverview ? 'Markera som bostad' : 'Markera som översiktsbild'}
                          style={{
                            position: 'absolute', bottom: '4px', left: '4px',
                            padding: '2px 5px', borderRadius: '3px', border: 'none',
                            background: isOverview ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
                            cursor: 'pointer', color: '#fff', fontSize: '10px',
                            fontFamily: "'Geist Mono', monospace', lineHeight: 1.4",
                            letterSpacing: '0.02em',
                          }}
                        >
                          {isOverview ? '🛸' : '🏠'}
                        </button>
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); removeImage(idx) }}
                          style={{
                            position: 'absolute', top: '4px', right: '4px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)', border: 'none',
                            cursor: 'pointer', color: '#fff', fontSize: '12px',
                            lineHeight: '20px', padding: 0, textAlign: 'center',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Analyze row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleAnalyzeImages}
                    disabled={analyzing}
                    style={{
                      padding: '8px 16px',
                      border: `1px solid ${analyzing ? 'var(--line)' : 'var(--ink)'}`,
                      borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                      background: analyzing ? 'var(--tint)' : 'var(--ink)',
                      color: analyzing ? 'var(--mute)' : '#fff',
                      cursor: analyzing ? 'default' : 'pointer',
                      fontFamily: 'inherit', letterSpacing: '-0.01em',
                      transition: 'background 0.15s',
                    }}
                  >
                    {analyzing ? 'Analyserar bilder...' : 'Analysera bilder'}
                  </button>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>
                    {imageBase64s.length} av {MAX_IMAGES} bilder
                  </span>
                  {analysisStatus === 'fresh' && !analyzing && (
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: '#16a34a' }}>
                      {imageGroups.length > 0
                        ? `✓ ${imageGroups.flatMap(g => g.observations.filter(o => o.status === 'confirmed')).length} observationer bekräftade`
                        : imageAnalysis?.rooms?.length
                          ? `✓ Analys klar (${imageAnalysis.rooms.length} rum)`
                          : '✓ Analys klar'}
                    </span>
                  )}
                  {imageGroups.length > 0 && !analyzing && (
                    <button
                      type="button"
                      onClick={() => setShowObservationsReview(true)}
                      style={{
                        padding: '4px 10px', border: '1px solid var(--line)', borderRadius: '5px',
                        fontSize: '12px', fontFamily: "'Geist Mono', monospace", color: 'var(--mute)',
                        background: 'transparent', cursor: 'pointer', letterSpacing: '-0.01em',
                      }}
                    >
                      Granska observationer
                    </button>
                  )}
                  {imageAnalysis && !analyzing && analysisStatus === 'partially-stale' && (
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>
                      Analys delvis föråldrad — uppdaterar…
                    </span>
                  )}
                  {analyzing && (
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>
                      Analyserar bilder i bakgrunden…
                    </span>
                  )}
                  {analyzeError && (
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--accent)' }}>
                      {analyzeError}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Analysis result tags */}
            {imageAnalysis && !analyzing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ height: '1px', background: 'var(--line)' }} />
                <span style={sectionLabel}>Analysresultat</span>
                {imageAnalysis.rooms && imageAnalysis.rooms.length > 0 ? (
                  <>
                    {imageAnalysis.rooms.map((room, i) => {
                      const label = room.room_label
                        ? `${room.room_type} (${room.room_label})`
                        : room.room_type
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {label}
                          </span>
                          {room.materials?.length > 0 && <TagRow label="Material"  items={room.materials} />}
                          {room.fixtures?.length > 0 && <TagRow label="Fixturer"  items={room.fixtures} />}
                          {room.light?.length > 0     && <TagRow label="Ljus"     items={room.light} />}
                          {room.spatial?.length > 0   && <TagRow label="Rymd"     items={room.spatial} />}
                          {room.notable_details?.length > 0 && <TagRow label="Särdrag" items={room.notable_details} />}
                          {room.condition && room.condition !== 'okänt' && (
                            <TagRow label="Skick" items={[room.condition]} accent />
                          )}
                        </div>
                      )
                    })}
                    {imageAnalysis.overall_style && (
                      <TagRow label="Stil" items={[imageAnalysis.overall_style]} accent />
                    )}
                    {imageAnalysis.architectural_period && (
                      <TagRow label="Period" items={[imageAnalysis.architectural_period]} accent />
                    )}
                  </>
                ) : (
                  <>
                    {imageAnalysis.materials?.length ? <TagRow label="Material" items={imageAnalysis.materials} /> : null}
                    {imageAnalysis.lighting?.length ? <TagRow label="Ljus" items={imageAnalysis.lighting} /> : null}
                    {imageAnalysis.ceiling_height ? <TagRow label="Takhöjd" items={[imageAnalysis.ceiling_height]} accent /> : null}
                    {imageAnalysis.renovation_status ? <TagRow label="Skick" items={[imageAnalysis.renovation_status]} accent /> : null}
                    {imageAnalysis.special_features?.length ? <TagRow label="Särdrag" items={imageAnalysis.special_features} /> : null}
                    {imageAnalysis.key_selling_points?.length ? <TagRow label="Säljpunkter" items={imageAnalysis.key_selling_points} strong /> : null}
                  </>
                )}
              </div>
            )}

            {showAnalysisWarning && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: 24, maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                    Bildanalys saknas — texterna blir mindre specifika utan den. Vill du analysera nu?
                  </span>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setShowAnalysisWarning(false); void handleSubmit() }}
                      style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--mute)', fontFamily: 'inherit' }}
                    >
                      Spara ändå
                    </button>
                    <button
                      type="button"
                      onClick={async () => { setShowAnalysisWarning(false); await handleAnalyzeImages(); }}
                      style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--ink)', background: 'var(--ink)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }}
                    >
                      Analysera nu
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Kanaler ──────────────────────── */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '560px' }}>
            {CHANNELS.map(ch => {
              const active = channels.includes(ch.id)
              return (
                <button key={ch.id} type="button" onClick={() => toggleChannel(ch.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: '14px',
                    padding: '14px 16px',
                    border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                    borderRadius: '8px', alignItems: 'center',
                    background: active ? 'var(--tint)' : 'var(--bg)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>{ch.icon}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: active ? 500 : 400, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                      {ch.label}
                    </p>
                    <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)', marginTop: '2px' }}>
                      {ch.desc}
                    </p>
                  </div>
                  <span style={{ width: '32px', height: '18px', borderRadius: '100px', background: active ? 'var(--accent)' : 'var(--line-2)', position: 'relative', flexShrink: 0, transition: 'background 0.15s', display: 'inline-block' }}>
                    <span style={{ position: 'absolute', top: '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'transform 0.15s', transform: active ? 'translateX(16px)' : 'translateX(2px)' }} />
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Step 6: Granska ──────────────────────── */}
        {step === 6 && (
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 220px', gap: '20px', flex: 1, minHeight: 0 }}>
            {/* Left: object summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--tint)', alignSelf: 'flex-start' }}>
              <span style={sectionLabel}>Objekt</span>
              <ReviewItem label="Adress"  value={form.address} />
              <ReviewItem label="Område"  value={form.area} />
              <ReviewItem label="Typ"     value={form.type} />
              <ReviewItem label="Storlek" value={form.size ? `${form.size} kvm` : '—'} />
              <ReviewItem label="Pris"    value={form.price ? `${form.price} kr` : '—'} />
              <ReviewItem label="Upplåtelse" value={form.tenure} />
              {form.construction_year ? <ReviewItem label="Byggår" value={form.construction_year} /> : null}
              {form.energy_class ? <ReviewItem label="Energiklass" value={form.energy_class} /> : null}
              <ReviewItem label="Berättelse" value={form.story.trim() ? `${form.story.trim().slice(0, 40)}…` : '—'} />
              <ReviewItem label="Specifikation" value={(() => { const n = Object.values(brands).flat().length; return n > 0 ? `${n} varumärken` : '—' })()} />
              <ReviewItem
                label="Bilder"
                value={
                  imageAnalysis
                    ? `${imageBase64s.length} analyserade`
                    : imageBase64s.length > 0
                      ? `${imageBase64s.length} (ej analyserade)`
                      : 'Inga bilder'
                }
              />
            </div>

            {/* Middle: details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
              <span style={sectionLabel}>Argument</span>
              <div style={{ flex: 1, minHeight: '200px', padding: '16px', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--bg)', overflowY: 'auto', fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: "'Geist Mono', monospace" }}>
                {form.details || <span style={{ color: 'var(--mute-2)' }}>Inga argument angivna</span>}
              </div>
            </div>

            {/* Right: channels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={sectionLabel}>Kanaler ({channels.length})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {CHANNELS.filter(ch => channels.includes(ch.id)).map(ch => (
                  <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: '8px', background: 'var(--tint)' }}>
                    <span style={{ fontSize: '14px' }}>{ch.icon}</span>
                    <span style={{ fontSize: '13px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>{ch.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footbar ────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
        borderTop: '1px solid var(--line)', background: 'var(--bg)',
        display: 'grid', gridTemplateColumns: '1fr auto auto',
        alignItems: 'center', padding: '0 16px', gap: '12px',
      }}>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--accent)' }}>
          {error}
        </span>
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => { setStep(s => s - 1); setError('') }}
          style={{
            padding: '8px 14px', border: '1px solid var(--line)', borderRadius: '6px',
            fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', background: 'var(--bg)',
            cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'inherit',
          }}
        >
          {step === 1 ? 'Avbryt' : '← Tillbaka'}
        </button>
        <button
          type="button"
          onClick={step < 6 ? () => { if (canAdvance()) setStep(s => s + 1) } : handleSubmit}
          disabled={!canAdvance() || loading}
          style={{
            padding: '8px 14px',
            border: `1px solid ${canAdvance() && !loading ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: '6px', fontSize: '13px', fontWeight: 500,
            background: canAdvance() && !loading ? 'var(--accent)' : 'var(--line)',
            color: canAdvance() && !loading ? '#fff' : 'var(--mute)',
            cursor: canAdvance() && !loading ? 'pointer' : 'default',
            transition: 'background 0.15s, border-color 0.15s',
            letterSpacing: '-0.01em', fontFamily: 'inherit',
          }}
        >
          {step < 6 ? 'Nästa →' : loading ? 'Sparar…' : 'Spara objekt'}
        </button>
      </div>

    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: '14px',
  border: '1px solid var(--line)', borderRadius: '8px', outline: 'none',
  transition: 'border-color 0.15s', background: 'var(--bg)',
  color: 'var(--ink)', fontFamily: 'inherit',
}

const sectionLabel: React.CSSProperties = {
  fontFamily: "'Geist Mono', monospace", fontSize: '10px',
  color: 'var(--mute)', letterSpacing: '0.04em', textTransform: 'uppercase',
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={sectionLabel}>{label}</label>
      {children}
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>
        {label}
      </p>
      <p style={{ fontSize: '13px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
        {value || '—'}
      </p>
    </div>
  )
}

function TagRow({
  label,
  items,
  accent,
  strong,
}: {
  label: string
  items: string[]
  accent?: boolean
  strong?: boolean
}) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <span style={{
        fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)',
        letterSpacing: '0.04em', textTransform: 'uppercase',
        minWidth: '76px', paddingTop: '3px', flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map((item, i) => (
          <span key={i} style={{
            padding: '3px 9px', borderRadius: '100px', fontSize: '12px',
            fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.01em',
            background: strong ? 'rgba(22,163,74,0.08)' : accent ? 'var(--tint)' : 'var(--bg)',
            border: `1px solid ${strong ? 'rgba(22,163,74,0.3)' : 'var(--line)'}`,
            color: strong ? '#16a34a' : 'var(--ink)',
            fontWeight: strong ? 500 : 400,
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
