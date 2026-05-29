'use client'
import NumberInput from '@/components/ui/number-input'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, X, AlertCircle, Info } from 'lucide-react'
import { crearVentaAction } from '@/app/actions/ventas'

type Option = { id: string; nombre: string }

const ESTADOS = [
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'APROBADO_VENTAS', label: 'Aprobado ventas' },
  { value: 'APROBADO_JURIDICO', label: 'Aprobado jurídico' },
  { value: 'ESPERANDO_AUTORIZACION', label: 'Esperando autorización' },
  { value: 'RECHAZADO', label: 'Rechazado' },
  { value: 'LIBERADO', label: 'Liberada (caída)' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'FINALIZADO_Y_LIQUIDADO', label: 'Finalizada y liquidada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

const ESTADOS_CON_COMISION = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']

export function VentaCreateForm({
  empresaId,
  alianzas,
  desarrollos,
}: {
  empresaId: string
  alianzas: Option[]
  desarrollos: Option[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    cliente: '',
    afiliadoId: '',
    desarrolloId: '',
    producto: 'TERRENO',
    asesor: '',
    monto: 0,
    enganche: 0,
    financiamiento: '',
    estadoVenta: 'EN_PROCESO',
    fecha: new Date().toISOString().slice(0, 10),
    fechaApertura: '',
    fechaCierre: '',
    loteAcciones: '',
    notasInternas: '',
  })

  function reset() {
    setError(null)
    setForm({
      cliente: '',
      afiliadoId: '',
      desarrolloId: '',
      producto: 'TERRENO',
      asesor: '',
      monto: 0,
      enganche: 0,
      financiamiento: '',
      estadoVenta: 'EN_PROCESO',
      fecha: new Date().toISOString().slice(0, 10),
      fechaApertura: '',
      fechaCierre: '',
      loteAcciones: '',
      notasInternas: '',
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.cliente.trim()) return setError('Cliente requerido')
    if (!form.afiliadoId) return setError('Selecciona una alianza')
    if (!form.fecha) return setError('Fecha requerida')

    startTransition(async () => {
      const result = await crearVentaAction({
        empresaId,
        cliente: form.cliente.trim(),
        afiliadoId: form.afiliadoId,
        desarrolloId: form.desarrolloId || null,
        producto: form.producto as 'TERRENO' | 'ACCION',
        asesor: form.asesor.trim() || null,
        monto: Number(form.monto) || 0,
        enganche: Number(form.enganche) || 0,
        financiamiento: form.financiamiento || null,
        estadoVenta: form.estadoVenta as never,
        fecha: form.fecha,
        fechaApertura: form.fechaApertura || null,
        fechaCierre: form.fechaCierre || null,
        loteAcciones: form.loteAcciones.trim() || null,
        notasInternas: form.notasInternas.trim() || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Ir al detalle: ahí se ve el estado de comisión (forzar config de alianza si falta).
      router.push(`/empresa/${empresaId}/ventas/${result.data.ventaId}`)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          reset()
          setOpen(true)
        }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium"
      >
        <Plus className="h-4 w-4" />
        Nueva venta
      </button>
    )
  }

  const naceFinalizada = ESTADOS_CON_COMISION.includes(form.estadoVenta)

  return (
    <div className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-foreground text-base font-semibold">Nueva venta (captura manual)</h2>
        <button
          onClick={() => setOpen(false)}
          disabled={pending}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Cliente" required>
            <input
              type="text"
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
              placeholder="Nombre del cliente"
            />
          </Field>
        </div>

        <Field label="Alianza" required hint="Liga la venta a una alianza configurada">
          <select
            value={form.afiliadoId}
            onChange={(e) => setForm({ ...form, afiliadoId: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            <option value="">— Selecciona —</option>
            {alianzas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Producto" hint="Define qué matriz/esquema aplica">
          <select
            value={form.producto}
            onChange={(e) => setForm({ ...form, producto: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            <option value="TERRENO">Terreno</option>
            <option value="ACCION">Acción (YCD)</option>
          </select>
        </Field>

        <Field label="Desarrollo (opcional)">
          <select
            value={form.desarrolloId}
            onChange={(e) => setForm({ ...form, desarrolloId: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            <option value="">— Ninguno —</option>
            {desarrollos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Asesor (quién vendió)">
          <input
            type="text"
            value={form.asesor}
            onChange={(e) => setForm({ ...form, asesor: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
            placeholder="Nombre asesor"
          />
        </Field>

        <Field label="Monto venta (MXN)" required>
          <input
            type="number"
            step="0.01"
            min={0}
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm tabular-nums"
          />
        </Field>

        <Field label="Enganche (MXN)">
          <input
            type="number"
            step="0.01"
            min={0}
            value={form.enganche}
            onChange={(e) => setForm({ ...form, enganche: Number(e.target.value) })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm tabular-nums"
          />
        </Field>

        <Field label="Financiamiento">
          <select
            value={form.financiamiento}
            onChange={(e) => setForm({ ...form, financiamiento: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            <option value="">— Sin especificar —</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </select>
        </Field>

        <Field label="Estado de venta">
          <select
            value={form.estadoVenta}
            onChange={(e) => setForm({ ...form, estadoVenta: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            {ESTADOS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha de la venta" required>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          />
        </Field>

        <Field label="Fecha apertura">
          <input
            type="date"
            value={form.fechaApertura}
            onChange={(e) => setForm({ ...form, fechaApertura: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          />
        </Field>

        <Field label="Fecha cierre">
          <input
            type="date"
            value={form.fechaCierre}
            onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          />
        </Field>

        {form.producto === 'ACCION' && (
          <Field label="Lote / acciones">
            <input
              type="text"
              value={form.loteAcciones}
              onChange={(e) => setForm({ ...form, loteAcciones: e.target.value })}
              className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
              placeholder="Ej. Paquete 10 acciones"
            />
          </Field>
        )}

        <div className="sm:col-span-2">
          <Field label="Notas internas (no sincronizan a Monday)">
            <textarea
              value={form.notasInternas}
              onChange={(e) => setForm({ ...form, notasInternas: e.target.value })}
              rows={2}
              className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
              placeholder="Contexto, recordatorios, etc."
            />
          </Field>
        </div>

        <div className="border-info/30 bg-info/10 text-info flex items-start gap-2 rounded-md border p-2.5 text-xs sm:col-span-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {naceFinalizada
            ? 'Al guardar se calcula la comisión. Si la alianza no tiene matriz configurada, quedará pendiente hasta configurarla en Comisiones › Alianzas.'
            : 'La comisión se calcula cuando la venta pase a Finalizada/Liberada. Asegúrate de que su alianza tenga matriz configurada.'}
        </div>

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-2.5 text-xs sm:col-span-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? 'Guardando...' : 'Crear venta'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
      {hint && <p className="text-muted-foreground mt-1 text-[10px]">{hint}</p>}
    </label>
  )
}
