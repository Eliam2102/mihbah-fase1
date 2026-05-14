'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
    <div className="border-border bg-card rounded-2xl border p-8 shadow-sm">
      {/* Logo + brand */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-900">
          <Image
            src="/logo_jade.png"
            alt="Jade"
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
        <div className="text-center">
          <h1 className="text-foreground text-xl font-bold">SIG Jade</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Inicia sesión en tu cuenta</p>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-foreground mb-1.5 block text-sm font-medium">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            placeholder="correo@empresa.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-foreground mb-1.5 block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>

        <div className="text-center">
          <a
            href="/recuperar"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
      </form>
    </div>
  )
}
