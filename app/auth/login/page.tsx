'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Felaktig e-post eller lösenord')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111111] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl text-[#f0ece4] tracking-tight mb-2">PropCopy</h1>
          <p className="text-sm text-[#888] font-light">Logga in på ditt konto</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-[#888] uppercase tracking-widest mb-1.5">
              E-post
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#b8965a] hover:bg-[#d4b07a] text-[#111111] font-medium py-3 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loggar in…' : 'Logga in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#555]">
          Inget konto?{' '}
          <Link href="/auth/register" className="text-[#b8965a] hover:text-[#d4b07a] transition-colors">
            Registrera byrå
          </Link>
        </p>
      </div>
    </div>
  )
}
