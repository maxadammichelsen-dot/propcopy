'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

const LOADING_STEPS = [
  'Skapar konto…',
  'Förbereder din byrå…',
  'Hämtar varumärkesdata…',
  'Nästan klart…',
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '',
    password: '',
    agency_name: '',
    agency_url: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setLoadingStep(0)

    const supabase = createSupabaseBrowserClient()

    // Step 1 – create auth user (session cookies set via createBrowserClient)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Steps 2–3 – create agency + auto-scrape branding server-side
    // (admin client bypasses RLS, works regardless of email confirmation)
    setLoadingStep(1)
    if (data.user) {
      setLoadingStep(2)
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup_agency',
          user_id: data.user.id,
          agency_name: form.agency_name,
          agency_url: form.agency_url,
        }),
      })
    }

    setLoadingStep(3)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111111] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl text-[#f0ece4] tracking-tight mb-2">Estatio</h1>
          <p className="text-sm text-[#888] font-light">Skapa ett konto för din byrå</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-[var(--brand-accent,#b8965a)] rounded-full animate-spin" />
            <div className="space-y-2 w-full">
              {LOADING_STEPS.map((step, i) => (
                <div
                  key={step}
                  className="flex items-center gap-3 transition-opacity duration-300"
                  style={{ opacity: i <= loadingStep ? 1 : 0.2 }}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    {i < loadingStep ? (
                      <span className="text-[var(--brand-accent,#b8965a)] text-sm">✓</span>
                    ) : i === loadingStep ? (
                      <div className="w-2.5 h-2.5 border border-[var(--brand-accent,#b8965a)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
                    )}
                  </div>
                  <span className={`text-sm ${i < loadingStep ? 'text-[#555]' : i === loadingStep ? 'text-[#f0ece4]' : 'text-[#333]'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs text-[#888] uppercase tracking-widest mb-1.5">
                Byråns namn
              </label>
              <input
                type="text"
                required
                value={form.agency_name}
                onChange={(e) => update('agency_name', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[var(--brand-accent,#b8965a)] transition-colors"
                placeholder="Svärdegård Kullbo & Co"
              />
            </div>

            <div>
              <label className="block text-xs text-[#888] uppercase tracking-widest mb-1.5">
                Byråns hemsida
              </label>
              <input
                type="text"
                value={form.agency_url}
                onChange={(e) => update('agency_url', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[var(--brand-accent,#b8965a)] transition-colors"
                placeholder="svardegardkullbo.se"
              />
            </div>

            <div>
              <label className="block text-xs text-[#888] uppercase tracking-widest mb-1.5">
                E-post
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[var(--brand-accent,#b8965a)] transition-colors"
                placeholder="namn@byrå.se"
              />
            </div>

            <div>
              <label className="block text-xs text-[#888] uppercase tracking-widest mb-1.5">
                Lösenord
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[var(--brand-accent,#b8965a)] transition-colors"
                placeholder="Minst 8 tecken"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full bg-[var(--brand-accent,#b8965a)] hover:opacity-90 text-[#111111] font-medium py-3 rounded text-sm transition-opacity"
            >
              Skapa konto
            </button>
          </form>
        )}

        {!loading && (
          <p className="mt-6 text-center text-sm text-[#555]">
            Har du redan konto?{' '}
            <Link href="/auth/login" className="text-[var(--brand-accent,#b8965a)] hover:opacity-80 transition-opacity">
              Logga in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
