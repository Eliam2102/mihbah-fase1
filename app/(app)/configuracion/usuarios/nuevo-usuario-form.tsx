'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { actionCreateUserFromForm } from '@/app/actions/admin-user'
import { Users } from 'lucide-react'

interface Props {
  empresas: { id: string; name: string }[]
}

export function NuevoUsuarioForm({ empresas }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [empresaIds, setEmpresaIds] = useState<string[]>([])
  const [state, action, pending] = useActionState(
    async (
      prev: Awaited<ReturnType<typeof actionCreateUserFromForm>> | null,
      formData: FormData,
    ) => {
      const result = await actionCreateUserFromForm(prev, formData)
      if (result?.ok) {
        setOpen(false)
        setEmpresaIds([])
        router.refresh()
      }
      return result
    },
    null,
  )

  function toggleEmpresa(id: string) {
    setEmpresaIds((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]))
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border-border bg-card hover:bg-muted flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm font-medium"
      >
        <Users className="text-muted-foreground h-4 w-4" />
        Crear nuevo usuario
      </button>
    )
  }

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">Nuevo usuario</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Cancelar
        </button>
      </div>

      <form action={action} className="space-y-4">
        {/* Hidden inputs para empresaIds (FormData.getAll soporta múltiples) */}
        {empresaIds.map((id) => (
          <input key={id} type="hidden" name="empresaIds" value={id} />
        ))}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Nombre</label>
            <input
              name="name"
              type="text"
              required
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              required
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Contraseña temporal
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Rol</label>
            <select
              name="role"
              defaultValue="user"
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            >
              <option value="super_admin">
                Super Admin — Control total + aprobación de pagos (Carla, Jorge)
              </option>
              <option value="admin">
                Administración Financiera — Dispersión y operación (Joana)
              </option>
              <option value="tesoreria">Tesorería — Solo pagos y comprobantes</option>
              <option value="viewer">Dirección / Consulta Global — Solo lectura</option>
            </select>
          </div>
        </div>

        {empresas.length > 0 && (
          <div>
            <label className="text-foreground mb-2 block text-sm font-medium">
              Acceso a empresas
            </label>
            <div className="flex flex-wrap gap-2">
              {empresas.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleEmpresa(e.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    empresaIds.includes(e.id)
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-border text-muted-foreground hover:border-green-600'
                  }`}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {state && !state.ok && state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>
    </div>
  )
}
