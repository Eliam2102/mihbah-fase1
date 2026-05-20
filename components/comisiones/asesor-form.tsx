'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { crearAsesorAction, actualizarAsesorAction } from '@/app/actions/comisiones/alianzas'
import type { Asesor, Lider } from '@/lib/services/comisiones/alianzas.service'

type FormState = {
  liderId: string
  nombre: string
  email: string
  telefono: string
  mondayNombre: string
}

function initial(asesor: Asesor | null, lideres: Lider[]): FormState {
  return {
    liderId: asesor?.liderId ?? lideres[0]?.id ?? '',
    nombre: asesor?.nombre ?? '',
    email: asesor?.email ?? '',
    telefono: asesor?.telefono ?? '',
    mondayNombre: asesor?.mondayNombre ?? '',
  }
}

export function AsesorForm({
  empresaId,
  afiliadoId,
  lideres,
  asesor,
  onDone,
  onCancel,
}: {
  empresaId: string
  afiliadoId: string
  lideres: Lider[]
  asesor?: Asesor
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initial(asesor ?? null, lideres))

  const editing = !!asesor

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        liderId: form.liderId || null,
        nombre: form.nombre,
        email: form.email || null,
        telefono: form.telefono || null,
        mondayNombre: form.mondayNombre || null,
      }
      const result = editing
        ? await actualizarAsesorAction(empresaId, asesor.id, payload)
        : await crearAsesorAction(empresaId, { afiliadoId, ...payload })

      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
      onDone()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted/30 space-y-3 rounded-lg border border-dashed p-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-foreground text-sm font-semibold">
          {editing ? `Editar asesor · ${asesor.nombre}` : 'Nuevo asesor'}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

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
          <p className="text-warning mt-1 inline-flex items-center gap-1 text-[11px]">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          placeholder="Cómo aparece en la columna asesor de Monday"
        />
      </Field>

      {error && (
        <p className="text-destructive inline-flex items-center gap-1 text-xs">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-xs font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {pending ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-[11px] font-medium tracking-wide uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}
