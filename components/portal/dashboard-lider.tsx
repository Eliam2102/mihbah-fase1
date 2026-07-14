'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Wallet,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react'
import type { VentaLiderPortal, PerfilPortal } from '@/lib/services/comisiones/portal.service'
import type { Asesor } from '@/lib/services/comisiones/alianzas.service'

type Estado = 'PENDIENTE' | 'EN_REVISION' | 'AUTORIZADA' | 'PARCIAL' | 'PAGADO' | 'DIFERIDO'

const SEMAFORO: Record<Estado, { label: string; pill: string }> = {
  PENDIENTE: { label: 'Diferido', pill: 'bg-slate-100 text-slate-500' },
  EN_REVISION: { label: 'En revisión', pill: 'bg-purple-100 text-purple-700' },
  AUTORIZADA: { label: 'Por pagar', pill: 'bg-blue-100 text-blue-700' },
  PARCIAL: { label: 'Parcial', pill: 'bg-amber-100 text-amber-700' },
  PAGADO: { label: 'Pagado', pill: 'bg-emerald-100 text-emerald-700' },
  DIFERIDO: { label: 'Diferido', pill: 'bg-slate-100 text-slate-500' },
}

export function DashboardLider({
  perfil,
  ventas,
  asesores,
  userName,
}: {
  perfil: PerfilPortal
  ventas: VentaLiderPortal[]
  asesores: Asesor[]
  userName: string
}) {
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

  const [busqueda, setBusqueda] = useState('')
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // KPIs globales — usar sum de dispersiones (ya filtradas, sin socios internos)
  const totalAlianza = ventas.reduce(
    (s, v) => s + v.dispersiones.reduce((sd, d) => sd + d.montoTotal, 0),
    0,
  )
  const totalPagado = ventas.reduce(
    (s, v) => s + v.dispersiones.reduce((sd, d) => sd + d.montoPagado, 0),
    0,
  )
  const totalPendiente = totalAlianza - totalPagado
  const pct = totalAlianza > 0 ? (totalPagado / totalAlianza) * 100 : 0

  const ventasFiltradas = busqueda
    ? ventas.filter(
        (v) =>
          v.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
          (v.loteAcciones ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
          (v.desarrolloNombre ?? '').toLowerCase().includes(busqueda.toLowerCase()),
      )
    : ventas

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Hola, {userName}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {perfil.alianzaNombre ?? 'Mi alianza'} · {ventas.length}{' '}
          {ventas.length === 1 ? 'venta' : 'ventas'} con comisión
        </p>
      </div>

      {/* Descarga */}
      <div className="flex justify-end">
        <a
          href="/portal/reportes"
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
        >
          <Download className="h-3.5 w-3.5" />
          Descargar reporte CSV
        </a>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Comisión total"
          value={fmt(totalAlianza)}
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

      {/* Barra progreso global */}
      <div className="bg-card rounded-xl border p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Avance de cobro de comisiones</span>
          <span className="font-semibold">{pct.toFixed(1)}%</span>
        </div>
        <div className="bg-muted h-2.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      {/* Tabla de ventas */}
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <h2 className="text-foreground flex-1 text-sm font-semibold">
            Mis ventas — resumen de comisiones
          </h2>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente o lote..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-muted/40 rounded-md py-1.5 pr-3 pl-7 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none sm:w-48"
            />
          </div>
        </div>

        {ventasFiltradas.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            {ventas.length === 0
              ? 'Sin ventas con comisiones registradas aún.'
              : 'Sin resultados para tu búsqueda.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-2.5 font-semibold">Cliente / Lote</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Valor del lote</th>
                  <th className="px-3 py-2.5 text-center font-semibold">% pagado (cliente)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Total comisión</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Pagado</th>
                  <th className="px-3 py-2.5 text-center font-semibold">% Pagado</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Pendiente</th>
                  <th className="px-3 py-2.5 text-center font-semibold">% Pendiente</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Estado</th>
                  <th className="px-4 py-2.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ventasFiltradas.map((v) => {
                  const montoAlianzaTotal = v.dispersiones.reduce((s, d) => s + d.montoTotal, 0)
                  const montoPagadoVenta = v.dispersiones.reduce((s, d) => s + d.montoPagado, 0)
                  const montoPendienteVenta = montoAlianzaTotal - montoPagadoVenta
                  const pctVenta =
                    montoAlianzaTotal > 0 ? (montoPagadoVenta / montoAlianzaTotal) * 100 : 0
                  const pctPendienteVenta = 100 - pctVenta
                  const dispPagadas = v.dispersiones.filter((d) => d.estado === 'PAGADO')
                  const hasPdf = dispPagadas.length > 0
                  const expanded = expandidas.has(v.ventaId)

                  // Estado agregado de la venta
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
                        {/* Cliente / Lote */}
                        <td className="px-4 py-3">
                          <p className="text-foreground font-semibold">{v.cliente}</p>
                          <p className="text-muted-foreground mt-0.5">
                            {[v.loteAcciones && `Lote ${v.loteAcciones}`, v.desarrolloNombre]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                          {/* Mini barra de progreso */}
                          <div className="bg-muted mt-1.5 h-1 w-20 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, pctVenta)}%` }}
                            />
                          </div>
                        </td>

                        {/* Valor del lote */}
                        <td className="px-3 py-3 text-right tabular-nums">{fmt(v.monto)}</td>

                        {/* % pagado por el cliente */}
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-bold text-blue-700">
                            {v.porcentajeClientePagado.toFixed(1)}%
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span className="text-foreground font-bold">
                            {fmt(montoAlianzaTotal)}
                          </span>
                        </td>

                        {/* Pagado */}
                        <td className="px-3 py-3 text-right text-emerald-600 tabular-nums">
                          {fmt(montoPagadoVenta)}
                        </td>

                        {/* % Pagado */}
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                            {pctVenta.toFixed(1)}%
                          </span>
                        </td>

                        {/* Pendiente */}
                        <td className="px-3 py-3 text-right text-amber-600 tabular-nums">
                          {fmt(montoPendienteVenta)}
                        </td>

                        {/* % Pendiente */}
                        <td className="px-3 py-3 text-center">
                          {montoPendienteVenta > 0 ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
                              {pctPendienteVenta.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${estadoAgregado.pill}`}
                          >
                            {estadoAgregado.label}
                          </span>
                        </td>

                        {/* Comprobantes */}
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

                      {/* Fila expandida — solo comprobantes PDF */}
                      {expanded && hasPdf && (
                        <tr key={`${v.ventaId}-pdf`}>
                          <td colSpan={10} className="bg-muted/10 px-4 py-2">
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
        )}
      </div>

      {/* Mi equipo */}
      {asesores.length > 0 && (
        <div className="bg-card overflow-hidden rounded-xl border">
          <div className="border-b px-4 py-3">
            <h2 className="text-foreground text-sm font-semibold">
              Mi equipo ({asesores.length} asesores)
            </h2>
          </div>
          <div className="divide-y">
            {asesores.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-foreground font-medium">{a.nombre}</span>
                <span className="text-muted-foreground text-xs">
                  {a.email ?? a.telefono ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Método de pago */}
      <div className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
        <Wallet className="mx-auto mb-2 h-5 w-5" />
        <p>
          ¿Quieres actualizar tu método de pago?{' '}
          <Link href="/portal/datos-pago" className="text-primary font-medium hover:underline">
            Configura aquí
          </Link>
        </p>
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
