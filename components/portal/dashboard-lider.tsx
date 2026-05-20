'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Wallet,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Search,
  Building2,
  Trophy,
  Crown,
} from 'lucide-react'
import type { DispersionPortal, PerfilPortal } from '@/lib/services/comisiones/portal.service'
import type { Asesor } from '@/lib/services/comisiones/alianzas.service'

type Estado = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'DIFERIDO'

const SEMAFORO: Record<Estado, { label: string; pill: string; dot: string }> = {
  PENDIENTE: {
    label: 'Pendiente',
    pill: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
  PARCIAL: {
    label: 'Parcial',
    pill: 'bg-warning/10 text-warning border-warning/30',
    dot: 'bg-warning',
  },
  PAGADO: {
    label: 'Pagado',
    pill: 'bg-success/10 text-success border-success/30',
    dot: 'bg-success',
  },
  DIFERIDO: {
    label: 'Diferido',
    pill: 'bg-info/10 text-info border-info/30',
    dot: 'bg-info',
  },
}

type Tab = 'resumen' | 'mias' | 'equipo'

export function DashboardLider({
  perfil,
  dispersiones,
  asesores,
  userName,
}: {
  perfil: PerfilPortal
  dispersiones: DispersionPortal[]
  asesores: Asesor[]
  userName: string
}) {
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    })

  const dispLider = dispersiones.filter((d) => d.tipoBeneficiario === 'LIDER_SALDO')
  const dispAsesores = dispersiones.filter((d) => d.tipoBeneficiario === 'ASESOR')

  const totalLider = dispLider.reduce((s, d) => s + d.montoTotal, 0)
  const pagadoLider = dispLider.reduce((s, d) => s + d.montoPagado, 0)
  const pendienteLider = dispLider
    .filter((d) => d.estado !== 'PAGADO')
    .reduce((s, d) => s + (d.montoTotal - d.montoPagado), 0)
  const totalRed = dispAsesores.reduce((s, d) => s + d.montoTotal, 0)
  const pagadoRed = dispAsesores.reduce((s, d) => s + d.montoPagado, 0)

  const progLider = totalLider > 0 ? (pagadoLider / totalLider) * 100 : 0

  // Agrupar dispersiones por asesor (React Compiler memoiza)
  const porAsesor = (() => {
    const map = new Map<string, { nombre: string; total: number; pagado: number; count: number }>()
    for (const d of dispAsesores) {
      const key = d.asesorNombre ?? '— Sin asesor —'
      const cur = map.get(key) ?? { nombre: key, total: 0, pagado: 0, count: 0 }
      cur.total += d.montoTotal
      cur.pagado += d.montoPagado
      cur.count += 1
      map.set(key, cur)
    }
    return map
  })()

  const ranking = [...porAsesor.values()].sort((a, b) => b.total - a.total)

  const [tab, setTab] = useState<Tab>('resumen')
  const [query, setQuery] = useState('')

  const q = query.toLowerCase()
  const dispLiderFilt = query
    ? dispLider.filter(
        (d) =>
          d.ventaCliente.toLowerCase().includes(q) ||
          (d.asesorNombre?.toLowerCase().includes(q) ?? false),
      )
    : dispLider

  const asesoresOrdenados = [...asesores].sort((a, b) => {
    const ta = porAsesor.get(a.nombre)?.total ?? 0
    const tb = porAsesor.get(b.nombre)?.total ?? 0
    return tb - ta
  })

  return (
    <section className="space-y-6">
      {/* Hero */}
      <div className="from-jade-700 via-jade-800 to-jade-900 relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm sm:p-8">
        <div className="bg-jade-400/20 absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-jade-300/10 absolute -bottom-16 -left-12 h-56 w-56 rounded-full blur-3xl" />
        <div className="relative">
          <div className="text-jade-100 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <Crown className="h-3.5 w-3.5" />
            Líder de alianza
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Hola, {userName}</h1>
          <p className="text-jade-50/90 mt-2 text-sm sm:text-base">
            Alianza <span className="font-semibold">{perfil.alianzaNombre ?? '—'}</span>
            {perfil.liderNombre && perfil.liderNombre !== userName && (
              <> · representando a {perfil.liderNombre}</>
            )}
            {' · '}
            {asesores.length} asesor{asesores.length === 1 ? '' : 'es'}
          </p>

          <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4">
            <div>
              <p className="text-jade-200 text-[11px] font-medium tracking-wide uppercase">
                Tu saldo
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums sm:text-2xl">{fmt(totalLider)}</p>
              <div className="bg-jade-950/40 mt-2 h-1.5 overflow-hidden rounded-full">
                <div
                  className="from-jade-200 h-full rounded-full bg-gradient-to-r to-white"
                  style={{ width: `${Math.min(100, progLider)}%` }}
                />
              </div>
              <p className="text-jade-100 mt-1 text-[11px]">
                {fmt(pagadoLider)} cobrado · {progLider.toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-jade-200 text-[11px] font-medium tracking-wide uppercase">
                Producción red
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums sm:text-2xl">{fmt(totalRed)}</p>
              <p className="text-jade-100 mt-3 text-[11px]">
                {fmt(pagadoRed)} cobrado · {dispAsesores.length} dispersiones
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Tu saldo líder"
          value={fmt(totalLider)}
          sub="Comisión total"
          accent="primary"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Pagado a ti"
          value={fmt(pagadoLider)}
          sub={`${dispLider.filter((d) => d.estado === 'PAGADO').length} de ${dispLider.length}`}
          accent="success"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Pendiente tuyo"
          value={fmt(pendienteLider)}
          sub="Por recibir"
          accent="warning"
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Total red"
          value={fmt(totalRed)}
          sub={`${asesores.length} asesor${asesores.length === 1 ? '' : 'es'}`}
          accent="info"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <TabButton active={tab === 'resumen'} onClick={() => setTab('resumen')}>
          <Trophy className="h-3.5 w-3.5" /> Resumen
        </TabButton>
        <TabButton active={tab === 'mias'} onClick={() => setTab('mias')}>
          <Wallet className="h-3.5 w-3.5" /> Mis comisiones
          <span className="bg-muted ml-1 rounded-full px-1.5 text-[10px]">{dispLider.length}</span>
        </TabButton>
        <TabButton active={tab === 'equipo'} onClick={() => setTab('equipo')}>
          <Users className="h-3.5 w-3.5" /> Equipo
          <span className="bg-muted ml-1 rounded-full px-1.5 text-[10px]">{asesores.length}</span>
        </TabButton>
      </div>

      {tab === 'resumen' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Ranking de producción" subtitle="Asesores ordenados por venta total">
            {ranking.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-7 w-7 opacity-40" />}
                title="Sin producción aún"
                description="Cuando tus asesores generen ventas aparecerá aquí."
              />
            ) : (
              <ul className="divide-y">
                {ranking.slice(0, 8).map((r, i) => {
                  const pct = r.total > 0 ? (r.pagado / r.total) * 100 : 0
                  return (
                    <li key={r.nombre} className="flex items-center gap-3 px-4 py-3">
                      <RankBadge position={i + 1} />
                      <Avatar name={r.nombre} />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">{r.nombre}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {r.count} venta{r.count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="text-foreground text-sm font-semibold">{fmt(r.total)}</p>
                        <p className="text-success text-[11px]">
                          {fmt(r.pagado)} · {pct.toFixed(0)}%
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card title="Estado de tus comisiones" subtitle="Desglose de tus dispersiones de líder">
            <div className="p-4">
              {dispLider.length === 0 ? (
                <EmptyState
                  icon={<Wallet className="h-7 w-7 opacity-40" />}
                  title="Sin comisiones de líder"
                  description="Aún no se generan dispersiones a tu nombre."
                />
              ) : (
                <div className="space-y-3">
                  <BreakdownBar dispersiones={dispLider} fmt={fmt} />
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <StatLine label="Pagado" value={fmt(pagadoLider)} dot="bg-success" />
                    <StatLine label="Pendiente" value={fmt(pendienteLider)} dot="bg-warning" />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'mias' && (
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-foreground text-base font-semibold">Mis comisiones de líder</h2>
              <p className="text-muted-foreground text-xs">
                {dispLiderFilt.length} de {dispLider.length} dispersiones
              </p>
            </div>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cliente o asesor..."
                className="bg-background border-input focus:border-ring focus:ring-ring/20 w-full rounded-md border py-1.5 pr-2.5 pl-8 text-xs focus:ring-2 focus:outline-none sm:w-64"
              />
            </div>
          </div>

          {dispLiderFilt.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-7 w-7 opacity-40" />}
              title="Sin resultados"
              description="Ajusta la búsqueda o espera a la siguiente venta."
            />
          ) : (
            <>
              {/* Tabla desktop */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Cliente</th>
                      <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">
                        Asesor
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">Monto</th>
                      <th className="px-4 py-2.5 text-right font-medium">Pagado</th>
                      <th className="px-4 py-2.5 text-left font-medium">Avance</th>
                      <th className="px-4 py-2.5 text-center font-medium">Estado</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dispLiderFilt.map((d) => {
                      const sem = SEMAFORO[d.estado as Estado] ?? SEMAFORO.PENDIENTE
                      const pct = d.montoTotal > 0 ? (d.montoPagado / d.montoTotal) * 100 : 0
                      return (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                          <td className="text-foreground px-4 py-3 font-medium">
                            {d.ventaCliente}
                          </td>
                          <td className="text-muted-foreground hidden px-4 py-3 text-xs md:table-cell">
                            {d.asesorNombre ?? '—'}
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

              {/* Cards mobile */}
              <ul className="divide-y sm:hidden">
                {dispLiderFilt.map((d) => {
                  const sem = SEMAFORO[d.estado as Estado] ?? SEMAFORO.PENDIENTE
                  const pct = d.montoTotal > 0 ? (d.montoPagado / d.montoTotal) * 100 : 0
                  return (
                    <li key={d.id}>
                      <Link
                        href={`/portal/comprobantes/${d.id}`}
                        className="hover:bg-muted/30 flex flex-col gap-2.5 p-4 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-sm font-semibold">
                              {d.ventaCliente}
                            </p>
                            <p className="text-muted-foreground truncate text-[11px]">
                              {d.asesorNombre ?? '—'}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sem.pill}`}
                          >
                            {sem.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground text-[11px]">Monto</p>
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
                        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-success h-full rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'equipo' && (
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="border-b p-4">
            <h2 className="text-foreground text-base font-semibold">
              Tu equipo ({asesores.length})
            </h2>
            <p className="text-muted-foreground text-xs">
              Producción de cada asesor bajo tu alianza
            </p>
          </div>

          {asesores.length === 0 ? (
            <EmptyState
              icon={<Users className="h-7 w-7 opacity-40" />}
              title="Sin asesores asignados"
              description="Joana puede crearlos desde admin."
            />
          ) : (
            <ul className="divide-y">
              {asesoresOrdenados.map((a) => {
                const stats = porAsesor.get(a.nombre)
                const pagado = stats?.pagado ?? 0
                const total = stats?.total ?? 0
                const ventas = stats?.count ?? 0
                const pct = total > 0 ? (pagado / total) * 100 : 0
                return (
                  <li key={a.id} className="flex items-center gap-3 p-4">
                    <Avatar name={a.nombre} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm font-semibold">{a.nombre}</p>
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                        <span>{a.email ?? 'Sin email'}</span>
                        {a.mondayNombre && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {a.mondayNombre}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-2 max-w-xs">
                        <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-success h-full rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-foreground text-sm font-semibold">{fmt(total)}</p>
                      <p className="text-success text-[11px]">{fmt(pagado)}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {ventas} venta{ventas === 1 ? '' : 's'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'border-primary text-foreground'
          : 'text-muted-foreground hover:text-foreground border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="border-b p-4">
        <h3 className="text-foreground text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </div>
      {children}
    </div>
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
    <div className="bg-card hover:border-primary/30 rounded-xl border p-4 shadow-sm transition-colors">
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

function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  const cls = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-9 w-9 text-xs'
  return (
    <span
      className={`from-jade-500 to-jade-700 grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white ${cls}`}
    >
      {initials}
    </span>
  )
}

function RankBadge({ position }: { position: number }) {
  const styles =
    position === 1
      ? 'bg-warning/15 text-warning ring-warning/30'
      : position === 2
        ? 'bg-muted text-foreground ring-border'
        : position === 3
          ? 'bg-jade-100 text-jade-800 ring-jade-300'
          : 'bg-muted text-muted-foreground ring-border'
  return (
    <span
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ring-1 ${styles}`}
    >
      {position}
    </span>
  )
}

function StatLine({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <div>
        <p className="text-muted-foreground text-[11px]">{label}</p>
        <p className="text-foreground text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  )
}

function BreakdownBar({
  dispersiones,
  fmt,
}: {
  dispersiones: DispersionPortal[]
  fmt: (n: number) => string
}) {
  const total = dispersiones.reduce((s, d) => s + d.montoTotal, 0) || 1
  const pagado = dispersiones.reduce((s, d) => s + d.montoPagado, 0)
  const parcial = dispersiones
    .filter((d) => d.estado === 'PARCIAL')
    .reduce((s, d) => s + (d.montoTotal - d.montoPagado), 0)
  const pendiente = dispersiones
    .filter((d) => d.estado === 'PENDIENTE')
    .reduce((s, d) => s + d.montoTotal, 0)
  const diferido = dispersiones.reduce((s, d) => s + d.montoDiferido, 0)

  return (
    <div>
      <div className="bg-muted/50 flex h-3 w-full overflow-hidden rounded-full">
        <div
          className="bg-success h-full"
          style={{ width: `${(pagado / total) * 100}%` }}
          title={`Pagado · ${fmt(pagado)}`}
        />
        <div
          className="bg-warning h-full"
          style={{ width: `${(parcial / total) * 100}%` }}
          title={`Parcial · ${fmt(parcial)}`}
        />
        <div
          className="bg-info/60 h-full"
          style={{ width: `${(diferido / total) * 100}%` }}
          title={`Diferido · ${fmt(diferido)}`}
        />
        <div
          className="bg-muted-foreground/30 h-full"
          style={{ width: `${(pendiente / total) * 100}%` }}
          title={`Pendiente · ${fmt(pendiente)}`}
        />
      </div>
      <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <Legend dot="bg-success" label={`Pagado ${fmt(pagado)}`} />
        <Legend dot="bg-warning" label={`Parcial ${fmt(parcial)}`} />
        <Legend dot="bg-info/60" label={`Diferido ${fmt(diferido)}`} />
        <Legend dot="bg-muted-foreground/30" label={`Pendiente ${fmt(pendiente)}`} />
      </div>
    </div>
  )
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
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
