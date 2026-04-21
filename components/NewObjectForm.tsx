'use client'

import { useRef, useState } from 'react'
import LocationCard from './LocationCard'

interface NewObjectFormProps {
  onCreated: (object: any) => void
  onCancel: () => void
}

const PROPERTY_TYPES = ['Lägenhet', 'Villa', 'Radhus', 'Tomt', 'Fritidshus', 'Lokal']

export default function NewObjectForm({ onCreated, onCancel }: NewObjectFormProps) {
  const [form, setForm] = useState({
    address: '',
    area: '',
    type: 'Lägenhet',
    size: '',
    price: '',
    details: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const detailsRef = useRef<HTMLTextAreaElement>(null)

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function appendDetail(text: string) {
    setForm((f) => {
      const current = f.details.trim()
      const separator = current ? '\n' : ''
      return { ...f, details: current + separator + text }
    })
    setTimeout(() => {
      if (detailsRef.current) {
        detailsRef.current.scrollTop = detailsRef.current.scrollHeight
      }
    }, 50)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        size: Number(form.size),
        price: Number(form.price.replace(/\s/g, '')),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Något gick fel')
      setLoading(false)
      return
    }

    onCreated(data.object)
  }

  return (
    <div className="h-full overflow-y-auto">

      {/* Header */}
      <div className="border-b border-line px-8 py-6">
        <h2 className="font-display text-[36px] leading-[0.95] tracking-[-0.02em] text-ink">
          Nytt objekt.
        </h2>
        <p className="font-data text-[11px] text-mute tracking-snug mt-2">
          Fyll i uppgifterna — texter genereras automatiskt efter sparandet
        </p>
      </div>

      {/* Two-col: form left, location note right */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-[1fr_300px] divide-y lg:divide-y-0 lg:divide-x divide-line"
      >
        {/* Left: form fields */}
        <div className="px-8 py-6 space-y-6">

          <FormField label="Adress">
            <input
              required
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className="w-full bg-transparent border-b border-line focus:border-ink outline-none py-2 text-[15px] text-ink placeholder:text-mute-2 transition-colors"
              placeholder="Storgatan 12, 3 tr"
            />
          </FormField>

          <FormField label="Område">
            <input
              required
              value={form.area}
              onChange={(e) => update('area', e.target.value)}
              className="w-full bg-transparent border-b border-line focus:border-ink outline-none py-2 text-[15px] text-ink placeholder:text-mute-2 transition-colors"
              placeholder="Linnéstaden, Göteborg"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-6">
            <FormField label="Typ">
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="w-full bg-transparent border-b border-line focus:border-ink outline-none py-2 text-[15px] text-ink transition-colors appearance-none cursor-pointer"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Storlek (kvm)">
              <input
                required
                type="number"
                min="1"
                value={form.size}
                onChange={(e) => update('size', e.target.value)}
                className="w-full bg-transparent border-b border-line focus:border-ink outline-none py-2 text-[15px] text-ink placeholder:text-mute-2 transition-colors"
                placeholder="85"
              />
            </FormField>
          </div>

          <FormField label="Utgångspris (kr)">
            <input
              required
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              className="w-full bg-transparent border-b border-line focus:border-ink outline-none py-2 text-[15px] text-ink placeholder:text-mute-2 transition-colors"
              placeholder="4 950 000"
            />
          </FormField>

          <FormField label="Detaljer & säljargument">
            <textarea
              ref={detailsRef}
              required
              rows={7}
              value={form.details}
              onChange={(e) => update('details', e.target.value)}
              className="w-full bg-transparent border border-line rounded-lg focus:border-ink outline-none px-3 py-3 text-[14px] text-ink placeholder:text-mute-2 transition-colors resize-none mt-1"
              placeholder={"3 rok, ljus och luftig, nyrenoverat kök 2023, parkett i alla rum...\n\nKlicka på platsargumenten till höger för att lägga till dem."}
            />
          </FormField>

          {error && (
            <p className="font-data text-[11px] text-accent tracking-snug">{error}</p>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-ink text-bg px-6 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {loading ? 'Sparar…' : 'Spara objekt'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="font-data text-[11px] text-mute hover:text-ink transition-colors tracking-snug"
            >
              Avbryt
            </button>
          </div>
        </div>

        {/* Right: location analysis */}
        <div className="px-6 py-6">
          <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-4">
            Platsanalys
          </p>
          <LocationCard
            address={form.address}
            area={form.area}
            onInclude={appendDetail}
          />
          {!form.address && !form.area && (
            <p className="font-data text-[10px] text-mute-2 tracking-snug leading-relaxed">
              Fyll i adress och område — platsen analyseras automatiskt.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-data text-[10px] text-mute tracking-[0.02em] uppercase block mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}
