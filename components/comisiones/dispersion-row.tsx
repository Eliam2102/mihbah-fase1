'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { marcarPagadoAction } from '@/app/actions/comisiones/dispersiones'
import type { Dispersion } from '@/lib/services/comisiones/comisiones.service'

export function DispersionRow({
  empresaId,
  dispersion,
  ventaCliente,
  ventaId,
}: {
  empresaId: string
  dispersion: Dispersion
  ventaCliente: string
  ventaId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [montoCustom, setMontoCustom] = useState('')

  const fmt = (n: string | number) =>
    Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

  const yaPagado = Number(dispersion.montoPagado) >= Number(dispersion.montoTotal) - 0.01

  function handleMarcar() {
    setError(null)
    const monto = montoCustom ? Number(montoCustom) : undefined
    startTransition(async () => {
      const result = await marcarPagadoAction(empresaId, {
        dispersionId: dispersion.id,
        fechaPago: fecha,
        montoPagado: monto,
      })
      if (!result.ok) setError(result.error)
      else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  const restante = Number(dispersion.montoTotal) - Number(dispersion.montoPagado)

  return (
    <>
      <tr className="hover:bg-muted/20">
        <td className="px-2 py-1.5 sm:px-3">
          <div>{dispersion.beneficiarioNombre}</div>
          <Link
            href={`/empresa/${empresaId}/comisiones/ventas/${ventaId}`}
            className="text-muted-foreground text-xs hover:underline md:hidden"
          >
            {ventaCliente}
          </Link>
        </td>
        <td className="text-muted-foreground hidden px-3 py-1.5 text-xs md:table-cell">
          <Link
            href={`/empresa/${empresaId}/comisiones/ventas/${ventaId}`}
            className="hover:underline"
          >
            {ventaCliente}
          </Link>
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">
          <div>{fmt(dispersion.montoTotal)}</div>
          <div className="text-success text-xs tabular-nums sm:hidden">
            {fmt(dispersion.montoPagado)}
          </div>
        </td>
        <td className="text-success hidden px-3 py-1.5 text-right tabular-nums sm:table-cell">
          {fmt(dispersion.montoPagado)}
        </td>
        <td className="px-2 py-1.5 text-center text-xs sm:px-3">
          <EstadoBadge estado={dispersion.estado} />
        </td>
        <td className="text-muted-foreground hidden px-3 py-1.5 text-center text-xs lg:table-cell">
          {dispersion.fechaPago ?? '—'}
        </td>
        <td className="px-2 py-1.5 sm:px-3">
          {!yaPagado && (
            <button
              onClick={() => setOpen(!open)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
            >
              {open ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              <span className="hidden sm:inline">{open ? 'Cancelar' : 'Marcar'}</span>
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="bg-muted/10 px-3 py-3 sm:px-4">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-xs uppercase">
                  Fecha pago
                </span>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="input w-auto"
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground mb-1 block text-xs uppercase">
                  Monto (vacío = restante {fmt(restante)})
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={restante}
                  value={montoCustom}
                  onChange={(e) => setMontoCustom(e.target.value)}
                  placeholder={restante.toFixed(2)}
                  className="input w-40 tabular-nums"
                />
              </label>
              <button
                onClick={handleMarcar}
                disabled={pending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
              >
                {pending ? 'Guardando...' : 'Confirmar pago'}
              </button>
              {error && <span className="text-destructive text-xs">{error}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDIENTE: 'bg-muted text-muted-foreground',
    PARCIAL: 'bg-amber-100 text-amber-800',
    PAGADO: 'bg-jade-100 text-jade-800',
    DIFERIDO: 'bg-blue-100 text-blue-800',
  }
  return <span className={`rounded-full px-2 py-0.5 ${map[estado] ?? 'bg-muted'}`}>{estado}</span>
}
