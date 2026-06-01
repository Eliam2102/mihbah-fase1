'use client'
import NumberInput from '@/components/ui/number-input'
import { useConfirm } from '@/components/ui/confirm-dialog'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, X, Pencil, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { actualizarVentaAction, resyncVentaFromMondayAction } from '@/app/actions/ventas'

interface VentaEditable {
  id: string
  cliente: string
  estadoVenta: string
  fechaApertura: string | null
  fechaCierre: string | null
  monto: string
  enganche: string | null
  loteAcciones: string | null
  asesor: string | null
  notasInternas: string | null
  tipoProductoDetectado: string
  tipoProductoOverride: string | null
  editadoEnSistema: boolean
  editadoPorNombre: string | null
  editadoEn: string | null
}

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

export function VentaEditForm({ empresaId, venta }: { empresaId: string; venta: VentaEditable }) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    estadoVenta: venta.estadoVenta,
    fechaApertura: venta.fechaApertura ?? '',
    fechaCierre: venta.fechaCierre ?? '',
    monto: Number(venta.monto || 0),
    enganche: Number(venta.enganche ?? 0),
    loteAcciones: venta.loteAcciones ?? '',
    asesor: venta.asesor ?? '',
    notasInternas: venta.notasInternas ?? '',
    tipoProductoOverride: venta.tipoProductoOverride ?? '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await actualizarVentaAction({
        ventaId: venta.id,
        empresaId,
        estadoVenta: form.estadoVenta as never,
        fechaApertura: form.fechaApertura || null,
        fechaCierre: form.fechaCierre || null,
        monto: form.monto,
        enganche: form.enganche,
        loteAcciones: form.loteAcciones || null,
        asesor: form.asesor || null,
        notasInternas: form.notasInternas || null,
        tipoProductoOverride:
          form.tipoProductoOverride === 'TERRENO' || form.tipoProductoOverride === 'ACCION'
            ? form.tipoProductoOverride
            : null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess(
        result.data.recalculada
          ? 'Venta actualizada y comisión recalculada.'
          : 'Venta actualizada.',
      )
      router.refresh()
      setTimeout(() => setOpen(false), 1000)
    })
  }

  async function handleResync() {
    const ok = await confirm({
      title: '¿Re-sincronizar?',
      description:
        '¿Permitir que la próxima sincronización Monday sobreescriba los campos editables de esta venta?',
      confirmText: 'Permitir',
    })
    if (!ok) return

    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await resyncVentaFromMondayAction(empresaId, venta.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSuccess('Destrabado. Próxima sync Monday pisará los campos editables.')
      router.refresh()
    })
  }

  const editadoEnFmt =
    venta.editadoEn && venta.editadoEnSistema
      ? formatDistanceToNow(new Date(venta.editadoEn), { addSuffix: true, locale: es })
      : null

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {venta.editadoEnSistema && (
            <span
              className="bg-info/10 text-info inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
              title={
                venta.editadoPorNombre
                  ? `Editado por ${venta.editadoPorNombre}${editadoEnFmt ? ` · ${editadoEnFmt}` : ''}`
                  : 'Editado en sistema'
              }
            >
              <Pencil className="h-3 w-3" />
              {venta.editadoPorNombre
                ? `Editado por ${venta.editadoPorNombre}${editadoEnFmt ? ` · ${editadoEnFmt}` : ''}`
                : 'Editado en sistema'}
            </span>
          )}
          <button
            onClick={() => setOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar venta
          </button>
          {venta.editadoEnSistema && (
            <button
              onClick={handleResync}
              disabled={pending}
              className="border-border bg-background hover:bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
              title="Permitir que la próxima sync Monday sobreescriba los campos editables"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />
              Re-sincronizar Monday
            </button>
          )}
        </div>
        {error && <p className="text-destructive text-xs">{error}</p>}
        {success && <p className="text-success text-xs">{success}</p>}
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-foreground text-base font-semibold">Editar venta</h2>
        <button
          onClick={() => setOpen(false)}
          disabled={pending}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
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

        <Field label="Asesor (texto Monday)">
          <input
            type="text"
            value={form.asesor}
            onChange={(e) => setForm({ ...form, asesor: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
            placeholder="Nombre asesor"
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

        <Field label="Monto venta (MXN)" hint="Cambiarlo recalcula comisión">
          <input
            type="number"
            step="0.01"
            min={0}
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm tabular-nums"
          />
        </Field>

        <Field label="Enganche (MXN)" hint="Cambiarlo recalcula comisión">
          <input
            type="number"
            step="0.01"
            min={0}
            value={form.enganche}
            onChange={(e) => setForm({ ...form, enganche: Number(e.target.value) })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm tabular-nums"
          />
        </Field>

        <Field label="Lote / acciones">
          <input
            type="text"
            value={form.loteAcciones}
            onChange={(e) => setForm({ ...form, loteAcciones: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
            placeholder="Ej. Lote 14 Mz 3"
          />
        </Field>

        <Field
          label={`Tipo de producto${venta.tipoProductoDetectado ? ` (detectado: ${venta.tipoProductoDetectado})` : ''}`}
        >
          <select
            value={form.tipoProductoOverride}
            onChange={(e) => setForm({ ...form, tipoProductoOverride: e.target.value })}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            <option value="">Auto-detectar ({venta.tipoProductoDetectado})</option>
            <option value="TERRENO">Terreno (forzar)</option>
            <option value="ACCION">Acción / YCD (forzar)</option>
          </select>
          {venta.tipoProductoOverride && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
              <span className="font-semibold">Override activo:</span> {venta.tipoProductoOverride}.
              Recalcula para aplicar.
            </p>
          )}
        </Field>

        <div className="sm:col-span-2">
          <Field label="Notas internas (no sincronizan a Monday)">
            <textarea
              value={form.notasInternas}
              onChange={(e) => setForm({ ...form, notasInternas: e.target.value })}
              rows={3}
              className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
              placeholder="Contexto, recordatorios, etc."
            />
          </Field>
        </div>

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-2.5 text-xs sm:col-span-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-md border p-2.5 text-xs sm:col-span-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {success}
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
            {pending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </span>
      {children}
      {hint && <p className="text-muted-foreground mt-1 text-[10px]">{hint}</p>}
    </label>
  )
}
