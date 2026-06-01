'use client'

import { useActionState } from 'react'
import { cambiarPasswordAction, actualizarNombreAction } from '@/app/actions/cambiar-password'
import { CheckCircle2, AlertCircle, Lock, User } from 'lucide-react'

interface Props {
  currentName: string
}

export function CambiarPasswordForm({ currentName }: Props) {
  const [passState, passAction, passPending] = useActionState(cambiarPasswordAction, null)
  const [nameState, nameAction, namePending] = useActionState(actualizarNombreAction, null)

  return (
    <div className="max-w-md space-y-6">
      {/* Nombre */}
      <div className="border-border bg-card rounded-xl border p-6">
        <div className="mb-5 flex items-center gap-2">
          <User className="text-muted-foreground h-4 w-4" />
          <h2 className="text-foreground text-base font-semibold">Nombre</h2>
        </div>

        {nameState?.ok && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Nombre actualizado.
          </div>
        )}
        {nameState && !nameState.ok && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {nameState.error}
          </div>
        )}

        <form action={nameAction} className="space-y-4">
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">
              Nombre completo
            </label>
            <input
              type="text"
              name="name"
              defaultValue={currentName}
              required
              minLength={2}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={namePending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {namePending ? 'Guardando...' : 'Actualizar nombre'}
          </button>
        </form>
      </div>

      {/* Contraseña */}
      <div className="border-border bg-card rounded-xl border p-6">
        <div className="mb-5 flex items-center gap-2">
          <Lock className="text-muted-foreground h-4 w-4" />
          <h2 className="text-foreground text-base font-semibold">Cambiar contraseña</h2>
        </div>

        {passState?.ok && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Contraseña actualizada.
          </div>
        )}
        {passState && !passState.ok && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {passState.error}
          </div>
        )}

        <form action={passAction} className="space-y-4">
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">
              Contraseña actual
            </label>
            <input
              type="password"
              name="currentPassword"
              required
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">
              Nueva contraseña
            </label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
            <p className="text-muted-foreground mt-1 text-xs">Mínimo 8 caracteres</p>
          </div>
          <button
            type="submit"
            disabled={passPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {passPending ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
