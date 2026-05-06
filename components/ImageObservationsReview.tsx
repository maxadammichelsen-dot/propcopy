'use client'

import { useState, useCallback } from 'react'
import type { ImageWithObservations, ImageObservation } from '@/types'

interface Props {
  imageGroups: ImageWithObservations[]
  onDone: (groups: ImageWithObservations[]) => void
}

const OBSERVATION_TYPE_LABELS: Record<string, string> = {
  material_floor:   'Golv',
  material_counter: 'Bänkskiva',
  material_wall:    'Vägg',
  fixture:          'Fast inredning',
  feature:          'Särdrag',
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  vardagsrum: 'Vardagsrum',
  kok:        'Kök',
  badrum:     'Badrum',
  sovrum:     'Sovrum',
  hall:       'Hall',
  matplats:   'Matplats',
  uteplats:   'Uteplats',
  okand:      'Okänt rum',
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.90) return 'bg-green-100 text-green-800'
  if (confidence >= 0.75) return 'bg-yellow-100 text-yellow-800'
  return 'bg-orange-100 text-orange-800'
}

export default function ImageObservationsReview({ imageGroups, onDone }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [groups, setGroups] = useState<ImageWithObservations[]>(() =>
    // Filter out overview images (0 observations) — only show images with something to review
    imageGroups
      .filter(g => g.observations.length > 0)
      .map(g => ({
        ...g,
        observations: g.observations.map(o => ({ ...o, status: 'confirmed' as const })),
      }))
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const currentGroup = groups[currentIdx]
  const total = groups.length

  const patchObservation = useCallback(async (
    obs: ImageObservation,
    update: { status?: 'confirmed' | 'rejected'; value?: string }
  ) => {
    setSaving(s => ({ ...s, [obs.id]: true }))
    try {
      await fetch(`/api/image-observations/${obs.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
    } catch (err) {
      console.error('[ImageObservationsReview] patch failed:', err)
    } finally {
      setSaving(s => ({ ...s, [obs.id]: false }))
    }
  }, [])

  const toggleStatus = useCallback((imgIdx: number, obsId: string) => {
    setGroups(prev => {
      const next = prev.map((g, gi) => {
        if (gi !== imgIdx) return g
        return {
          ...g,
          observations: g.observations.map(o => {
            if (o.id !== obsId) return o
            const newStatus = o.status === 'confirmed' ? 'rejected' as const : 'confirmed' as const
            // Fire-and-forget optimistic update
            patchObservation(o, { status: newStatus })
            return { ...o, status: newStatus }
          }),
        }
      })
      return next
    })
  }, [patchObservation])

  const startEdit = useCallback((obs: ImageObservation) => {
    setEditingId(obs.id)
    setEditValue(obs.value)
  }, [])

  const commitEdit = useCallback((imgIdx: number, obs: ImageObservation) => {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === obs.value) {
      setEditingId(null)
      return
    }
    setGroups(prev =>
      prev.map((g, gi) => {
        if (gi !== imgIdx) return g
        return {
          ...g,
          observations: g.observations.map(o => {
            if (o.id !== obs.id) return o
            patchObservation(o, { value: trimmed })
            return { ...o, value: trimmed }
          }),
        }
      })
    )
    setEditingId(null)
  }, [editValue, patchObservation])

  const handleNext = () => {
    if (currentIdx < total - 1) {
      setCurrentIdx(i => i + 1)
      setEditingId(null)
    } else {
      onDone(groups)
    }
  }

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1)
      setEditingId(null)
    }
  }

  const confirmedCount = currentGroup.observations.filter(o => o.status === 'confirmed').length

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <h2 className="font-semibold text-gray-900">Granska bildanalys</h2>
          <p className="text-sm text-gray-500">
            Bild {currentIdx + 1} av {total} — {confirmedCount} av{' '}
            {currentGroup.observations.length} bekräftade
          </p>
        </div>
        <button
          onClick={() => onDone(groups)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Stäng utan att spara
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {currentGroup.signed_url ? (
            <img
              src={currentGroup.signed_url}
              alt={`Bild ${currentIdx + 1}`}
              className="w-full rounded-lg object-cover max-h-72"
            />
          ) : (
            <div className="w-full h-48 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              Ingen förhandsvisning
            </div>
          )}

          {/* Room type badge */}
          {currentGroup.observations[0]?.room_type && (
            <p className="text-sm text-gray-500">
              Rum:{' '}
              <span className="font-medium text-gray-700">
                {ROOM_TYPE_LABELS[currentGroup.observations[0].room_type] ??
                  currentGroup.observations[0].room_type}
              </span>
            </p>
          )}

          {/* Observations list */}
          {currentGroup.observations.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Inga observationer för denna bild.</p>
          ) : (
            <ul className="space-y-2">
              {currentGroup.observations.map(obs => {
                const isConfirmed = obs.status === 'confirmed'
                const isEditing = editingId === obs.id
                const isSaving = saving[obs.id]

                return (
                  <li
                    key={obs.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isConfirmed
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    {/* Confirm/reject toggle */}
                    <button
                      onClick={() => toggleStatus(currentIdx, obs.id)}
                      disabled={isSaving}
                      className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold transition-colors ${
                        isConfirmed
                          ? 'bg-green-500 text-white hover:bg-red-400'
                          : 'bg-gray-300 text-gray-500 hover:bg-green-400 hover:text-white'
                      }`}
                      title={isConfirmed ? 'Klicka för att avvisa' : 'Klicka för att bekräfta'}
                    >
                      {isConfirmed ? '✓' : '✗'}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">
                          {OBSERVATION_TYPE_LABELS[obs.observation_type] ?? obs.observation_type}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${confidenceColor(obs.confidence)}`}
                        >
                          {Math.round(obs.confidence * 100)}%
                        </span>
                      </div>
                      {isEditing ? (
                        <div className="mt-1 flex gap-2">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitEdit(currentIdx, obs)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <button
                            onClick={() => commitEdit(currentIdx, obs)}
                            className="text-sm text-blue-600 font-medium"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{obs.value}</p>
                      )}
                    </div>

                    {/* Edit button */}
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(obs)}
                        className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0"
                        title="Redigera värde"
                      >
                        ✎
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="border-t bg-white px-4 py-3 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Föregående
        </button>

        <button
          onClick={handleNext}
          className="px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {currentIdx < total - 1 ? `Nästa bild →` : 'Klar'}
        </button>
      </div>
    </div>
  )
}
