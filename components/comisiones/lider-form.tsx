'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { crearLiderAction, actualizarLiderAction } from '@/app/actions/comisiones/alianzas'
import type { Lider } from '@/lib/services/comisiones/alianzas.service'

const NIVELES = [
  { value: '', label: 'Sin asignar' },
  { value: 'JADE', label: 'Jade' },
  { value: 'TURQUESA', label: 'Turquesa' },
  { value: 'ONIX_NEGRO', label: 'Ónix Negro' },
] as const

const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'OTRO', label: 'Otro' },
] as const

type MetodoPago = 'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'OTRO'

type FormState = {
  nombre: string
  email: string
  emailAlterno: string
  telefono: string
  metodoPago: MetodoPago
  clabe: string
  banco: string
  numeroCuenta: string
  nivel: '' | 'JADE' | 'TURQUESA' | 'ONIX_NEGRO'
  coordinaPago: string
}

function initialForm(lider: Lider | null): FormState {
  return {
    nombre: lider?.nombre ?? '',
    email: lider?.email ?? '',
    emailAlterno: lider?.emailAlterno ?? '',
    telefono: lider?.telefono ?? '',
    metodoPago: (lider?.metodoPago ?? 'EFECTIVO') as MetodoPago,
    clabe: lider?.clabe ?? '',
    banco: lider?.banco ?? '',
    numeroCuenta: lider?.numeroCuenta ?? '',
    nivel: (lider?.nivel ?? '') as FormState['nivel'],
    coordinaPago: lider?.coordinaPago ?? '',
  }
}

export function LiderForm({
  empresaId,
  afiliadoId,
  lider,
  onDone,
  onCancel,
}: {
  empresaId: string
  afiliadoId: string
  lider?: Lider
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initialForm(lider ?? null))

  const editing = !!lider

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const payload = {
        nombre: form.nombre,
        email: form.email || null,
        emailAlterno: form.emailAlterno || null,
        telefono: form.telefono || null,
        metodoPago: form.metodoPago,
        clabe: form.clabe || null,
        banco: form.banco || null,
        numeroCuenta: form.numeroCuenta || null,
        nivel: form.nivel || null,
        coordinaPago: form.coordinaPago || null,
      }
      const result = editing
        ? await actualizarLiderAction(empresaId, lider.id, payload)
        : await crearLiderAction(empresaId, { afiliadoId, ...payload })

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
          {editing ? `Editar líder · ${lider.nombre}` : 'Nuevo líder'}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Email principal">
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

      <Field label="Email alterno (opcional)">
        <input
          type="email"
          value={form.emailAlterno}
          onChange={(e) => setForm({ ...form, emailAlterno: e.target.value })}
          className="input"
          placeholder="Para notificaciones secundarias"
        />
      </Field>

      <Field label="Método de pago">
        <select
          value={form.metodoPago}
          onChange={(e) => setForm({ ...form, metodoPago: e.target.value as MetodoPago })}
          className="input"
        >
          {METODOS_PAGO.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      {(form.metodoPago === 'TRANSFERENCIA' || form.metodoPago === 'DEPOSITO') && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="CLABE">
              <input
                value={form.clabe}
                onChange={(e) => setForm({ ...form, clabe: e.target.value })}
                className="input"
                placeholder="18 dígitos"
              />
            </Field>
            <Field label="Banco">
              <input
                value={form.banco}
                onChange={(e) => setForm({ ...form, banco: e.target.value })}
                className="input"
                placeholder="BBVA, Banorte, etc."
              />
            </Field>
          </div>
          {editing && (
            <Field label="Número de cuenta (opcional)">
              <input
                value={form.numeroCuenta}
                onChange={(e) => setForm({ ...form, numeroCuenta: e.target.value })}
                className="input"
              />
            </Field>
          )}
          <p className="text-muted-foreground text-[11px]">
            Datos bancarios cifrados con AES-256-GCM.
          </p>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nivel">
          <select
            value={form.nivel}
            onChange={(e) => setForm({ ...form, nivel: e.target.value as FormState['nivel'] })}
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
