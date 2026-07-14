'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle } from 'lucide-react'
import { actualizarAsesorAction } from '@/app/actions/comisiones/alianzas'
import type { Asesor, Lider } from '@/lib/services/comisiones/alianzas.service'

export function EditarAsesorDialog({
  empresaId,
  asesor,
  lideres,
  onClose,
}: {
  empresaId: string
  asesor: Asesor
  lideres: Lider[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    liderId: asesor.liderId ?? '',
    nombre: asesor.nombre,
    email: asesor.email ?? '',
    telefono: asesor.telefono ?? '',
    mondayNombre: asesor.mondayNombre ?? '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await actualizarAsesorAction(empresaId, asesor.id, {
        liderId: form.liderId || null,
        nombre: form.nombre,
        email: form.email || null,
        telefono: form.telefono || null,
        mondayNombre: form.mondayNombre || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card relative w-full max-w-md rounded-lg border p-6 shadow-lg">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold">Editar asesor</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          <span className="text-foreground font-medium">{asesor.nombre}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Field label="Líder">
            <select
              value={form.liderId}
              onChange={(e) => setForm({ ...form, liderId: e.target.value })}
              className="input"
            >
              <option value="">— Sin líder asignado —</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            {!form.liderId && (
              <p className="text-warning mt-1 inline-flex items-center gap-1 text-xs">
                <AlertCircle className="h-3 w-3" />
                Sin líder no podrás crear cuenta del portal para este asesor.
              </p>
            )}
          </Field>
          <Field label="Nombre *">
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Nombre en Monday">
            <input
              value={form.mondayNombre}
              onChange={(e) => setForm({ ...form, mondayNombre: e.target.value })}
              className="input"
              placeholder="Cómo aparece en columna asesor de Monday"
            />
          </Field>

          {error && (
            <p className="text-destructive inline-flex items-center gap-1 text-xs">
              <AlertCircle className="h-3 w-3" /> {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
            >
              {pending ? 'Guardando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-xs font-medium uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}
