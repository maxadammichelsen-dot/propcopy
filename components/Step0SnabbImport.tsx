'use client'

import { useEffect, useRef, useState } from 'react'
import type { PropertyObject } from '@/types'

const PROGRESS_TEXTS = [
  'Läser objektsbeskrivning…',
  'Tolkar fält…',
  'Verifierar data…',
]

const PDF_ACCEPT = '.pdf,application/pdf'
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,image/*'

export interface ImportPayload {
  fields: Partial<PropertyObject>
  confidence: Record<string, number>
  source: string
}

interface Step0SnabbImportProps {
  onImportDone: (payload: ImportPayload, images: File[]) => void
  onSkip: () => void
  onCancel: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function isAllowedImage(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(file.name)
}

export default function Step0SnabbImport({ onImportDone, onSkip, onCancel }: Step0SnabbImportProps) {
  const [pdf, setPdf] = useState<File | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [pdfDrag, setPdfDrag] = useState(false)
  const [imgDrag, setImgDrag] = useState(false)
  const [running, setRunning] = useState(false)
  const [progressIdx, setProgressIdx] = useState(0)
  const [error, setError] = useState('')
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setProgressIdx(i => (i + 1) % PROGRESS_TEXTS.length)
    }, 1200)
    return () => clearInterval(id)
  }, [running])

  function handlePdfFiles(list: FileList | File[]) {
    const arr = Array.from(list).filter(isPdf)
    if (arr.length > 0) {
      setPdf(arr[0])
      setError('')
    }
  }

  function handleImageFiles(list: FileList | File[]) {
    const arr = Array.from(list).filter(isAllowedImage)
    if (arr.length > 0) setImages(prev => [...prev, ...arr])
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  async function runImport() {
    if (!pdf || running) return
    setRunning(true)
    setError('')
    setProgressIdx(0)
    try {
      const formData = new FormData()
      formData.append('file', pdf)
      formData.append('source', 'pdf')
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Import misslyckades')
      }
      onImportDone(
        { fields: data.fields ?? {}, confidence: data.confidence ?? {}, source: data.source ?? 'pdf' },
        images,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import misslyckades')
      setRunning(false)
    }
  }

  const canRun = !!pdf && !running

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      {/* ── Header ────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', borderBottom: '1px solid var(--tint)',
      }}>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)', letterSpacing: '-0.01em' }}>
          Nytt objekt — snabbimport
        </span>
      </div>

      {/* ── Body ──────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: '48px', left: 0, right: 0, bottom: '60px',
        padding: '24px 40px', display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '28px', fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)',
        }}>
          <span>Steg 0 — valfritt</span>
          <span style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>Snabbimport</span>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.024em', lineHeight: 1.2, color: 'var(--ink)' }}>
            Spara tid — importera från PDF.
          </h1>
          <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--mute)', letterSpacing: '-0.01em' }}>
            Dra in objektsbeskrivningen från Vitec eller Mspecs så förifyller vi Steg 1–3.
            Bilder kan läggas in nu eller senare i Steg 4.
          </p>
        </div>

        {/* Hidden inputs */}
        <input
          ref={pdfInputRef} type="file" accept={PDF_ACCEPT} style={{ display: 'none' }}
          onChange={e => { if (e.target.files) handlePdfFiles(e.target.files); e.currentTarget.value = '' }}
        />
        <input
          ref={imgInputRef} type="file" accept={IMAGE_ACCEPT} multiple style={{ display: 'none' }}
          onChange={e => { if (e.target.files) handleImageFiles(e.target.files); e.currentTarget.value = '' }}
        />

        {/* PDF drop zone */}
        <div
          onClick={() => !pdf && !running && pdfInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!running) setPdfDrag(true) }}
          onDragLeave={() => setPdfDrag(false)}
          onDrop={e => {
            e.preventDefault(); e.stopPropagation(); setPdfDrag(false)
            if (!running) handlePdfFiles(e.dataTransfer.files)
          }}
          style={{
            border: `2px dashed ${pdfDrag ? 'var(--ink)' : pdf ? 'var(--line-2)' : 'var(--line)'}`,
            borderRadius: '10px',
            padding: '32px 24px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: pdf || running ? 'default' : 'pointer',
            background: pdfDrag ? 'var(--tint)' : 'var(--bg)',
            transition: 'border-color 0.15s, background 0.15s',
            minHeight: '180px', marginBottom: '16px',
          }}
        >
          {pdf ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', maxWidth: '520px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '6px',
                background: 'var(--tint)', border: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--ink)', letterSpacing: '0.04em',
              }}>
                PDF
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', color: 'var(--ink)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pdf.name}
                </p>
                <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)', marginTop: '2px' }}>
                  {formatBytes(pdf.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setPdf(null); setError('') }}
                disabled={running}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid var(--line)', background: 'var(--bg)',
                  fontSize: '12px', color: 'var(--mute)', cursor: running ? 'default' : 'pointer',
                  fontFamily: 'inherit', letterSpacing: '-0.01em',
                }}
              >
                Ta bort
              </button>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '24px', lineHeight: 1 }}>📄</span>
              <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                {pdfDrag ? 'Släpp PDF:en här' : 'Dra hit objektsbeskrivning från Vitec/Mspecs (PDF)'}
              </span>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>
                Endast .pdf — klicka för att välja
              </span>
            </>
          )}
        </div>

        {/* Image drop zone */}
        <div
          onClick={() => !running && imgInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!running) setImgDrag(true) }}
          onDragLeave={() => setImgDrag(false)}
          onDrop={e => {
            e.preventDefault(); e.stopPropagation(); setImgDrag(false)
            if (!running) handleImageFiles(e.dataTransfer.files)
          }}
          style={{
            border: `2px dashed ${imgDrag ? 'var(--ink)' : 'var(--line)'}`,
            borderRadius: '10px',
            padding: '20px 24px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: running ? 'default' : 'pointer',
            background: imgDrag ? 'var(--tint)' : 'var(--bg)',
            transition: 'border-color 0.15s, background 0.15s',
            minHeight: '110px',
          }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>📷</span>
          <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 500, letterSpacing: '-0.01em' }}>
            {imgDrag
              ? 'Släpp bilderna här'
              : images.length > 0
                ? `${images.length} bild${images.length === 1 ? '' : 'er'} valda`
                : 'Dra hit bilder (valfritt — kan göras senare också)'}
          </span>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>
            JPEG · PNG · WEBP · HEIC
          </span>
        </div>

        {/* Image thumbnails */}
        {images.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {images.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px 6px 10px',
                  border: '1px solid var(--line)', borderRadius: '6px', background: 'var(--tint)',
                  fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--ink)',
                }}
              >
                <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <span style={{ color: 'var(--mute)' }}>{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeImage(idx) }}
                  disabled={running}
                  style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', border: 'none',
                    cursor: running ? 'default' : 'pointer', color: '#fff',
                    fontSize: '11px', lineHeight: '18px', padding: 0, textAlign: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Progress overlay */}
        {running && (
          <div style={{
            marginTop: '24px', padding: '20px',
            border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--tint)',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                {PROGRESS_TEXTS[progressIdx]}
              </span>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>
                Snabbimport pågår
              </span>
            </div>
            <div style={{ position: 'relative', height: '4px', borderRadius: '2px', background: 'var(--line)', overflow: 'hidden' }}>
              <span style={{
                position: 'absolute', top: 0, left: 0, height: '100%', width: '40%',
                background: 'var(--ink)', borderRadius: '2px',
                animation: 'step0SnabbImportShimmer 1.4s ease-in-out infinite',
              }} />
            </div>
            <style>{`
              @keyframes step0SnabbImportShimmer {
                0%   { left: -40%; }
                100% { left: 100%; }
              }
            `}</style>
          </div>
        )}

        {/* Error */}
        {error && !running && (
          <div style={{
            marginTop: '16px', padding: '12px 14px',
            border: '1px solid var(--accent)', borderRadius: '8px',
            background: 'rgba(220,38,38,0.04)', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--accent)', letterSpacing: '-0.01em' }}>
              {error}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onSkip}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid var(--line)', background: 'var(--bg)',
                  fontSize: '12px', color: 'var(--mute)', cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '-0.01em',
                }}
              >
                Hellre fylla i manuellt
              </button>
              <button
                type="button"
                onClick={runImport}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  border: '1px solid var(--ink)', background: 'var(--ink)',
                  fontSize: '12px', color: '#fff', cursor: 'pointer', fontWeight: 500,
                  fontFamily: 'inherit', letterSpacing: '-0.01em',
                }}
              >
                Försök igen
              </button>
            </div>
          </div>
        )}

        {/* Skip link */}
        <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onSkip}
            disabled={running}
            style={{
              background: 'transparent', border: 'none',
              fontFamily: "'Geist Mono', monospace", fontSize: '12px',
              color: 'var(--mute)', cursor: running ? 'default' : 'pointer',
              letterSpacing: '-0.01em', padding: '8px 12px',
              textDecoration: 'underline', textUnderlineOffset: '3px',
            }}
          >
            Hellre fylla i manuellt →
          </button>
        </div>
      </div>

      {/* ── Footbar ───────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
        borderTop: '1px solid var(--line)', background: 'var(--bg)',
        display: 'grid', gridTemplateColumns: '1fr auto auto',
        alignItems: 'center', padding: '0 16px', gap: '12px',
      }}>
        <span />
        <button
          type="button"
          onClick={onCancel}
          disabled={running}
          style={{
            padding: '8px 14px', border: '1px solid var(--line)', borderRadius: '6px',
            fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', background: 'var(--bg)',
            cursor: running ? 'default' : 'pointer', letterSpacing: '-0.01em', fontFamily: 'inherit',
          }}
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={runImport}
          disabled={!canRun}
          style={{
            padding: '8px 14px',
            border: `1px solid ${canRun ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: '6px', fontSize: '13px', fontWeight: 500,
            background: canRun ? 'var(--accent)' : 'var(--line)',
            color: canRun ? '#fff' : 'var(--mute)',
            cursor: canRun ? 'pointer' : 'default',
            transition: 'background 0.15s, border-color 0.15s',
            letterSpacing: '-0.01em', fontFamily: 'inherit',
          }}
        >
          {running ? 'Importerar…' : 'Kör snabbimport →'}
        </button>
      </div>
    </div>
  )
}
