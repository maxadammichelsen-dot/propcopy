'use client'

/**
 * <Placeholder /> — animated shape placeholder card.
 *
 * The card matches an internal mockup (purple gradient, "PLACEHOLDER"
 * lockup, design-tool tick annotations). The centered shape cycles
 * through a fixed loop: sphere → cube → torus → pyramid → capsule.
 *
 * Midjourney prompt (used to generate the static reference artwork the
 * looping animation is modelled on):
 *
 *   /imagine prompt: matte 3d render of a single soft purple sphere
 *   centered on a violet-to-indigo gradient card, subtle film grain,
 *   minimal swiss design, small white serif word "PLACEHOLDER" below
 *   the sphere, tiny pink ink splash near the lower edge, faint
 *   designer crosshair tick marks at +333 and +300 in the right margin,
 *   octane render, soft studio rim light, 1:1 aspect, muted analogue
 *   palette, editorial mood, 8k --ar 1:1 --style raw --v 6
 */

import { useEffect, useState } from 'react'

const SHAPES = ['sphere', 'cube', 'torus', 'pyramid', 'capsule'] as const
type Shape = (typeof SHAPES)[number]

interface PlaceholderProps {
  intervalMs?: number
  size?: number
  label?: string
  sublabel?: string
  caption?: string
}

export default function Placeholder({
  intervalMs = 1600,
  size = 200,
  label = 'PLACEHOLDER',
  sublabel = 'spooky pretty',
  caption = 'Vol 1 · For Reno',
}: PlaceholderProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(i => (i + 1) % SHAPES.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  const shape = SHAPES[index]

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 18,
        overflow: 'hidden',
        background:
          'radial-gradient(120% 90% at 30% 20%, #8c7bd4 0%, #6b58c3 45%, #3f3494 100%)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 14px 30px -10px rgba(60,40,140,0.45)',
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        color: '#f0ece4',
        userSelect: 'none',
      }}
    >
      <ShapeStage shape={shape} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'rgba(240,236,228,0.85)',
          }}
        >
          {label}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(240,236,228,0.7)' }}>
            {sublabel}
          </span>
          <span style={{ fontSize: 8.5, letterSpacing: '0.08em', color: 'rgba(240,236,228,0.5)' }}>
            {caption}
          </span>
        </div>
      </div>

      {/* Pink ink splash */}
      <span
        style={{
          position: 'absolute',
          bottom: '38%',
          left: '52%',
          width: 14,
          height: 4,
          borderRadius: 8,
          background: '#ff6a8b',
          transform: 'rotate(-12deg)',
          opacity: 0.85,
          filter: 'blur(0.3px)',
        }}
      />

      <Tick label="+ 333" top="32%" />
      <Tick label="+ 300" top="68%" />
    </div>
  )
}

function Tick({ label, top }: { label: string; top: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 6,
        top,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 8,
        letterSpacing: '0.06em',
        color: 'rgba(240,236,228,0.6)',
      }}
    >
      <span style={{ width: 6, height: 1, background: 'rgba(240,236,228,0.55)' }} />
      {label}
    </div>
  )
}

function ShapeStage({ shape }: { shape: Shape }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 120 120" width="58%" height="58%" aria-hidden>
        <defs>
          <radialGradient id="shape-fill" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#e3dcff" />
            <stop offset="55%" stopColor="#9d8be0" />
            <stop offset="100%" stopColor="#4a3aa6" />
          </radialGradient>
        </defs>
        <g
          style={{
            transition: 'opacity 280ms ease, transform 480ms cubic-bezier(.5,.05,.2,1)',
          }}
        >
          <Shape kind={shape} />
        </g>
      </svg>
    </div>
  )
}

function Shape({ kind }: { kind: Shape }) {
  const fill = 'url(#shape-fill)'
  switch (kind) {
    case 'sphere':
      return <circle cx="60" cy="60" r="42" fill={fill} />
    case 'cube':
      return <rect x="20" y="20" width="80" height="80" rx="10" fill={fill} />
    case 'torus':
      return (
        <g fill={fill}>
          <circle cx="60" cy="60" r="42" />
          <circle cx="60" cy="60" r="18" fill="#3f3494" />
        </g>
      )
    case 'pyramid':
      return <polygon points="60,16 102,100 18,100" fill={fill} />
    case 'capsule':
      return <rect x="20" y="38" width="80" height="44" rx="22" fill={fill} />
  }
}
