'use client'
import NumberInput from '@/components/ui/number-input'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react'
import { crearMatrizAction, actualizarMatrizAction } from '@/app/actions/comisiones/esquemas'
import type { Lider } from '@/lib/services/comisiones/alianzas.service'
import type { Matriz } from '@/lib/services/comisiones/esquemas.service'

const REGLAS = [
  {
    value: 'NINGUNA',
    label: 'Sin regla especial',
    desc: 'Caso normal. Líder dispersa a sus asesores. Jorge bolsa acumula mensual.',
  },
  {
    value: 'FLAMINGO_DIRECTO',
    label: 'Flamingo: YESYUCAN paga directo al asesor',
    desc: 'Excepción: el asesor cobra directo, sin pasar por el líder.',
  },
  {
    value: 'LGI_YCD_ACUMULA',
    label: 'LGI YCD: Kass define dispersión al mes siguiente',
    desc: 'Comisiones se acumulan mensualmente. Kass define cómo repartir.',
  },
] as const

const EJEMPLOS = {
  TERRENO: {
    monto: 1_000_000,
    enganche: 120_000,
    label: 'Venta $1,000,000 · enganche 12%',
  },
  ACCION: {
    monto: 1_000_000,
    enganche: 120_000,
    label: 'Venta $1,000,000 · enganche 12%',
  },
}

export function MatrizDialog({
  empresaId,
  afiliadoId,
  afiliadoNombre,
  tipoProducto,
  matrizActual,
  lideres,
  onClose,
}: {
  empresaId: string
  afiliadoId: string
  afiliadoNombre: string
  tipoProducto: 'TERRENO' | 'ACCION'
  matrizActual: Matriz | null
  lideres: Lider[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    liderId: matrizActual?.liderId ?? lideres[0]?.id ?? '',
    porcentajeAfiliacion: Number(matrizActual?.porcentajeAfiliacion ?? 0),
    porcentajeJorgeBolsa: Number(matrizActual?.porcentajeJorgeBolsa ?? 0),
    porcentajeKassBolsa: Number(matrizActual?.porcentajeKassBolsa ?? 0),
    porcentajeDianaBolsa: Number(matrizActual?.porcentajeDianaBolsa ?? 0),
    // null = usar valor del esquema global; number = override para esta alianza
    socioFijoJorgeOverride:
      matrizActual?.porcentajeSocioFijoJorgeOverride != null
        ? Number(matrizActual.porcentajeSocioFijoJorgeOverride)
        : (null as number | null),
    socioFijoKassOverride:
      matrizActual?.porcentajeSocioFijoKassOverride != null
        ? Number(matrizActual.porcentajeSocioFijoKassOverride)
        : (null as number | null),
    reglaEspecial: (matrizActual?.reglaEspecial ?? 'NINGUNA') as
      | 'NINGUNA'
      | 'FLAMINGO_DIRECTO'
      | 'LGI_YCD_ACUMULA',
    requiereConfig: matrizActual?.requiereConfig ?? false,
  })

  const bolsaEsperada = tipoProducto === 'TERRENO' ? 15 : 12
  const sumaTotal =
    form.porcentajeAfiliacion +
    form.porcentajeJorgeBolsa +
    form.porcentajeKassBolsa +
    form.porcentajeDianaBolsa
  const cuadra = Math.abs(sumaTotal - bolsaEsperada) < 0.01
  const sobra = sumaTotal - bolsaEsperada

  // Ejemplo en vivo
  const ej = EJEMPLOS[tipoProducto]
  const factorAsesor = tipoProducto === 'TERRENO' ? 8 : 7
  const montoAfiliacion = (ej.monto * form.porcentajeAfiliacion) / 100
  const montoAsesor = (ej.monto * factorAsesor) / 100
  const montoLiderSaldo = Math.max(0, montoAfiliacion - montoAsesor)
  const montoJorgeBolsa = (ej.monto * form.porcentajeJorgeBolsa) / 100
  const montoKassBolsa = (ej.monto * form.porcentajeKassBolsa) / 100
  const montoDianaBolsa = (ej.monto * form.porcentajeDianaBolsa) / 100
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!cuadra) {
      setError(
        `La suma debe ser ${bolsaEsperada}% exacto. Sobra/falta ${Math.abs(sobra).toFixed(2)}%`,
      )
      return
    }

    const payload = {
      afiliadoId,
      tipoProducto,
      liderId: form.liderId || null,
      porcentajeAfiliacion: form.porcentajeAfiliacion,
      porcentajeJorgeBolsa: form.porcentajeJorgeBolsa,
      porcentajeKassBolsa: form.porcentajeKassBolsa,
      porcentajeDianaBolsa: form.porcentajeDianaBolsa,
      porcentajeSocioFijoJorgeOverride: form.socioFijoJorgeOverride,
      porcentajeSocioFijoKassOverride: form.socioFijoKassOverride,
      reglaEspecial: form.reglaEspecial,
      requiereConfig: form.requiereConfig,
    }

    startTransition(async () => {
      const result = matrizActual
        ? await actualizarMatrizAction(empresaId, matrizActual.id, payload)
        : await crearMatrizAction(empresaId, payload)
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
          <p className="text-muted-foreground text-xs font-semibold uppercase">{afiliadoNombre}</p>
          <h2 className="text-foreground text-lg font-semibold">
            Configurar matriz {tipoProducto === 'TERRENO' ? 'Terrenos' : 'YCD'}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Define cómo se reparte la bolsa comercial del{' '}
            <span className="text-foreground font-medium">{bolsaEsperada}%</span> entre el líder y
            los socios. Doc YESYUCAN v5 §3.{tipoProducto === 'TERRENO' ? '1' : '2'}.
          </p>
        </div>

        {/* Explicación visual del split */}
        <div className="bg-muted/30 mb-4 rounded-md border p-3">
          <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs font-semibold uppercase">
            <Info className="h-3 w-3" />
            Cómo se reparte el {bolsaEsperada}% de bolsa comercial
          </div>
          <ul className="text-foreground space-y-1 text-xs">
            <li>
              <span className="text-primary font-mono">% Afiliación</span> = lo que recibe el líder
              de la alianza. De ese monto él paga al asesor su comisión estándar ({factorAsesor}%) y
              se queda con el saldo.
            </li>
            <li>
              <span className="text-primary font-mono">% Jorge / Kass / Diana</span> = parte de la
              bolsa que va a cada socio del grupo.
            </li>
            <li>
              <strong>Regla:</strong> Afiliación + Jorge + Kass + Diana ={' '}
              <strong>{bolsaEsperada}%</strong> exacto.
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Líder responsable" required>
            <select
              value={form.liderId}
              onChange={(e) => setForm({ ...form, liderId: e.target.value })}
              className="input"
              disabled={lideres.length === 0}
            >
              <option value="">— Sin líder asignado —</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            {lideres.length === 0 && (
              <p className="text-warning mt-1 text-xs">
                ⚠ Esta alianza no tiene líderes. Crea uno primero desde la lista de alianzas.
              </p>
            )}
          </Field>

          {/* Inputs porcentajes con quick-fill chips */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              Reparto de la bolsa comercial
            </p>
            <div className="grid grid-cols-2 gap-3">
              <PctField
                label="% Afiliación (líder)"
                hint="Lo que cobra el líder y reparte"
                value={form.porcentajeAfiliacion}
                onChange={(v) => setForm({ ...form, porcentajeAfiliacion: v })}
              />
              <PctField
                label="% Jorge bolsa"
                hint="Socio Jorge Juárez (acumula mes)"
                value={form.porcentajeJorgeBolsa}
                onChange={(v) => setForm({ ...form, porcentajeJorgeBolsa: v })}
              />
              <PctField
                label="% Kass bolsa"
                hint="Socia Kass Brambila"
                value={form.porcentajeKassBolsa}
                onChange={(v) => setForm({ ...form, porcentajeKassBolsa: v })}
              />
              <PctField
                label="% Diana bolsa"
                hint="Socia Diana Jimendi"
                value={form.porcentajeDianaBolsa}
                onChange={(v) => setForm({ ...form, porcentajeDianaBolsa: v })}
              />
            </div>
          </div>

          {/* Socios fijos — override por alianza */}
          {tipoProducto === 'TERRENO' && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                Socios fijos (override por alianza)
              </p>
              <p className="text-muted-foreground text-xs">
                Por defecto vienen del esquema global (1.5% c/u). Si esta alianza es excepción
                (p.ej. FLAMINGO = 0%), activa el override y pon el valor correcto.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Jorge fijo */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.socioFijoJorgeOverride !== null}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          socioFijoJorgeOverride: e.target.checked
                            ? tipoProducto === 'TERRENO'
                              ? 1.5
                              : 0
                            : null,
                        })
                      }
                    />
                    <span className="text-muted-foreground font-medium uppercase">
                      % Fijo Jorge (override)
                    </span>
                  </label>
                  {form.socioFijoJorgeOverride !== null && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={form.socioFijoJorgeOverride}
                        onChange={(e) =>
                          setForm({ ...form, socioFijoJorgeOverride: Number(e.target.value) })
                        }
                        className="input flex-1 tabular-nums"
                      />
                      <span className="text-muted-foreground text-xs">%</span>
                    </div>
                  )}
                  {form.socioFijoJorgeOverride === null && (
                    <p className="text-muted-foreground text-[10px]">
                      Usa valor del esquema global
                    </p>
                  )}
                </div>
                {/* Kass fijo */}
                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.socioFijoKassOverride !== null}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          socioFijoKassOverride: e.target.checked
                            ? tipoProducto === 'TERRENO'
                              ? 1.5
                              : 0
                            : null,
                        })
                      }
                    />
                    <span className="text-muted-foreground font-medium uppercase">
                      % Fijo Kass (override)
                    </span>
                  </label>
                  {form.socioFijoKassOverride !== null && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={form.socioFijoKassOverride}
                        onChange={(e) =>
                          setForm({ ...form, socioFijoKassOverride: Number(e.target.value) })
                        }
                        className="input flex-1 tabular-nums"
                      />
                      <span className="text-muted-foreground text-xs">%</span>
                    </div>
                  )}
                  {form.socioFijoKassOverride === null && (
                    <p className="text-muted-foreground text-[10px]">
                      Usa valor del esquema global
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Suma indicator — barra visual */}
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
                Suma actual: <span className="font-bold tabular-nums">{sumaTotal.toFixed(2)}%</span>
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                Objetivo: {bolsaEsperada}%
              </span>
            </div>
            <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
              <div
                className={`h-full transition-all ${
                  cuadra ? 'bg-success' : sumaTotal > bolsaEsperada ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, (sumaTotal / bolsaEsperada) * 100)}%` }}
              />
            </div>
            {!cuadra && (
              <p className="text-warning mt-1 text-xs">
                {sobra > 0
                  ? `Te sobran ${sobra.toFixed(2)}%. Reduce alguno.`
                  : `Te faltan ${Math.abs(sobra).toFixed(2)}%. Aumenta alguno.`}
              </p>
            )}
          </div>

          {/* Ejemplo en vivo */}
          {cuadra && (
            <div className="bg-primary/5 border-primary/30 rounded-md border p-3">
              <p className="text-primary mb-2 text-xs font-semibold uppercase">
                Ejemplo con tu configuración
              </p>
              <p className="text-muted-foreground mb-2 text-xs">{ej.label}</p>
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  <Row
                    label="Comisión bruta total"
                    value={fmt((ej.monto * (tipoProducto === 'TERRENO' ? 20 : 15)) / 100)}
                    bold
                  />
                  <Row label="→ Comisión asesor (estándar)" value={fmt(montoAsesor)} />
                  <Row label="→ Saldo líder" value={fmt(montoLiderSaldo)} />
                  {montoJorgeBolsa > 0 && (
                    <Row label="→ Jorge bolsa" value={fmt(montoJorgeBolsa)} />
                  )}
                  {montoKassBolsa > 0 && <Row label="→ Kass bolsa" value={fmt(montoKassBolsa)} />}
                  {montoDianaBolsa > 0 && (
                    <Row label="→ Diana bolsa" value={fmt(montoDianaBolsa)} />
                  )}
                  {tipoProducto === 'TERRENO' && (
                    <Row
                      label={`→ Fijo Jorge (${form.socioFijoJorgeOverride !== null ? form.socioFijoJorgeOverride + '%' : 'global 1.5%'})`}
                      value={fmt(
                        (ej.monto *
                          (form.socioFijoJorgeOverride !== null
                            ? form.socioFijoJorgeOverride
                            : 1.5)) /
                          100,
                      )}
                    />
                  )}
                  {tipoProducto === 'TERRENO' && (
                    <Row
                      label={`→ Fijo Kass (${form.socioFijoKassOverride !== null ? form.socioFijoKassOverride + '%' : 'global 1.5%'})`}
                      value={fmt(
                        (ej.monto *
                          (form.socioFijoKassOverride !== null
                            ? form.socioFijoKassOverride
                            : 1.5)) /
                          100,
                      )}
                    />
                  )}
                </tbody>
              </table>
              <p className="text-muted-foreground mt-2 text-xs">
                + costos operativos (OP BM Corp + OP YESYUCAN) vienen del esquema global.
              </p>
            </div>
          )}

          <Field label="Regla especial">
            <select
              value={form.reglaEspecial}
              onChange={(e) =>
                setForm({
                  ...form,
                  reglaEspecial: e.target.value as typeof form.reglaEspecial,
                })
              }
              className="input"
            >
              {REGLAS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground mt-1 text-xs">
              {REGLAS.find((r) => r.value === form.reglaEspecial)?.desc}
            </p>
          </Field>

          <label className="text-muted-foreground flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.requiereConfig}
              onChange={(e) => setForm({ ...form, requiereConfig: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              <span className="text-foreground font-medium">Pausar cálculo automático.</span> Útil
              si la alianza requiere revisión de Dirección General antes de procesar. Las ventas se
              sincronizan pero no se calcula su comisión.
            </span>
          </label>

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
              {pending ? 'Guardando...' : matrizActual ? 'Actualizar matriz' : 'Crear matriz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-xs font-medium uppercase">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
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
}: {
  label: string
  hint: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium uppercase">{label}</span>
        <span className="text-muted-foreground inline-flex items-center" title={hint}>
          <HelpCircle className="h-3 w-3" />
        </span>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input flex-1 tabular-nums"
        />
        <span className="text-muted-foreground text-xs">%</span>
      </div>
      <p className="text-muted-foreground mt-0.5 text-[10px]">{hint}</p>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td className={`py-1 ${bold ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </td>
      <td className={`py-1 text-right tabular-nums ${bold ? 'text-foreground font-bold' : ''}`}>
        {value}
      </td>
    </tr>
  )
}
