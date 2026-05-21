'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth/client'
import { Loader2, LogIn, Wallet, ShieldCheck } from 'lucide-react'

export default function PortalLoginPage() {
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const data = new FormData(e.currentTarget)
    const email = data.get('email') as string
    const password = data.get('password') as string

    const result = await authClient.signIn.email({ email, password })

    if (result.error) {
      setError('Correo o contraseña incorrectos.')
      setPending(false)
      return
    }

    // Hard reload: fuerza fresh server render con sesión nueva, evita reusar
    // árbol RSC cacheado de un usuario anterior.
    window.location.replace('/portal/dashboard')
  }

  return (
    <div className="-mx-4 -my-6 grid min-h-[calc(100vh-7rem)] place-items-center sm:-mx-6 sm:-my-8 lg:-mx-8">
      <div className="w-full max-w-sm">
        <div className="bg-card relative overflow-hidden rounded-2xl border shadow-lg">
          <div className="from-primary via-jade-600 to-jade-700 relative h-24 bg-gradient-to-br p-6 text-white">
            <div className="bg-jade-300/20 absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl" />
            <div className="relative inline-flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
                <Wallet className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-[11px] font-medium opacity-90">SIG Jade</p>
                <p className="text-sm font-bold">Portal de comisiones</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            <h1 className="text-foreground text-lg font-bold">Bienvenido</h1>
            <p className="text-muted-foreground mt-1 text-xs">
              Acceso para líderes de alianza y asesores BM CORP.
            </p>

            {callbackError === 'no-portal-account' && (
              <div className="border-warning/40 bg-warning/10 text-warning mt-4 rounded-md border p-3 text-xs">
                Tu cuenta no tiene perfil del portal. Contacta a Joana.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              <div>
                <label htmlFor="email" className="text-foreground mb-1.5 block text-xs font-medium">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  placeholder="tu@correo.com"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="text-foreground mb-1.5 block text-xs font-medium"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-2.5 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium shadow-sm disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {pending ? 'Entrando...' : 'Entrar al portal'}
              </button>
            </form>

            <div className="text-muted-foreground mt-5 flex items-center justify-center gap-1.5 text-[11px]">
              <ShieldCheck className="text-success h-3 w-3" />
              Conexión cifrada
            </div>

            <p className="text-muted-foreground mt-3 text-center text-[11px]">
              ¿Eres administrador interno?{' '}
              <a href="/login" className="text-primary hover:underline">
                Login admin
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
