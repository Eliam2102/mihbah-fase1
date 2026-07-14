'use client'
import NumberInput from '@/components/ui/number-input'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, X, AlertCircle, Info } from 'lucide-react'
import { registrarAbonoVentaAction } from '@/app/actions/cortes'

type CorteBorrador = { id: string; fechaCorte: string; tipoDia: string }

const METODOS = [
  { value: '', label: 'Sin especificar' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'OTRO', label: 'Otro' },
]

export function RegistrarAbonoForm({
  empresaId,
  ventaId,
  montoVenta,
  cortesBorrador,
  proximosDias,
  engancheSugerido = 0,
  esPrimerAbono = false,
}: {
  empresaId: string
  ventaId: string
  montoVenta: number
  cortesBorrador: CorteBorrador[]
  proximosDias: { lunes: string; jueves: string }
  // Primer abono: se pre-llena con el enganche ya registrado (editable).
  engancheSugerido?: number
  esPrimerAbono?: boolean
}) {
  // El primer abono arranca con el enganche conocido; los siguientes en 0.
  const montoInicial = esPrimerAbono && engancheSugerido > 0 ? engancheSugerido : 0
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // "NUEVO" o el id de un corte existente
  const [corteSel, setCorteSel] = useState<string>(cortesBorrador[0]?.id ?? 'NUEVO')
  const [nuevoTipo, setNuevoTipo] = useState<'LUNES' | 'JUEVES'>('LUNES')
  const [monto, setMonto] = useState(montoInicial)
  const [metodo, setMetodo] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState('')

  const pct = montoVenta > 0 ? (monto / montoVenta) * 100 : 0
  const esNuevo = corteSel === 'NUEVO'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (monto <= 0) return setError('El monto abonado debe ser positivo')
    if (monto > montoVenta) return setError('El abono no puede superar el monto de la venta')

    startTransition(async () => {
      const result = await registrarAbonoVentaAction({
        empresaId,
        ventaId,
        montoPagadoCliente: monto,
        metodoPagoCliente: (metodo || null) as never,
        fechaPagoCliente: fecha || null,
        corteId: esNuevo ? null : corteSel,
        nuevoCorteFecha: esNuevo
          ? nuevoTipo === 'LUNES'
            ? proximosDias.lunes
            : proximosDias.jueves
          : null,
        nuevoCorteTipo: esNuevo ? nuevoTipo : null,
        notasJoana: notas.trim() || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setError(null)
          setMonto(montoInicial)
          setMetodo('')
          setFecha(new Date().toISOString().slice(0, 10))
          setNotas('')
          setCorteSel(cortesBorrador[0]?.id ?? 'NUEVO')
          setOpen(true)
        }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
      >
        <Plus className="h-3.5 w-3.5" />
        Registrar abono
      </button>
    )
  }

  return (
    <div className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <h2 className="text-foreground text-base font-semibold">Registrar abono del cliente</h2>
        <button
          onClick={() => setOpen(false)}
          disabled={pending}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Monto abonado (MXN)"
          required
          hint={
            esPrimerAbono && engancheSugerido > 0
              ? `Pre-llenado con el enganche (${pct.toFixed(2)}% de la venta). Editable.`
              : `${pct.toFixed(2)}% del monto de la venta`
          }
        >
          <input
            type="number"
            step="0.01"
            min={0}
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm tabular-nums"
          />
        </Field>

        <Field label="Método de pago">
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fecha del abono">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          />
        </Field>

        <Field label="Corte" hint="El abono se registra dentro de un corte (lote de pagos)">
          <select
            value={corteSel}
            onChange={(e) => setCorteSel(e.target.value)}
            className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
          >
            {cortesBorrador.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fechaCorte} · {c.tipoDia} (borrador)
              </option>
            ))}
            <option value="NUEVO">➕ Crear corte nuevo</option>
          </select>
        </Field>

        {esNuevo && (
          <Field label="Día del nuevo corte" hint="Se crea en borrador">
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as 'LUNES' | 'JUEVES')}
              className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
            >
              <option value="LUNES">Lunes — {proximosDias.lunes}</option>
              <option value="JUEVES">Jueves — {proximosDias.jueves}</option>
            </select>
          </Field>
        )}

        <div className="sm:col-span-2">
          <Field label="Notas (opcional)">
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="border-border bg-background w-full rounded-md border px-2.5 py-1.5 text-sm"
              placeholder="Referencia, contexto…"
            />
          </Field>
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
            {pending ? 'Registrando…' : 'Registrar abono'}
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
