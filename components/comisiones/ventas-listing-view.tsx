'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  X,
  Filter,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Wallet,
  Calendar,
  Package,
  XCircle,
} from 'lucide-react'
import type {
  VentaListItem,
  GrupoEstado,
  VentasListResult,
} from '@/lib/services/comisiones/ventas-listing.service'

type Alianza = { id: string; nombre: string }
type Desarrollo = { id: string; nombre: string }

const TABS: { id: GrupoEstado; label: string; icon: React.ReactNode }[] = [
  { id: 'por_cerrar', label: 'Por cerrar', icon: <Clock className="h-3.5 w-3.5" /> },
  { id: 'cerradas', label: 'Cerradas', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { id: 'en_proceso', label: 'En proceso', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: 'canceladas', label: 'Canceladas', icon: <XCircle className="h-3.5 w-3.5" /> },
  { id: 'todas', label: 'Todas', icon: <Package className="h-3.5 w-3.5" /> },
]

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  EN_PROCESO: { label: 'En proceso', color: 'bg-muted text-muted-foreground' },
  APROBADO_VENTAS: { label: 'Aprobado ventas', color: 'bg-info/10 text-info' },
  APROBADO_JURIDICO: { label: 'Aprobado jurídico', color: 'bg-info/15 text-info' },
  ESPERANDO_AUTORIZACION: { label: 'Esperando autorización', color: 'bg-warning/10 text-warning' },
  RECHAZADO: { label: 'Rechazado', color: 'bg-destructive/10 text-destructive' },
  LIBERADO: { label: 'Liberado', color: 'bg-success/10 text-success' },
  FINALIZADA: { label: 'Finalizada', color: 'bg-success/10 text-success' },
  FINALIZADO_Y_LIQUIDADO: { label: 'Finalizada y liquidada', color: 'bg-success/15 text-success' },
  CANCELADA: { label: 'Cancelada', color: 'bg-muted text-muted-foreground line-through' },
}

export function VentasListingView({
  empresaId,
  result,
  alianzas,
  desarrollos,
  anios,
  currentFilter,
}: {
  empresaId: string
  result: VentasListResult
  alianzas: Alianza[]
  desarrollos: Desarrollo[]
  anios: number[]
  currentFilter: {
    grupo: GrupoEstado
    anio?: number
    mes?: number
    afiliadoId?: string
    desarrolloId?: string
    query?: string
    page: number
  }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [queryLocal, setQueryLocal] = useState(currentFilter.query ?? '')

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === '') params.delete(k)
      else params.set(k, v)
    }
    // Al cambiar filtros, volver a página 1
    if (!('page' in next)) params.delete('page')
    startTransition(() => router.push(`?${params.toString()}`))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ q: queryLocal.trim() || undefined })
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

  const totalPages = Math.max(1, Math.ceil(result.total / 50))
  const filtersActive =
    currentFilter.anio !== undefined ||
    currentFilter.afiliadoId !== undefined ||
    currentFilter.desarrolloId !== undefined ||
    (currentFilter.query !== undefined && currentFilter.query !== '')

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <div className="from-jade-700 via-jade-800 to-jade-900 relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm">
        <div className="bg-jade-400/20 absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-jade-300/10 absolute -bottom-16 -left-12 h-56 w-56 rounded-full blur-3xl" />
        <div className="relative">
          <div className="text-jade-100 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
            <TrendingUp className="h-3.5 w-3.5" />
            Ventas BM CORP
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Pipeline de ventas</h1>
          <p className="text-jade-50/90 mt-1 text-sm">
            {result.total} venta{result.total === 1 ? '' : 's'} en el filtro actual
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <HeroStat
              icon={<Wallet className="h-4 w-4" />}
              label="Total vendido"
              value={fmt(result.stats.totalVendido)}
              sub={`${result.stats.contadores.todas} ventas`}
            />
            <HeroStat
              icon={<TrendingUp className="h-4 w-4" />}
              label="Comisión generada"
              value={fmt(result.stats.totalComisionGenerada)}
              sub="Esperada BM CORP"
            />
            <HeroStat
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Comisión pagada"
              value={fmt(result.stats.totalComisionPagada)}
              sub={`${result.stats.porcentajeConciliado.toFixed(0)}% conciliado`}
            />
            <HeroStat
              icon={<Clock className="h-4 w-4" />}
              label="Pendiente"
              value={fmt(result.stats.totalComisionGenerada - result.stats.totalComisionPagada)}
              sub="Por pagar"
            />
          </div>
        </div>
      </div>

      {/* Tabs por grupo de estado */}
      <div className="border-b">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const active = currentFilter.grupo === t.id
            const count = result.stats.contadores[t.id]
            return (
              <button
                key={t.id}
                onClick={() => updateParams({ grupo: t.id === 'todas' ? undefined : t.id })}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                }`}
              >
                {t.icon}
                {t.label}
                <span
                  className={`ml-1 rounded-full px-1.5 text-[10px] font-semibold ${
                    active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div className="bg-card rounded-xl border p-3 shadow-sm sm:p-4">
        <form
          onSubmit={handleSearch}
          className="border-border focus-within:border-primary focus-within:ring-primary/20 bg-background flex items-center gap-2 rounded-lg border px-3 py-2 transition focus-within:ring-2"
        >
          <Search className="text-muted-foreground h-4 w-4 shrink-0" />
          <input
            type="search"
            value={queryLocal}
            onChange={(e) => setQueryLocal(e.target.value)}
            placeholder="Buscar cliente, asesor o ID Monday..."
            className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
          />
          {queryLocal && (
            <button
              type="button"
              onClick={() => {
                setQueryLocal('')
                updateParams({ q: undefined })
              }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-xs font-medium"
          >
            Buscar
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Filter className="text-muted-foreground h-3.5 w-3.5" />
          <select
            value={currentFilter.anio?.toString() ?? ''}
            onChange={(e) => updateParams({ anio: e.target.value || undefined })}
            className="border-border bg-background rounded-md border px-2.5 py-1.5 text-xs"
          >
            <option value="">Todos los años</option>
            {anios.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {currentFilter.anio && (
            <select
              value={currentFilter.mes?.toString() ?? ''}
              onChange={(e) => updateParams({ mes: e.target.value || undefined })}
              className="border-border bg-background rounded-md border px-2.5 py-1.5 text-xs"
            >
              <option value="">Todos los meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2026, m - 1, 1).toLocaleDateString('es-MX', { month: 'long' })}
                </option>
              ))}
            </select>
          )}

          <select
            value={currentFilter.afiliadoId ?? ''}
            onChange={(e) => updateParams({ alianza: e.target.value || undefined })}
            className="border-border bg-background rounded-md border px-2.5 py-1.5 text-xs"
          >
            <option value="">Todas las alianzas</option>
            {alianzas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>

          <select
            value={currentFilter.desarrolloId ?? ''}
            onChange={(e) => updateParams({ desarrollo: e.target.value || undefined })}
            className="border-border bg-background rounded-md border px-2.5 py-1.5 text-xs"
          >
            <option value="">Todos los desarrollos</option>
            {desarrollos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>

          {filtersActive && (
            <button
              onClick={() => {
                setQueryLocal('')
                startTransition(() => router.push('?'))
              }}
              className="text-primary text-xs hover:underline"
            >
              Limpiar filtros
            </button>
          )}

          {pending && <span className="text-muted-foreground ml-auto text-xs">Cargando...</span>}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="bg-muted/30 border-b px-4 py-2.5">
          <p className="text-muted-foreground text-xs font-medium">
            {result.rows.length} de {result.total} ventas mostradas
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/20 text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium">Cliente</th>
                <th className="px-3 py-2.5 text-left font-medium">Alianza · Asesor</th>
                <th className="px-3 py-2.5 text-left font-medium">Desarrollo · Lote</th>
                <th className="px-3 py-2.5 text-right font-medium">Monto</th>
                <th className="px-3 py-2.5 text-left font-medium">% Enganche</th>
                <th className="px-3 py-2.5 text-right font-medium">Comisión BM</th>
                <th className="px-3 py-2.5 text-left font-medium">% Avance pago</th>
                <th className="px-3 py-2.5 text-center font-medium">Estado</th>
                <th className="px-3 py-2.5 text-center font-medium">Tiempo</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-muted-foreground px-4 py-12 text-center">
                    <Package className="mx-auto mb-3 h-8 w-8 opacity-30" />
                    <p className="font-medium">Sin ventas</p>
                    <p className="mt-1 text-xs">
                      Ajusta los filtros o ejecuta una sincronización Monday.
                    </p>
                  </td>
                </tr>
              ) : (
                result.rows.map((v) => (
                  <FilaVenta key={v.ventaId} venta={v} empresaId={empresaId} fmt={fmt} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <p className="text-muted-foreground text-xs">
              Página {currentFilter.page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentFilter.page <= 1}
                onClick={() => updateParams({ page: String(currentFilter.page - 1) })}
                className="border-border hover:bg-muted rounded-md border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                disabled={currentFilter.page >= totalPages}
                onClick={() => updateParams({ page: String(currentFilter.page + 1) })}
                className="border-border hover:bg-muted rounded-md border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HeroStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-jade-950/30 rounded-xl px-3 py-2.5 backdrop-blur-sm">
      <div className="text-jade-200 inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-bold tabular-nums sm:text-xl">{value}</p>
      {sub && <p className="text-jade-100/80 text-[11px]">{sub}</p>}
    </div>
  )
}

function FilaVenta({
  venta: v,
  empresaId,
  fmt,
}: {
  venta: VentaListItem
  empresaId: string
  fmt: (n: number) => string
}) {
  const estado = ESTADO_LABELS[v.estadoVenta] ?? { label: v.estadoVenta, color: 'bg-muted' }
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-3 py-3">
        <Link
          href={`/empresa/${empresaId}/comisiones/ventas/${v.ventaId}`}
          className="hover:underline"
        >
          <p className="text-foreground font-medium">{v.cliente}</p>
          {v.mondayItemId && (
            <p className="text-muted-foreground font-mono text-[10px]">ID: {v.mondayItemId}</p>
          )}
        </Link>
      </td>
      <td className="px-3 py-3 text-xs">
        <p className="text-foreground">{v.alianzaNombre ?? '—'}</p>
        <p className="text-muted-foreground">{v.asesor ?? '—'}</p>
      </td>
      <td className="px-3 py-3 text-xs">
        <p className="text-foreground">{v.desarrolloNombre ?? '—'}</p>
        {v.loteAcciones && <p className="text-muted-foreground">Lote: {v.loteAcciones}</p>}
      </td>
      <td className="text-foreground px-3 py-3 text-right font-medium tabular-nums">
        {fmt(v.monto)}
      </td>
      <td className="px-3 py-3">
        <ProgressMini
          pct={v.porcentajeEnganchePagado}
          label={`${fmt(v.enganche)} (${v.porcentajeEnganchePagado.toFixed(0)}%)`}
        />
      </td>
      <td className="text-foreground px-3 py-3 text-right tabular-nums">
        {v.sinEsquema ? (
          <span className="text-warning inline-flex items-center gap-1 text-xs">
            <AlertCircle className="h-3 w-3" />
            Sin esquema
          </span>
        ) : (
          fmt(v.comisionBmEsperada)
        )}
      </td>
      <td className="px-3 py-3">
        {v.comisionBmEsperada > 0 ? (
          <ProgressMini
            pct={v.porcentajeAvancePago}
            label={`${fmt(v.comisionPagada)} (${v.porcentajeAvancePago.toFixed(0)}%)`}
            color="success"
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${estado.color}`}
        >
          {estado.label}
        </span>
      </td>
      <td className="px-3 py-3 text-center text-xs">
        {v.diasEnPipeline !== null && (
          <div className="text-muted-foreground inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {v.diasEnPipeline}d
          </div>
        )}
        {v.diasParaCierre !== null && v.diasParaCierre > 0 && (
          <p className="text-info text-[10px]">cierra en {v.diasParaCierre}d</p>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <Link
          href={`/empresa/${empresaId}/comisiones/ventas/${v.ventaId}`}
          className="text-muted-foreground hover:text-foreground inline-block"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  )
}

function ProgressMini({
  pct,
  label,
  color = 'primary',
}: {
  pct: number
  label: string
  color?: 'primary' | 'success'
}) {
  return (
    <div className="space-y-0.5">
      <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full ${color === 'success' ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="text-muted-foreground text-[10px] tabular-nums">{label}</p>
    </div>
  )
}
