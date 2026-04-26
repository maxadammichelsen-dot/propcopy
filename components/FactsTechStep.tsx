'use client'

import { useState } from 'react'

const TENURE_OPTIONS   = ['Friköpt', 'Bostadsrätt', 'Tomträtt', 'Hyresrätt']
const ENERGY_OPTIONS   = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const STANDARD_OPTIONS = ['Normal', 'Hög', 'Mycket hög']
const HEATING_OPTIONS  = ['Bergvärme', 'Fjärrvärme', 'Direktverkande el', 'Vattenburen el', 'Pellets', 'Annat']
const VENTILATION_OPTIONS = ['FTX', 'Självdrag', 'Mekanisk frånluft', 'Annat']
const RENOV_SECTIONS   = [
  { key: 'kitchen',  label: 'Kök' },
  { key: 'bathroom', label: 'Bad' },
  { key: 'facade',   label: 'Fasad' },
]

export interface RenovationEntry { year: string; note: string }

interface Props {
  formData: Record<string, string>
  updateField: (field: string, value: string) => void
  renovations: Record<string, RenovationEntry>
  updateRenovation: (section: string, field: 'year' | 'note', value: string) => void
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: '14px',
  border: '1px solid var(--line)', borderRadius: '8px', outline: 'none',
  transition: 'border-color 0.15s', background: 'var(--bg)',
  color: 'var(--ink)', fontFamily: 'inherit',
}

const lbl: React.CSSProperties = {
  fontFamily: "'Geist Mono', monospace", fontSize: '10px',
  color: 'var(--mute)', letterSpacing: '0.04em', textTransform: 'uppercase',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  )
}

function focusOn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--ink)'
  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(10,10,9,0.04)'
}
function focusOff(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--line)'
  e.currentTarget.style.boxShadow   = 'none'
}

export default function FactsTechStep({ formData, updateField, renovations, updateRenovation }: Props) {
  const [renovOpen, setRenovOpen] = useState(false)

  const showPlotArea   = formData.tenure === 'Friköpt' || formData.tenure === 'Tomträtt'
  const showMonthlyFee = formData.tenure === 'Bostadsrätt'
  const renovFilled    = Object.values(renovations).filter(r => r.year).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', flex: 1, overflowY: 'auto' }}>

      {/* A – Upplåtelse & ekonomi */}
      <section>
        <p style={{ ...lbl, marginBottom: '12px' }}>Upplåtelse &amp; ekonomi</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Upplåtelseform">
            <select value={formData.tenure} onChange={e => updateField('tenure', e.target.value)}
              style={{ ...inp, appearance: 'none' as const, cursor: 'pointer' }}
              onFocus={focusOn} onBlur={focusOff}>
              {TENURE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Byggår">
            <input type="number" min="1700" max="2030" placeholder="2005"
              value={formData.construction_year} onChange={e => updateField('construction_year', e.target.value)}
              style={inp} onFocus={focusOn} onBlur={focusOff} />
          </Field>
          {showPlotArea && (
            <Field label="Tomtarea (m²)">
              <input type="number" min="1" placeholder="647"
                value={formData.plot_area} onChange={e => updateField('plot_area', e.target.value)}
                style={inp} onFocus={focusOn} onBlur={focusOff} />
            </Field>
          )}
          {showMonthlyFee && (
            <Field label="Månadsavgift (kr/mån)">
              <input type="number" min="0" placeholder="3 850"
                value={formData.monthly_fee} onChange={e => updateField('monthly_fee', e.target.value)}
                style={inp} onFocus={focusOn} onBlur={focusOff} />
            </Field>
          )}
          <Field label="Driftkostnad/år (kr)">
            <input type="number" min="0" placeholder="35 000"
              value={formData.operating_cost_yearly} onChange={e => updateField('operating_cost_yearly', e.target.value)}
              style={inp} onFocus={focusOn} onBlur={focusOff} />
          </Field>
          <Field label="Energiklass">
            <select value={formData.energy_class} onChange={e => updateField('energy_class', e.target.value)}
              style={{ ...inp, appearance: 'none' as const, cursor: 'pointer' }}
              onFocus={focusOn} onBlur={focusOff}>
              <option value="">Välj...</option>
              {ENERGY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {/* B – Rumsfördelning */}
      <section>
        <p style={{ ...lbl, marginBottom: '12px' }}>Rumsfördelning</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Sovrum">
            <input placeholder='3 eller "3-4"' value={formData.bedrooms}
              onChange={e => updateField('bedrooms', e.target.value)}
              style={inp} onFocus={focusOn} onBlur={focusOff} />
          </Field>
        </div>
      </section>

      {/* C – Standard & teknik */}
      <section>
        <p style={{ ...lbl, marginBottom: '12px' }}>Standard &amp; teknik</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Standardklass">
            <select value={formData.standard_class} onChange={e => updateField('standard_class', e.target.value)}
              style={{ ...inp, appearance: 'none' as const, cursor: 'pointer' }}
              onFocus={focusOn} onBlur={focusOff}>
              {STANDARD_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Uppvärmning">
            <select value={formData.heating} onChange={e => updateField('heating', e.target.value)}
              style={{ ...inp, appearance: 'none' as const, cursor: 'pointer' }}
              onFocus={focusOn} onBlur={focusOff}>
              <option value="">Välj...</option>
              {HEATING_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </Field>
          <Field label="Ventilation">
            <select value={formData.ventilation} onChange={e => updateField('ventilation', e.target.value)}
              style={{ ...inp, appearance: 'none' as const, cursor: 'pointer' }}
              onFocus={focusOn} onBlur={focusOff}>
              <option value="">Välj...</option>
              {VENTILATION_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Parkering">
            <input placeholder="Garage 2 platser + carport" value={formData.parking}
              onChange={e => updateField('parking', e.target.value)}
              style={inp} onFocus={focusOn} onBlur={focusOff} />
          </Field>
        </div>
      </section>

      {/* D – Renoveringar */}
      <section>
        <button
          type="button"
          onClick={() => setRenovOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '12px 14px',
            border: '1px solid var(--line)',
            borderRadius: renovOpen ? '8px 8px 0 0' : '8px',
            background: 'var(--bg)', cursor: 'pointer', textAlign: 'left',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--tint)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
        >
          <div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em', fontFamily: 'inherit' }}>
              Renoveringar
              {renovFilled > 0 && (
                <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 400, fontFamily: "'Geist Mono', monospace", color: '#16a34a' }}>
                  {renovFilled} ifyllda
                </span>
              )}
            </span>
            <p style={{ fontSize: '11px', color: 'var(--mute)', marginTop: '2px', fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.01em' }}>
              Frivilligt · Kök, bad, fasad
            </p>
          </div>
          <span style={{
            fontSize: '12px', color: 'var(--mute)', fontFamily: "'Geist Mono', monospace",
            transform: renovOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block',
          }}>▾</span>
        </button>

        {renovOpen && (
          <div style={{ border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {RENOV_SECTIONS.map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={lbl}>{label}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                  <input
                    type="number" min="1900" max="2030" placeholder="2019"
                    value={renovations[key]?.year ?? ''}
                    onChange={e => updateRenovation(key, 'year', e.target.value)}
                    style={inp}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
                  />
                  <input
                    placeholder="Kort beskrivning..."
                    value={renovations[key]?.note ?? ''}
                    onChange={e => updateRenovation(key, 'note', e.target.value)}
                    style={inp}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
