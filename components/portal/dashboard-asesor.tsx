'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Wallet,
  Clock,
  CheckCircle2,
  FileText,
  TrendingUp,
  Search,
  Building2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import type { DispersionPortal, PerfilPortal } from '@/lib/services/comisiones/portal.service'

type Estado = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'DIFERIDO'

const SEMAFORO: Record<Estado, { label: string; pill: string; dot: string }> = {
  PENDIENTE: {
    label: 'Pendiente',
    pill: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
  PARCIAL: {
    label: 'Pago parcial',
    pill: 'bg-warning/10 text-warning border-warning/30',
    dot: 'bg-warning',
  },
  PAGADO: {
    label: 'Pagado',
    pill: 'bg-success/10 text-success border-success/30',
    dot: 'bg-success',
  },
  DIFERIDO: {
    label: 'En espera (enganche)',
    pill: 'bg-info/10 text-info border-info/30',
    dot: 'bg-info',
  },
}

type Filtro = 'TODAS' | Estado

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'PARCIAL', label: 'Parciales' },
  { id: 'PAGADO', label: 'Pagadas' },
  { id: 'DIFERIDO', label: 'Diferidas' },
]

export function DashboardAsesor({
  perfil,
  dispersiones,
  userName,
}: {
  perfil: PerfilPortal
  dispersiones: DispersionPortal[]
  userName: string
}) {
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    })

  const proximaPago = dispersiones.find((d) => d.estado === 'PENDIENTE' || d.estado === 'PARCIAL')
  const pendientesTotal = dispersiones
    .filter((d) => d.estado !== 'PAGADO')
    .reduce((s, d) => s + (d.montoTotal - d.montoPagado), 0)
  const pagadoHistorico = dispersiones.reduce((s, d) => s + d.montoPagado, 0)
  const diferidoTotal = dispersiones.reduce((s, d) => s + d.montoDiferido, 0)
  const totalHistorico = dispersiones.reduce((s, d) => s + d.montoTotal, 0)
  const progreso = totalHistorico > 0 ? (pagadoHistorico / totalHistorico) * 100 : 0

  const [filtro, setFiltro] = useState<Filtro>('TODAS')
  const [query, setQuery] = useState('')

  const filtradas = dispersiones.filter((d) => {
    if (filtro !== 'TODAS' && d.estado !== filtro) return false
    if (query) {
      const q = query.toLowerCase()
      if (
        !d.ventaCliente.toLowerCase().includes(q) &&
        !(d.desarrolloNombre?.toLowerCase().includes(q) ?? false)
      )
        return false
    }
    return true
  })

  const counts: Record<Filtro, number> = {
    TODAS: dispersiones.length,
    PENDIENTE: 0,
    PARCIAL: 0,
    PAGADO: 0,
    DIFERIDO: 0,
  }
  for (const d of dispersiones) {
    if (d.estado in counts) counts[d.estado as Estado] += 1
  }

  return (
    <section className="space-y-6">
      {/* Hero */}
      <div className="from-primary via-jade-600 to-jade-700 relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm sm:p-8">
        <div className="bg-jade-400/20 absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-jade-300/10 absolute -bottom-16 -left-12 h-56 w-56 rounded-full blur-3xl" />
        <div className="relative">
          <p className="text-jade-100 text-xs font-medium tracking-wide uppercase">Bienvenido</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Hola, {userName}</h1>
          <p className="text-jade-50/90 mt-2 text-sm sm:text-base">
            {perfil.alianzasNombres.length === 0 ? (
              <>
                Asesor de <span className="font-semibold">—</span>
              </>
            ) : perfil.alianzasNombres.length === 1 ? (
              <>
                Asesor de <span className="font-semibold">{perfil.alianzasNombres[0]}</span>
              </>
            ) : (
              <>
                Asesor en {perfil.alianzasNombres.length} alianzas:{' '}
                <span className="font-semibold">{perfil.alianzasNombres.join(' · ')}</span>
              </>
            )}
            {perfil.asesorNombre && perfil.asesorNombre !== userName && (
              <> · representando a {perfil.asesorNombre}</>
            )}
          </p>

          <div className="mt-6 max-w-md">
            <div className="text-jade-100 mb-1.5 flex items-center justify-between text-xs">
              <span>Progreso histórico</span>
              <span className="font-semibold">{progreso.toFixed(0)}%</span>
            </div>
            <div className="bg-jade-950/30 h-2 overflow-hidden rounded-full">
              <div
                className="from-jade-200 h-full rounded-full bg-gradient-to-r to-white transition-all"
                style={{ width: `${Math.min(100, progreso)}%` }}
              />
            </div>
            <p className="text-jade-100 mt-1.5 text-xs">
              {fmt(pagadoHistorico)} cobrado de {fmt(totalHistorico)} generado
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Próxima comisión"
          value={proximaPago ? fmt(proximaPago.montoTotal - proximaPago.montoPagado) : '—'}
          sub={proximaPago ? proximaPago.ventaCliente : 'Sin pendientes'}
          accent="primary"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Pagado histórico"
          value={fmt(pagadoHistorico)}
          sub={`${dispersiones.filter((d) => d.estado === 'PAGADO').length} dispersiones`}
          accent="success"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Por cobrar"
          value={fmt(pendientesTotal)}
          sub="Pendiente + parcial"
          accent="warning"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Diferido"
          value={fmt(diferidoTotal)}
          sub="Se libera al cobrarse"
          accent="info"
        />
      </div>

      {/* Tabla detalle */}
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-foreground text-base font-semibold">Detalle de comisiones</h2>
            <p className="text-muted-foreground text-xs">
              {filtradas.length} de {dispersiones.length} dispersiones
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente o desarrollo..."
                className="bg-background border-input focus:border-ring focus:ring-ring/20 w-full rounded-md border py-1.5 pr-2.5 pl-8 text-xs focus:ring-2 focus:outline-none sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-1 overflow-x-auto border-b p-2 sm:px-4">
          {FILTROS.map((f) => {
            const active = filtro === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active ? 'bg-white/20' : 'bg-muted-foreground/15'
                  }`}
                >
                  {counts[f.id]}
                </span>
              </button>
            )
          })}
        </div>

        {filtradas.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-7 w-7 opacity-40" />}
            title={query || filtro !== 'TODAS' ? 'Sin resultados' : 'Aún sin comisiones'}
            description={
              query || filtro !== 'TODAS'
                ? 'Ajusta los filtros o la búsqueda.'
                : 'En cuanto Joana procese tu primera venta aparecerá aquí.'
            }
          />
        ) : (
          <>
            {/* Tabla desktop */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                    <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">
                      Desarrollo
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 text-right font-medium">Pagado</th>
                    <th className="px-4 py-2.5 text-left font-medium">Avance</th>
                    <th className="px-4 py-2.5 text-center font-medium">Estado</th>
                    <th className="hidden px-4 py-2.5 text-center font-medium lg:table-cell">
                      Fecha
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtradas.map((d) => {
                    const sem = SEMAFORO[d.estado as Estado] ?? SEMAFORO.PENDIENTE
                    const pct = d.montoTotal > 0 ? (d.montoPagado / d.montoTotal) * 100 : 0
                    return (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="bg-primary/10 text-primary grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-semibold">
                              {d.ventaCliente
                                .split(' ')
                                .slice(0, 2)
                                .map((p) => p[0]?.toUpperCase())
                                .join('') || '?'}
                            </span>
                            <div className="min-w-0">
                              <p className="text-foreground truncate font-medium">
                                {d.ventaCliente}
                              </p>
                              {d.ventaMondayItemId && (
                                <p className="text-muted-foreground font-mono text-[10px]">
                                  ID Monday: {d.ventaMondayItemId}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-muted-foreground hidden px-4 py-3 text-xs md:table-cell">
                          <div className="inline-flex items-center gap-1.5">
                            <Building2 className="h-3 w-3" />
                            {d.desarrolloNombre ?? '—'}
                          </div>
                          <div className="text-[11px] opacity-70">{d.tipoProducto}</div>
                        </td>
                        <td className="text-foreground px-4 py-3 text-right font-medium tabular-nums">
                          {fmt(d.montoTotal)}
                        </td>
                        <td className="text-success px-4 py-3 text-right tabular-nums">
                          {fmt(d.montoPagado)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                              <div
                                className="bg-success h-full rounded-full"
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground text-[11px] tabular-nums">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${sem.pill}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${sem.dot}`} />
                            {sem.label}
                          </span>
                        </td>
                        <td className="text-muted-foreground hidden px-4 py-3 text-center text-xs lg:table-cell">
                          {d.fechaPago ?? d.fechaEstimadaPago ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/portal/comprobantes/${d.id}`}
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                            title="Ver comprobantes"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards en móvil */}
            <ul className="divide-y sm:hidden">
              {filtradas.map((d) => {
                const sem = SEMAFORO[d.estado as Estado] ?? SEMAFORO.PENDIENTE
                const pct = d.montoTotal > 0 ? (d.montoPagado / d.montoTotal) * 100 : 0
                return (
                  <li key={d.id}>
                    <Link
                      href={`/portal/comprobantes/${d.id}`}
                      className="hover:bg-muted/30 flex flex-col gap-2.5 p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-primary/10 text-primary grid h-9 w-9 shrink-0 place-items-center rounded-md text-xs font-semibold">
                            {d.ventaCliente
                              .split(' ')
                              .slice(0, 2)
                              .map((p) => p[0]?.toUpperCase())
                              .join('') || '?'}
                          </span>
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-sm font-semibold">
                              {d.ventaCliente}
                            </p>
                            <p className="text-muted-foreground truncate text-[11px]">
                              {d.desarrolloNombre ?? '—'} · {d.tipoProducto}
                            </p>
                            {d.ventaMondayItemId && (
                              <p className="text-muted-foreground/80 font-mono text-[10px]">
                                ID: {d.ventaMondayItemId}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sem.pill}`}
                        >
                          {sem.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground text-[11px]">Total</p>
                          <p className="text-foreground font-semibold tabular-nums">
                            {fmt(d.montoTotal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[11px]">Pagado</p>
                          <p className="text-success font-semibold tabular-nums">
                            {fmt(d.montoPagado)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-success h-full rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-primary inline-flex items-center gap-1 text-xs font-medium">
                        <FileText className="h-3 w-3" />
                        Ver comprobantes
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {/* Recordatorio */}
      <div className="border-info/30 bg-info/5 text-muted-foreground flex items-start gap-3 rounded-lg border p-4 text-xs">
        <AlertCircle className="text-info mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-foreground font-medium">
            Total pendiente por recibir:{' '}
            <span className="text-success">{fmt(pendientesTotal)}</span>
          </p>
          <p className="mt-0.5">
            Los pagos se procesan al cobrar las mensualidades. Si tienes dudas contacta a Joana.
          </p>
        </div>
      </div>
    </section>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent: 'primary' | 'success' | 'warning' | 'info'
}) {
  const styles = {
    primary: { ring: 'bg-primary/10 text-primary', text: 'text-foreground' },
    success: { ring: 'bg-success/10 text-success', text: 'text-success' },
    warning: { ring: 'bg-warning/10 text-warning', text: 'text-warning' },
    info: { ring: 'bg-info/10 text-info', text: 'text-foreground' },
  }[accent]
  return (
    <div className="bg-card hover:border-primary/30 group rounded-xl border p-4 shadow-sm transition-colors">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${styles.ring}`}
        >
          {icon}
        </span>
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {label}
        </p>
      </div>
      <p className={`mt-3 text-xl font-bold tabular-nums sm:text-2xl ${styles.text}`}>{value}</p>
      <p className="text-muted-foreground mt-1 truncate text-xs">{sub}</p>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-12 text-center">
      <div className="text-muted-foreground bg-muted/40 grid h-14 w-14 place-items-center rounded-full">
        {icon}
      </div>
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground max-w-xs text-xs">{description}</p>
    </div>
  )
}
