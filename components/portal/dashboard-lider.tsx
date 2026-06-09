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

const TIPO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Op. BM Corp',
  OP_YESYUCAN: 'Op. YESYUCAN',
  ASESOR: 'Asesor',
  LIDER_SALDO: 'Líder (Afiliación)',
  SOCIO_BOLSA_JORGE: 'Socio bolsa Jorge',
  SOCIO_BOLSA_KASS: 'Socio bolsa Kass',
  SOCIO_BOLSA_DIANA: 'Socio bolsa Diana',
  SOCIO_FIJO_JORGE: 'Socio fijo Jorge',
  SOCIO_FIJO_KASS: 'Socio fijo Kass',
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
      next.has(id) ? next.delete(id) : next.add(id)
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

      {/* Lista de ventas */}
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <h2 className="text-foreground flex-1 text-sm font-semibold">
            Mis ventas — desglose por dispersión
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
          <div className="divide-y">
            {ventasFiltradas.map((v) => {
              const expanded = expandidas.has(v.ventaId)
              const montoAlianzaTotal = v.dispersiones.reduce((s, d) => s + d.montoTotal, 0)
              const montoPagadoVenta = v.dispersiones.reduce((s, d) => s + d.montoPagado, 0)
              const montoPendienteVenta = montoAlianzaTotal - montoPagadoVenta
              const pctVenta =
                montoAlianzaTotal > 0 ? (montoPagadoVenta / montoAlianzaTotal) * 100 : 0
              const pctPendienteVenta = 100 - pctVenta
              const dispPagadas = v.dispersiones.filter((d) => d.estado === 'PAGADO')
              const ultimaFechaPago =
                dispPagadas.length > 0
                  ? dispPagadas.sort((a, b) =>
                      (b.fechaPago ?? '').localeCompare(a.fechaPago ?? ''),
                    )[0]?.fechaPago
                  : null

              return (
                <div key={v.ventaId}>
                  {/* Fila venta — siempre visible */}
                  <button
                    type="button"
                    onClick={() => toggle(v.ventaId)}
                    className="hover:bg-muted/20 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                  >
                    <div className="text-muted-foreground shrink-0">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground text-sm font-semibold">{v.cliente}</span>
                        {v.loteAcciones && (
                          <span className="text-muted-foreground text-xs">
                            Lote {v.loteAcciones}
                          </span>
                        )}
                        {v.desarrolloNombre && (
                          <span className="text-muted-foreground text-xs">
                            · {v.desarrolloNombre}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, pctVenta)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {pctVenta.toFixed(0)}% cobrado
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-foreground text-sm font-bold tabular-nums">
                        {fmt(montoAlianzaTotal)}
                      </div>
                      <div className="text-muted-foreground text-xs tabular-nums">
                        {fmt(montoPagadoVenta)} pagado
                      </div>
                    </div>
                  </button>

                  {/* Detalle agregado — sin desglose interno, solo totales + % */}
                  {expanded && (
                    <div className="bg-muted/10 border-t px-4 py-4">
                      <div className="space-y-3">
                        {/* Barra de progreso */}
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">
                              Avance de cobro
                            </span>
                            <span className="font-bold">{pctVenta.toFixed(1)}%</span>
                          </div>
                          <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${Math.min(100, pctVenta)}%` }}
                            />
                          </div>
                        </div>

                        {/* 3 tarjetas: Total | Pagado | Pendiente */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-card rounded-lg border p-3">
                            <p className="text-muted-foreground mb-1 font-medium">Total comisión</p>
                            <p className="text-foreground font-bold tabular-nums">
                              {fmt(montoAlianzaTotal)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                            <p className="mb-1 font-medium text-emerald-700 dark:text-emerald-400">
                              Pagado
                            </p>
                            <p className="font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
                              {fmt(montoPagadoVenta)}
                            </p>
                            <p className="mt-0.5 text-emerald-600 dark:text-emerald-500">
                              {pctVenta.toFixed(1)}%
                            </p>
                          </div>
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                            <p className="mb-1 font-medium text-amber-700 dark:text-amber-400">
                              Pendiente
                            </p>
                            <p className="font-bold text-amber-700 tabular-nums dark:text-amber-400">
                              {fmt(montoPendienteVenta)}
                            </p>
                            <p className="mt-0.5 text-amber-600 dark:text-amber-500">
                              {pctPendienteVenta.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {/* Último pago + comprobantes */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {ultimaFechaPago && (
                            <p className="text-muted-foreground text-xs">
                              Último pago: {ultimaFechaPago}
                            </p>
                          )}
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
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
