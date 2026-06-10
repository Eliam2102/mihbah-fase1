'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, FileText, Wallet, CheckCircle2, Clock } from 'lucide-react'
import type { VentaLiderPortal } from '@/lib/services/comisiones/portal.service'

type Estado = 'PENDIENTE' | 'EN_REVISION' | 'AUTORIZADA' | 'PARCIAL' | 'PAGADO' | 'DIFERIDO'

const SEMAFORO: Record<Estado, { label: string; pill: string }> = {
  PENDIENTE: { label: 'Diferido', pill: 'bg-slate-100 text-slate-500' },
  EN_REVISION: { label: 'En revisión', pill: 'bg-purple-100 text-purple-700' },
  AUTORIZADA: { label: 'Por pagar', pill: 'bg-blue-100 text-blue-700' },
  PARCIAL: { label: 'Parcial', pill: 'bg-amber-100 text-amber-700' },
  PAGADO: { label: 'Pagado', pill: 'bg-emerald-100 text-emerald-700' },
  DIFERIDO: { label: 'Diferido', pill: 'bg-slate-100 text-slate-500' },
}

const NOMBRES_SOCIO: Record<string, string> = {
  JORGE: 'socio',
  KASS: 'socia',
  DIANA: 'socia',
}

export function SocioComisionesSection({
  ventas,
  socioTipo,
}: {
  ventas: VentaLiderPortal[]
  socioTipo: string
}) {
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (ventas.length === 0) return null

  const totalSocio = ventas.reduce(
    (s, v) => s + v.dispersiones.reduce((sd, d) => sd + d.montoTotal, 0),
    0,
  )
  const totalPagado = ventas.reduce(
    (s, v) => s + v.dispersiones.reduce((sd, d) => sd + d.montoPagado, 0),
    0,
  )
  const totalPendiente = totalSocio - totalPagado
  const pct = totalSocio > 0 ? (totalPagado / totalSocio) * 100 : 0
  const tipoLabel = NOMBRES_SOCIO[socioTipo] ?? 'socio'

  return (
    <div className="space-y-4">
      <h2 className="text-foreground text-base font-bold">Mis comisiones como {tipoLabel}</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Comisión total"
          value={fmt(totalSocio)}
          color="text-foreground"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Ya pagado"
          value={fmt(totalPagado)}
          color="text-emerald-600"
          sub={`${pct.toFixed(1)}% del total`}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Pendiente"
          value={fmt(totalPendiente)}
          color="text-amber-600"
        />
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="border-b px-4 py-3">
          <h3 className="text-foreground text-sm font-semibold">
            Ventas — comisión de {tipoLabel}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th className="px-4 py-2.5 font-semibold">Cliente / Lote</th>
                <th className="px-3 py-2.5 font-semibold">Alianza</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total comisión</th>
                <th className="px-3 py-2.5 text-right font-semibold">Pagado</th>
                <th className="px-3 py-2.5 text-center font-semibold">% Pagado</th>
                <th className="px-3 py-2.5 text-right font-semibold">Pendiente</th>
                <th className="px-3 py-2.5 text-center font-semibold">Estado</th>
                <th className="px-4 py-2.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ventas.map((v) => {
                const montoTotal = v.dispersiones.reduce((s, d) => s + d.montoTotal, 0)
                const montoPagado = v.dispersiones.reduce((s, d) => s + d.montoPagado, 0)
                const montoPendiente = montoTotal - montoPagado
                const pctVenta = montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0
                const dispPagadas = v.dispersiones.filter((d) => d.estado === 'PAGADO')
                const hasPdf = dispPagadas.length > 0
                const expanded = expandidas.has(v.ventaId)

                const todosPagado = v.dispersiones.every((d) => d.estado === 'PAGADO')
                const algunoPagado = dispPagadas.length > 0
                const estadoAgregado = todosPagado
                  ? SEMAFORO.PAGADO
                  : algunoPagado
                    ? SEMAFORO.PARCIAL
                    : SEMAFORO.AUTORIZADA

                return (
                  <>
                    <tr key={v.ventaId} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="text-foreground font-semibold">{v.cliente}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {[v.loteAcciones && `Lote ${v.loteAcciones}`, v.desarrolloNombre]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </td>
                      <td className="text-muted-foreground px-3 py-3">{v.alianzaNombre ?? '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        <span className="text-foreground font-bold">{fmt(montoTotal)}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-600 tabular-nums">
                        {fmt(montoPagado)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                          {pctVenta.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-amber-600 tabular-nums">
                        {fmt(montoPendiente)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${estadoAgregado.pill}`}
                        >
                          {estadoAgregado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPdf && (
                          <button
                            type="button"
                            onClick={() => toggle(v.ventaId)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Ver comprobantes"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>

                    {expanded && hasPdf && (
                      <tr key={`${v.ventaId}-pdf`}>
                        <td colSpan={8} className="bg-muted/10 px-4 py-2">
                          <div className="flex flex-wrap gap-2">
                            {dispPagadas.map((d) => (
                              <Link
                                key={d.id}
                                href={`/portal/comprobantes/${d.id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100"
                              >
                                <FileText className="h-3 w-3" /> Comprobante PDF
                              </Link>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
  sub?: string
}) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="text-muted-foreground mb-2 flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
    </div>
  )
}
