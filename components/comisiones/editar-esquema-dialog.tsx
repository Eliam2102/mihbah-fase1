'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { actualizarEsquemaAction } from '@/app/actions/comisiones/esquemas'
import type { Esquema } from '@/lib/services/comisiones/esquemas.service'

export function EditarEsquemaDialog({
  empresaId,
  esquema,
  onClose,
}: {
  empresaId: string
  esquema: Esquema
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: esquema.nombre,
    porcentajeTotalCliente: Number(esquema.porcentajeTotalCliente),
    porcentajeOpBmcorp: Number(esquema.porcentajeOpBmcorp),
    porcentajeOpYesyucan: Number(esquema.porcentajeOpYesyucan),
    porcentajeSocioFijoJorge: Number(esquema.porcentajeSocioFijoJorge),
    porcentajeSocioFijoKass: Number(esquema.porcentajeSocioFijoKass),
    porcentajeBolsaComercial: Number(esquema.porcentajeBolsaComercial),
    porcentajeAsesorEstandar: Number(esquema.porcentajeAsesorEstandar),
    porcentajeLiderTope:
      esquema.porcentajeLiderTope != null ? Number(esquema.porcentajeLiderTope) : 0,
    porcentajeLiderTopeActivo: esquema.porcentajeLiderTope != null,
    razonSocial: esquema.razonSocial ?? '',
    observaciones: esquema.observaciones ?? '',
  })

  // Suma esperada = total cliente. Debe cuadrar.
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
    startTransition(async () => {
      const result = await actualizarEsquemaAction(empresaId, esquema.id, {
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
          <p className="text-muted-foreground text-xs font-semibold uppercase">
            {esquema.tipoEsquema} · {esquema.tipoProducto}
          </p>
          <h2 className="text-foreground text-lg font-semibold">Editar esquema global</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Este esquema aplica a TODAS las alianzas de tipo {esquema.tipoProducto}. Lo distinto por
            alianza (% afiliación, socios bolsa) vive en la matriz de cada alianza.
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
          <Field label="Nombre">
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input"
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

          {/* Verificación visual */}
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

          {/* Tope líder */}
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
              {pending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

          <p className="text-muted-foreground border-t pt-3 text-xs">
            ⚠ Cambios en este esquema afectan a las comisiones <strong>nuevas</strong>. Para
            actualizar también las comisiones ya calculadas, después de guardar click en{' '}
            <strong>Recalcular todas</strong> en la pantalla de Esquemas.
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
