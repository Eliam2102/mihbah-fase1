'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { crearAfiliadoAction, actualizarAfiliadoAction } from '@/app/actions/comisiones/alianzas'
import type { Afiliado } from '@/lib/services/comisiones/alianzas.service'

const TIPOS_ESQUEMA = [
  { value: '', label: 'Sin asignar' },
  { value: 'ALIADOS_DEL_UNIVERSO', label: 'Aliados del Universo' },
  { value: 'YUCAN_PARTNERS', label: 'Yucan Partners' },
] as const

type FormState = {
  nombre: string
  contacto: string
  mondayLabel: string
  tipoEsquemaDefault: '' | 'ALIADOS_DEL_UNIVERSO' | 'YUCAN_PARTNERS'
}

function initial(alianza: Afiliado | null): FormState {
  return {
    nombre: alianza?.nombre ?? '',
    contacto: alianza?.contacto ?? '',
    mondayLabel: alianza?.mondayLabel ?? '',
    tipoEsquemaDefault: (alianza?.tipoEsquemaDefault ?? '') as FormState['tipoEsquemaDefault'],
  }
}

export function AlianzaForm({
  empresaId,
  alianza,
  onDone,
  onCancel,
  variant = 'block',
}: {
  empresaId: string
  alianza?: Afiliado
  onDone: () => void
  onCancel: () => void
  variant?: 'block' | 'inline'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initial(alianza ?? null))

  const editing = !!alianza

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        nombre: form.nombre,
        contacto: form.contacto || null,
        mondayLabel: form.mondayLabel || null,
        tipoEsquemaDefault: form.tipoEsquemaDefault || null,
      }
      const result = editing
        ? await actualizarAfiliadoAction(empresaId, alianza.id, payload)
        : await crearAfiliadoAction(empresaId, payload)

      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
      onDone()
    })
  }

  const containerCls =
    variant === 'inline'
      ? 'bg-muted/30 space-y-3 rounded-lg border border-dashed p-3'
      : 'bg-muted/30 space-y-3 rounded-lg border border-dashed p-4'

  return (
    <form onSubmit={handleSubmit} className={containerCls}>
      <div className="flex items-center justify-between">
        <h4 className="text-foreground text-sm font-semibold">
          {editing ? 'Editar alianza' : 'Nueva alianza'}
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

      <Field label="Nombre *">
        <input
          required
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          className="input"
        />
      </Field>

      <Field label="Monday label">
        <input
          value={form.mondayLabel}
          onChange={(e) => setForm({ ...form, mondayLabel: e.target.value })}
          className="input font-mono text-xs"
          placeholder="Chip exacto Monday (ej. LGI, FLAMINGO)"
        />
        <p className="text-muted-foreground mt-1 text-[11px]">
          Texto exacto del chip de Monday para auto-sincronización.
        </p>
      </Field>

      <Field label="Contacto">
        <input
          value={form.contacto}
          onChange={(e) => setForm({ ...form, contacto: e.target.value })}
          className="input"
        />
      </Field>

      <Field label="Esquema por defecto">
        <select
          value={form.tipoEsquemaDefault}
          onChange={(e) =>
            setForm({
              ...form,
              tipoEsquemaDefault: e.target.value as FormState['tipoEsquemaDefault'],
            })
          }
          className="input"
        >
          {TIPOS_ESQUEMA.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
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
