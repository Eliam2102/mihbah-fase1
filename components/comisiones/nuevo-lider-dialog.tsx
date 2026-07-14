'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { crearLiderAction } from '@/app/actions/comisiones/alianzas'

const NIVELES = [
  { value: '', label: 'Sin asignar' },
  { value: 'JADE', label: 'Jade' },
  { value: 'TURQUESA', label: 'Turquesa' },
  { value: 'ONIX_NEGRO', label: 'Ónix Negro' },
] as const

export function NuevoLiderDialog({
  empresaId,
  afiliadoId,
  afiliadoNombre,
  onClose,
}: {
  empresaId: string
  afiliadoId: string
  afiliadoNombre: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    clabe: '',
    banco: '',
    nivel: '' as '' | 'JADE' | 'TURQUESA' | 'ONIX_NEGRO',
    coordinaPago: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await crearLiderAction(empresaId, {
        afiliadoId,
        nombre: form.nombre,
        email: form.email || null,
        telefono: form.telefono || null,
        clabe: form.clabe || null,
        banco: form.banco || null,
        nivel: form.nivel || null,
        coordinaPago: form.coordinaPago || null,
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
        <h2 className="text-lg font-semibold">Nuevo líder</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Alianza: <span className="text-foreground font-medium">{afiliadoNombre}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="CLABE">
              <input
                value={form.clabe}
                onChange={(e) => setForm({ ...form, clabe: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Banco">
              <input
                value={form.banco}
                onChange={(e) => setForm({ ...form, banco: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nivel">
              <select
                value={form.nivel}
                onChange={(e) => setForm({ ...form, nivel: e.target.value as typeof form.nivel })}
                className="input"
              >
                {NIVELES.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Coordina pago">
            <input
              value={form.coordinaPago}
              onChange={(e) => setForm({ ...form, coordinaPago: e.target.value })}
              className="input"
              placeholder="OTTY · DIRECTO · MAFF OCADIZ · otro"
            />
            <p className="text-muted-foreground mt-0.5 text-xs">
              Quién coordina el pago (Joana sabe a quién mandar el monto)
            </p>
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
