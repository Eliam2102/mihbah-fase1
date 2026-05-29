'use client'
import NumberInput from '@/components/ui/number-input'

import { useState, useTransition } from 'react'
import { Calculator, AlertTriangle } from 'lucide-react'
import { precalcularAction } from '@/app/actions/comisiones/precalculo'
import type { CalculatorOutput } from '@/lib/services/comisiones/calculator'

export function PrecalculoForm({ afiliados }: { afiliados: { id: string; nombre: string }[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<CalculatorOutput | null>(null)
  const [form, setForm] = useState({
    afiliadoId: afiliados[0]?.id ?? '',
    tipoProducto: 'TERRENO' as 'TERRENO' | 'ACCION',
    montoVenta: 1_000_000,
    enganchePagado: 120_000,
  })

  function calcular(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResultado(null)
    startTransition(async () => {
      const result = await precalcularAction(form)
      if (!result.ok) setError(result.error)
      else setResultado(result.data)
    })
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const porcentajeEnganche =
    form.montoVenta > 0 ? ((form.enganchePagado / form.montoVenta) * 100).toFixed(2) : '0'

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={calcular}
        className="bg-card space-y-4 rounded-lg border p-5"
        suppressHydrationWarning
      >
        <h2 className="text-foreground font-semibold">Parámetros de la venta</h2>
        <Field label="Alianza">
          <select
            value={form.afiliadoId}
            onChange={(e) => setForm({ ...form, afiliadoId: e.target.value })}
            className="input"
            required
          >
            {afiliados.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo producto">
            <select
              value={form.tipoProducto}
              onChange={(e) =>
                setForm({ ...form, tipoProducto: e.target.value as 'TERRENO' | 'ACCION' })
              }
              className="input"
            >
              <option value="TERRENO">Terreno (20%)</option>
              <option value="ACCION">Acción YCD (15%)</option>
            </select>
          </Field>
          <Field label="% enganche calculado">
            <p className="text-foreground rounded-md border px-2.5 py-1.5 text-sm tabular-nums">
              {porcentajeEnganche}%
            </p>
          </Field>
        </div>

        <Field label="Monto total de venta">
          <input
            type="number"
            min={0}
            step={1000}
            required
            value={form.montoVenta}
            onChange={(e) => setForm({ ...form, montoVenta: Number(e.target.value) })}
            className="input tabular-nums"
          />
        </Field>
        <Field label="Enganche pagado">
          <input
            type="number"
            min={0}
            step={1000}
            required
            value={form.enganchePagado}
            onChange={(e) => setForm({ ...form, enganchePagado: Number(e.target.value) })}
            className="input tabular-nums"
          />
        </Field>

        {error && (
          <div className="text-destructive flex items-center gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm disabled:opacity-60"
        >
          <Calculator className="h-4 w-4" />
          {pending ? 'Calculando...' : 'Calcular'}
        </button>
      </form>

      <div className="bg-card rounded-lg border p-5">
        <h2 className="text-foreground font-semibold">Resultado del cálculo</h2>
        {!resultado ? (
          <p className="text-muted-foreground mt-4 text-sm">
            Llena el formulario y click Calcular para ver el resultado.
          </p>
        ) : resultado.sinConfig ? (
          <div className="border-warning/40 bg-warning/10 text-warning mt-4 rounded-md border p-3 text-sm">
            <p className="font-medium">Sin configuración</p>
            <p className="mt-1 text-xs">{resultado.advertencias[0]}</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Bruta total" value={fmt(resultado.comisionBrutaTotal)} accent />
              <Stat label="Liberable" value={fmt(resultado.montoLiberable)} success />
              <Stat label="Diferido" value={fmt(resultado.montoDiferido)} warning />
            </div>
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 text-left font-medium">Tipo</th>
                  <th className="py-1 text-left font-medium">Beneficiario</th>
                  <th className="py-1 text-right font-medium">Total</th>
                  <th className="py-1 text-right font-medium">Liberable</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {resultado.dispersiones.map((l, i) => (
                  <tr key={i}>
                    <td className="text-muted-foreground py-1 font-mono">{l.tipoBeneficiario}</td>
                    <td className="py-1">{l.beneficiarioNombre}</td>
                    <td className="py-1 text-right tabular-nums">{fmt(l.montoTotal)}</td>
                    <td className="text-success py-1 text-right tabular-nums">
                      {fmt(l.montoLiberable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resultado.advertencias.length > 0 && (
              <div className="border-warning/40 bg-warning/10 text-warning rounded-md border p-2 text-xs">
                {resultado.advertencias.map((a, i) => (
                  <p key={i}>{a}</p>
                ))}
              </div>
            )}
          </div>
        )}
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

function Stat({
  label,
  value,
  accent,
  success,
  warning,
}: {
  label: string
  value: string
  accent?: boolean
  success?: boolean
  warning?: boolean
}) {
  const color = accent
    ? 'text-primary'
    : success
      ? 'text-success'
      : warning
        ? 'text-warning'
        : 'text-foreground'
  return (
    <div className="bg-muted/20 rounded-md p-2 text-center">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
