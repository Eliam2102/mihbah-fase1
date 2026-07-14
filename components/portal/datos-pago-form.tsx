'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Banknote,
  CreditCard,
  Smartphone,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { actualizarDatosPagoLiderAction } from '@/app/actions/portal-datos-pago'

type MetodoPago = 'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'OTRO'

const METODOS: { value: MetodoPago; label: string; icon: React.ReactNode }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: <Banknote className="h-4 w-4" /> },
  { value: 'DEPOSITO', label: 'Depósito', icon: <CreditCard className="h-4 w-4" /> },
  {
    value: 'TRANSFERENCIA',
    label: 'Depósito / Transferencia',
    icon: <Smartphone className="h-4 w-4" />,
  },
  { value: 'OTRO', label: 'Otro', icon: <HelpCircle className="h-4 w-4" /> },
]

export function DatosPagoForm({
  initial,
  alianzas,
}: {
  initial: { metodoPago: MetodoPago; clabe: string; banco: string; numeroCuenta: string }
  alianzas: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const requiereBanco = form.metodoPago === 'DEPOSITO' || form.metodoPago === 'TRANSFERENCIA'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(false)
    startTransition(async () => {
      const res = await actualizarDatosPagoLiderAction({
        metodoPago: form.metodoPago,
        clabe: form.clabe || null,
        banco: form.banco || null,
        numeroCuenta: form.numeroCuenta || null,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setOk(true)
      router.refresh()
    })
  }

  const inputCls =
    'bg-background border-input focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Datos de pago</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cómo quieres recibir tus comisiones. Tesorería usará estos datos para pagarte.
          {alianzas.length > 1 && ' Aplica a todas tus alianzas.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card space-y-5 rounded-xl border p-5 shadow-sm">
        {/* Método */}
        <div>
          <label className="text-muted-foreground mb-2 block text-xs font-medium">
            Método de pago
          </label>
          <div className="flex flex-wrap gap-2">
            {METODOS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setForm({ ...form, metodoPago: m.value })}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  form.metodoPago === m.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Datos bancarios — solo si depósito/transferencia */}
        {requiereBanco && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  CLABE
                </label>
                <input
                  value={form.clabe}
                  onChange={(e) => setForm({ ...form, clabe: e.target.value })}
                  className={inputCls}
                  placeholder="18 dígitos"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-medium">
                  Banco
                </label>
                <input
                  value={form.banco}
                  onChange={(e) => setForm({ ...form, banco: e.target.value })}
                  className={inputCls}
                  placeholder="BBVA, Banorte, etc."
                />
              </div>
            </div>
            <div>
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                Número de cuenta (opcional)
              </label>
              <input
                value={form.numeroCuenta}
                onChange={(e) => setForm({ ...form, numeroCuenta: e.target.value })}
                className={inputCls}
              />
            </div>
            <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="text-success h-3.5 w-3.5" />
              CLABE y número de cuenta se guardan cifrados (AES-256-GCM).
            </p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {ok && (
          <div className="text-success border-success/30 bg-success/10 inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4" /> Datos guardados.
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {pending ? 'Guardando...' : 'Guardar datos de pago'}
        </button>
      </form>
    </div>
  )
}
