'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { crearAsesorAction } from '@/app/actions/comisiones/alianzas'
import type { Lider } from '@/lib/services/comisiones/alianzas.service'

export function NuevoAsesorDialog({
  empresaId,
  afiliadoId,
  afiliadoNombre,
  lideres,
  onClose,
}: {
  empresaId: string
  afiliadoId: string
  afiliadoNombre: string
  lideres: Lider[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    liderId: lideres[0]?.id ?? '',
    nombre: '',
    email: '',
    telefono: '',
    mondayNombre: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await crearAsesorAction(empresaId, {
        afiliadoId,
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
        <h2 className="text-lg font-semibold">Nuevo asesor</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Alianza: <span className="text-foreground font-medium">{afiliadoNombre}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Field label="Líder">
            <select
              value={form.liderId}
              onChange={(e) => setForm({ ...form, liderId: e.target.value })}
              className="input"
            >
              <option value="">— Sin líder (asignar después) —</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground mt-1 text-xs">
              Opcional. Si no tienes líder todavía, déjalo vacío y Joana lo asigna después.
            </p>
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
          <Field label="Nombre en Monday (para cruce automático)">
            <input
              value={form.mondayNombre}
              onChange={(e) => setForm({ ...form, mondayNombre: e.target.value })}
              placeholder="Cómo aparece en la columna asesor de Monday"
              className="input"
            />
          </Field>

          {error && <p className="text-destructive text-xs">{error}</p>}

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
              {pending ? 'Guardando...' : 'Guardar'}
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
