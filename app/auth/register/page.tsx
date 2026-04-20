'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

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

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()

    // Step 1: client-side signUp so session cookies are set correctly
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Step 2: create agency server-side via admin client (bypasses RLS,
    // works even when email confirmation is required and session is null)
    if (data.user) {
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

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111111] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl text-[#f0ece4] tracking-tight mb-2">PropCopy</h1>
          <p className="text-sm text-[#888] font-light">Skapa ett konto för din byrå</p>
        </div>

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
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
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
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
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
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
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
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
              placeholder="Minst 8 tecken"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#b8965a] hover:bg-[#d4b07a] text-[#111111] font-medium py-3 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Skapar konto…' : 'Skapa konto'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#555]">
          Har du redan konto?{' '}
          <Link href="/auth/login" className="text-[#b8965a] hover:text-[#d4b07a] transition-colors">
            Logga in
          </Link>
        </p>
      </div>
    </div>
  )
}
