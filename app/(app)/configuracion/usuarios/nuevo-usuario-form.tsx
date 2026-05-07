'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actionCreateUser } from '@/app/actions/admin-user'
import { Users } from 'lucide-react'

interface Props {
  empresas: { id: string; name: string }[]
}

export function NuevoUsuarioForm({ empresas }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'super_admin' | 'admin' | 'user',
    empresaIds: [] as string[],
  })

  function toggleEmpresa(id: string) {
    setForm((f) => ({
      ...f,
      empresaIds: f.empresaIds.includes(id)
        ? f.empresaIds.filter((e) => e !== id)
        : [...f.empresaIds, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await actionCreateUser(form)
    setLoading(false)

    if (result.ok) {
      setOpen(false)
      setForm({ name: '', email: '', password: '', role: 'user', empresaIds: [] })
      router.refresh()
    } else {
      setError(result.error ?? 'Error desconocido')
    }
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Nombre</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role }))}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            >
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">Viewer</option>
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
                    form.empresaIds.includes(e.id)
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

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>
    </div>
  )
}
