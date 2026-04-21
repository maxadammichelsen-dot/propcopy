import { Channel } from '@/types'

interface ChannelConfig {
  label: string
  color: string
  icon: React.ReactNode
}

function Letter({ children, font = 'serif' }: { children: string; font?: 'serif' | 'sans' | 'mono' }) {
  const fontFamily =
    font === 'serif' ? 'Georgia, "Times New Roman", serif' :
    font === 'mono'  ? "'Geist Mono', ui-monospace, monospace" :
                       "'Geist', system-ui, sans-serif"
  return (
    <span style={{ fontFamily, fontWeight: 700, fontSize: '13px', lineHeight: 1, userSelect: 'none' }}>
      {children}
    </span>
  )
}

function IconEnvelope() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
      <rect x="0.5" y="0.5" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 1.5L7 6.5L13 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
      <ellipse cx="7" cy="7" rx="2.8" ry="6" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M1 7h12M1.5 4h11M1.5 10h11" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  )
}

function IconRocket() {
  return (
    <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
      <path d="M6.5 1C9 1 11 3.5 11 6.5C11 9 9.5 11 8 12L6.5 13L5 12C3.5 11 2 9 2 6.5C2 3.5 4 1 6.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <circle cx="6.5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M4 11.5L2 13.5M9 11.5L11 13.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export const CHANNEL_CONFIG: Record<Channel, ChannelConfig> = {
  hemnet:         { label: 'Hemnet',         color: '#E02020', icon: <Letter font="serif">H</Letter> },
  hemnet_raket:   { label: 'Hemnet Raket',   color: '#E02020', icon: <IconRocket /> },
  meta:           { label: 'Meta Ads',       color: '#1877F2', icon: <Letter font="sans">M</Letter> },
  mail:           { label: 'E-post',         color: '#4B5563', icon: <IconEnvelope /> },
  website:        { label: 'Hemsida',        color: '#6366F1', icon: <IconGlobe /> },
  booli:          { label: 'Booli',          color: '#00A651', icon: <Letter font="sans">B</Letter> },
  boneo:          { label: 'Boneo',          color: '#FF6B00', icon: <Letter font="sans">B</Letter> },
  boneo_kommande: { label: 'Boneo Kommande', color: '#FF6B00', icon: <IconClock /> },
  hjem:           { label: 'Hjem',           color: '#1B2A4A', icon: <Letter font="serif">H</Letter> },
  bovision:       { label: 'Bovision',       color: '#6B46C1', icon: <Letter font="sans">B</Letter> },
}

interface ChannelBadgeProps {
  channel: Channel
  size?: number
}

export default function ChannelBadge({ channel, size = 28 }: ChannelBadgeProps) {
  const cfg = CHANNEL_CONFIG[channel]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '6px',
        background: `${cfg.color}18`,
        color: cfg.color,
        flexShrink: 0,
      }}
    >
      {cfg.icon}
    </span>
  )
}
