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
    // Scroll textarea to bottom so user sees the new line
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
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <h2 className="font-serif text-2xl text-[#f0ece4]">Nytt objekt</h2>
        <p className="text-xs text-[#555] mt-1">Fyll i objektets uppgifter</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Address + Area */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] text-[#888] uppercase tracking-widest mb-1.5">
              Adress
            </label>
            <input
              required
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2.5 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
              placeholder="Storgatan 12, 3 tr"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] text-[#888] uppercase tracking-widest mb-1.5">
              Område
            </label>
            <input
              required
              value={form.area}
              onChange={(e) => update('area', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2.5 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
              placeholder="Linnéstaden, Göteborg"
            />
          </div>
        </div>

        {/* Location analysis – auto-triggers when address + area are filled */}
        <LocationCard
          address={form.address}
          area={form.area}
          onInclude={appendDetail}
        />

        {/* Type + Size + Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-[#888] uppercase tracking-widest mb-1.5">
              Typ
            </label>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2.5 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[#888] uppercase tracking-widest mb-1.5">
              Storlek (kvm)
            </label>
            <input
              required
              type="number"
              min="1"
              value={form.size}
              onChange={(e) => update('size', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2.5 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
              placeholder="85"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] text-[#888] uppercase tracking-widest mb-1.5">
              Utgångspris (kr)
            </label>
            <input
              required
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2.5 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
              placeholder="4 950 000"
            />
          </div>
        </div>

        {/* Details */}
        <div>
          <label className="block text-[10px] text-[#888] uppercase tracking-widest mb-1.5">
            Detaljer & säljargument
          </label>
          <textarea
            ref={detailsRef}
            required
            rows={6}
            value={form.details}
            onChange={(e) => update('details', e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2.5 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors resize-none"
            placeholder="3 rok, ljus och luftig, nyrenoverat kök 2023, parkett i alla rum... Klicka på platsargumenten ovan för att lägga till dem här."
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-[#2a2a2a] rounded text-sm text-[#555] hover:text-[#f0ece4] hover:border-[#444] transition-colors"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-[#b8965a] hover:bg-[#d4b07a] text-[#111111] rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Sparar…' : 'Spara objekt'}
          </button>
        </div>
      </form>
    </div>
  )
}
