'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { crearEsquemaAction } from '@/app/actions/comisiones/esquemas'

const TIPOS_ESQUEMA = ['ALIADOS_DEL_UNIVERSO', 'YUCAN_PARTNERS'] as const
const TIPOS_PRODUCTO = ['TERRENO', 'ACCION'] as const

export function CrearEsquemaDialog({
  empresaId,
  onClose,
}: {
  empresaId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    tipoEsquema: TIPOS_ESQUEMA[0] as (typeof TIPOS_ESQUEMA)[number],
    tipoProducto: TIPOS_PRODUCTO[0] as (typeof TIPOS_PRODUCTO)[number],
    nombre: '',
    porcentajeTotalCliente: 0,
    porcentajeOpBmcorp: 0,
    porcentajeOpYesyucan: 0,
    porcentajeSocioFijoJorge: 0,
    porcentajeSocioFijoKass: 0,
    porcentajeBolsaComercial: 0,
    porcentajeAsesorEstandar: 0,
    porcentajeLiderTope: 0,
    porcentajeLiderTopeActivo: false,
    razonSocial: '',
    fechaInicio: '',
    fechaFin: '',
    observaciones: '',
  })

  const sumaConceptos =
    form.porcentajeOpBmcorp +
    form.porcentajeOpYesyucan +
    form.porcentajeSocioFijoJorge +
    form.porcentajeSocioFijoKass +
    form.porcentajeBolsaComercial
  const cuadra = Math.abs(sumaConceptos - form.porcentajeTotalCliente) < 0.01

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!cuadra) {
      setError(
        `Conceptos suman ${sumaConceptos.toFixed(2)}% pero total cliente es ${form.porcentajeTotalCliente}%`,
      )
      return
    }
    if (!form.fechaInicio) {
      setError('Indica la fecha "vigente desde"')
      return
    }
    if (form.fechaFin && form.fechaFin < form.fechaInicio) {
      setError('Fecha fin no puede ser anterior a fecha inicio')
      return
    }
    startTransition(async () => {
      const result = await crearEsquemaAction(empresaId, {
        tipoEsquema: form.tipoEsquema,
        tipoProducto: form.tipoProducto,
        nombre: form.nombre,
        porcentajeTotalCliente: form.porcentajeTotalCliente,
        porcentajeOpBmcorp: form.porcentajeOpBmcorp,
        porcentajeOpYesyucan: form.porcentajeOpYesyucan,
        porcentajeSocioFijoJorge: form.porcentajeSocioFijoJorge,
        porcentajeSocioFijoKass: form.porcentajeSocioFijoKass,
        porcentajeBolsaComercial: form.porcentajeBolsaComercial,
        porcentajeAsesorEstandar: form.porcentajeAsesorEstandar,
        porcentajeLiderTope: form.porcentajeLiderTopeActivo ? form.porcentajeLiderTope : undefined,
        razonSocial: form.razonSocial || null,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin || null,
        observaciones: form.observaciones || null,
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
      <div className="bg-card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border p-6 shadow-lg">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4">
          <h2 className="text-foreground text-lg font-semibold">Nuevo esquema global</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Crea una versión distinta del esquema para un periodo diferente (ej. esquema histórico
            2022-2024 con % distintos). El sistema usa el esquema cuya fecha de vigencia cubra la
            fecha de apertura de cada venta.
          </p>
        </div>

        <div className="bg-muted/30 mb-4 rounded-md border p-3">
          <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Info className="h-3 w-3" />
            <span>
              Regla del doc YESYUCAN: la suma de{' '}
              <strong>OP BM + OP YESYUCAN + Fijos + Bolsa</strong> debe ser igual al{' '}
              <strong>% total cliente</strong>.
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de esquema">
              <select
                value={form.tipoEsquema}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipoEsquema: e.target.value as (typeof TIPOS_ESQUEMA)[number],
                  })
                }
                className="input"
              >
                {TIPOS_ESQUEMA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de producto">
              <select
                value={form.tipoProducto}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipoProducto: e.target.value as (typeof TIPOS_PRODUCTO)[number],
                  })
                }
                className="input"
              >
                {TIPOS_PRODUCTO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Nombre">
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input"
              placeholder="Ej. Esquema terrenos 2022-2024"
            />
          </Field>

          <PctField
            label="% Total cliente"
            hint="Lo que paga el cliente como comisión (20% terrenos, 15% YCD)"
            value={form.porcentajeTotalCliente}
            onChange={(v) => setForm({ ...form, porcentajeTotalCliente: v })}
            big
          />

          <div className="grid grid-cols-2 gap-3">
            <PctField
              label="% Op BM Corp"
              hint="Operativa BM Corp (1% terrenos / 0% YCD)"
              value={form.porcentajeOpBmcorp}
              onChange={(v) => setForm({ ...form, porcentajeOpBmcorp: v })}
            />
            <PctField
              label="% Op YESYUCAN"
              hint="Operativa YESYUCAN (1% terrenos / 3% YCD)"
              value={form.porcentajeOpYesyucan}
              onChange={(v) => setForm({ ...form, porcentajeOpYesyucan: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PctField
              label="% Socio fijo Jorge"
              hint="Solo terrenos: 1.5% mensual"
              value={form.porcentajeSocioFijoJorge}
              onChange={(v) => setForm({ ...form, porcentajeSocioFijoJorge: v })}
            />
            <PctField
              label="% Socio fijo Kass"
              hint="Solo terrenos: 1.5% mensual"
              value={form.porcentajeSocioFijoKass}
              onChange={(v) => setForm({ ...form, porcentajeSocioFijoKass: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PctField
              label="% Bolsa comercial"
              hint="Se reparte por alianza vía matriz (15% terrenos / 12% YCD)"
              value={form.porcentajeBolsaComercial}
              onChange={(v) => setForm({ ...form, porcentajeBolsaComercial: v })}
            />
            <PctField
              label="% Asesor estándar"
              hint="Comisión base del asesor (8% terrenos / 7% YCD)"
              value={form.porcentajeAsesorEstandar}
              onChange={(v) => setForm({ ...form, porcentajeAsesorEstandar: v })}
            />
          </div>

          <div
            className={`rounded-md border px-3 py-2.5 ${
              cuadra ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'
            }`}
          >
            <div className="flex items-center justify-between text-sm">
              <span className={cuadra ? 'text-success' : 'text-warning'}>
                {cuadra ? (
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                )}
                Suma conceptos:{' '}
                <span className="font-bold tabular-nums">{sumaConceptos.toFixed(2)}%</span>
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                Objetivo: {form.porcentajeTotalCliente.toFixed(2)}%
              </span>
            </div>
            {!cuadra && (
              <p className="text-warning mt-1 text-xs">
                Diferencia: {Math.abs(sumaConceptos - form.porcentajeTotalCliente).toFixed(2)}% —
                ajusta antes de guardar
              </p>
            )}
          </div>

          <div>
            <label className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase">
              <input
                type="checkbox"
                checked={form.porcentajeLiderTopeActivo}
                onChange={(e) => setForm({ ...form, porcentajeLiderTopeActivo: e.target.checked })}
              />
              Aplica tope al % líder (YCD usa 10%; terrenos no tiene tope)
            </label>
            {form.porcentajeLiderTopeActivo && (
              <div className="mt-2 flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.porcentajeLiderTope}
                  onChange={(e) =>
                    setForm({ ...form, porcentajeLiderTope: Number(e.target.value) })
                  }
                  className="input flex-1 tabular-nums"
                />
                <span className="text-muted-foreground text-xs">%</span>
              </div>
            )}
          </div>

          <Field label="Razón social que factura">
            <input
              value={form.razonSocial}
              onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
              className="input"
              placeholder="Ej. Nex Bridge (Bridge Makers)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vigente desde">
              <input
                type="date"
                required
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Vigente hasta (opcional)">
              <input
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <p className="text-muted-foreground -mt-2 text-[10px]">
            Ventas con fecha de apertura dentro de este rango usarán este esquema. Si se solapa con
            otro esquema activo del mismo tipo de producto, se usa el más reciente.
          </p>

          <Field label="Observaciones">
            <textarea
              rows={2}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              className="input"
              placeholder="Notas, referencias al doc, cambios"
            />
          </Field>

          {error && (
            <div className="text-destructive flex items-center gap-1 text-xs">
              <AlertCircle className="h-3 w-3" /> {error}
            </div>
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
              disabled={pending || !cuadra}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {pending ? 'Creando...' : 'Crear esquema'}
            </button>
          </div>

          <p className="text-muted-foreground border-t pt-3 text-xs">
            ⚠ Este esquema solo aplica a ventas <strong>nuevas</strong> con fecha de apertura en su
            rango. Para aplicarlo a ventas ya calculadas, después de crearlo click en{' '}
            <strong>Recalcular todas</strong>.
          </p>
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

function PctField({
  label,
  hint,
  value,
  onChange,
  big,
}: {
  label: string
  hint: string
  value: number
  onChange: (v: number) => void
  big?: boolean
}) {
  return (
    <div>
      <span className="text-muted-foreground mb-1 block text-xs font-medium uppercase">
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`input flex-1 tabular-nums ${big ? 'text-base font-semibold' : ''}`}
        />
        <span className="text-muted-foreground text-xs">%</span>
      </div>
      <p className="text-muted-foreground mt-0.5 text-[10px]">{hint}</p>
    </div>
  )
}
