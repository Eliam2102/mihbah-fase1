'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle } from 'lucide-react'
import { actualizarLiderAction } from '@/app/actions/comisiones/alianzas'
import type { Lider } from '@/lib/services/comisiones/alianzas.service'

const NIVELES = [
  { value: '', label: 'Sin asignar' },
  { value: 'JADE', label: 'Jade' },
  { value: 'TURQUESA', label: 'Turquesa' },
  { value: 'ONIX_NEGRO', label: 'Ónix Negro' },
] as const

export function EditarLiderDialog({
  empresaId,
  lider,
  onClose,
}: {
  empresaId: string
  lider: Lider
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: lider.nombre,
    email: lider.email ?? '',
    telefono: lider.telefono ?? '',
    clabe: lider.clabe ?? '',
    banco: lider.banco ?? '',
    numeroCuenta: lider.numeroCuenta ?? '',
    nivel: (lider.nivel ?? '') as '' | 'JADE' | 'TURQUESA' | 'ONIX_NEGRO',
    coordinaPago: lider.coordinaPago ?? '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await actualizarLiderAction(empresaId, lider.id, {
        nombre: form.nombre,
        email: form.email || null,
        telefono: form.telefono || null,
        clabe: form.clabe || null,
        banco: form.banco || null,
        numeroCuenta: form.numeroCuenta || null,
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
      <div className="bg-card relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border p-6 shadow-lg">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold">Editar líder</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          <span className="text-foreground font-medium">{lider.nombre}</span>
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
          <Field label="Número de cuenta">
            <input
              value={form.numeroCuenta}
              onChange={(e) => setForm({ ...form, numeroCuenta: e.target.value })}
              className="input"
            />
          </Field>
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
            <Field label="Pauta mensual">
              <input
                type="number"
                min={0}
                step={1000}
                onChange={(e) =>
                  setForm({
                    ...form,
                  })
                }
                className="input"
              />
            </Field>
          </div>
          <Field label="Coordina pago">
            <input
              value={form.coordinaPago}
              onChange={(e) => setForm({ ...form, coordinaPago: e.target.value })}
              className="input"
              placeholder="OTTY · DIRECTO · MAFF OCADIZ · otro"
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
