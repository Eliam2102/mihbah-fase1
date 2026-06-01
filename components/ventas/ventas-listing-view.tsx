'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { VentaCreateForm } from '@/components/ventas/venta-create-form'
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
  Layers,
  MapPin,
  UserCircle2,
  Briefcase,
} from 'lucide-react'
import type {
  VentaListItem,
  GrupoEstado,
  VentasListResult,
} from '@/lib/services/ventas/ventas-listing.service'

type Alianza = { id: string; nombre: string }
type Desarrollo = { id: string; nombre: string }

const ESTADO_LABELS: Record<string, { label: string; color: string }> = {
  EN_PROCESO: { label: 'En pipeline', color: 'border-muted/50 bg-muted/30 text-muted-foreground' },
  APROBADO_VENTAS: { label: 'Aprobado ventas', color: 'border-info/20 bg-info/10 text-info' },
  APROBADO_JURIDICO: { label: 'Aprobado jurídico', color: 'border-info/30 bg-info/15 text-info' },
  ESPERANDO_AUTORIZACION: {
    label: 'Esperando autorización',
    color: 'border-warning/20 bg-warning/10 text-warning',
  },
  RECHAZADO: {
    label: 'Rechazado',
    color: 'border-destructive/20 bg-destructive/10 text-destructive',
  },
  LIBERADO: {
    label: 'Liberada (caída)',
    color: 'border-muted/50 bg-muted/30 text-muted-foreground line-through',
  },
  FINALIZADA: {
    label: 'Finalizada',
    color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  FINALIZADO_Y_LIQUIDADO: {
    label: 'Finalizada y liquidada',
    color: 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  CANCELADA: {
    label: 'Cancelada',
    color: 'border-muted/50 bg-muted/30 text-muted-foreground line-through',
  },
}

export function VentasListingView({
  empresaId,
  result,
  alianzas,
  desarrollos,
  anios,
  currentFilter,
  alianzasParaAlta,
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
    asesor?: string
    query?: string
    page: number
  }
  alianzasParaAlta?: Alianza[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [queryLocal, setQueryLocal] = useState(currentFilter.query ?? '')
  const [asesorLocal, setAsesorLocal] = useState(currentFilter.asesor ?? '')

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === '') params.delete(k)
      else params.set(k, v)
    }
    if (!('page' in next)) params.delete('page')
    startTransition(() => router.push(`?${params.toString()}`, { scroll: false }))
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({
      q: queryLocal.trim() || undefined,
      asesor: asesorLocal.trim() || undefined,
    })
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const totalPages = Math.max(1, Math.ceil(result.total / 50))
  const filtersActive =
    currentFilter.anio !== undefined ||
    currentFilter.afiliadoId !== undefined ||
    currentFilter.desarrolloId !== undefined ||
    currentFilter.asesor !== undefined ||
    (currentFilter.query !== undefined && currentFilter.query !== '')

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500">
      {/* Hero stats with Glassmorphism */}
      <div className="border-primary/20 from-primary/10 via-background to-background relative overflow-hidden rounded-3xl border bg-gradient-to-br p-8 shadow-sm backdrop-blur-xl transition-all hover:shadow-md">
        <div className="bg-primary/20 absolute -top-32 -right-32 h-64 w-64 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="border-primary/20 bg-primary/5 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase shadow-sm backdrop-blur-md">
            <Layers className="h-3.5 w-3.5" />
            Ventas BM CORP
          </div>
          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
                Panel de Ventas
              </h1>
              <p className="text-muted-foreground mt-2 text-sm font-medium">
                <span className="text-foreground">{result.total}</span> venta
                {result.total === 1 ? '' : 's'} encontradas con el filtro actual
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat
              icon={<Wallet className="text-amber-500" />}
              label="Total vendido"
              value={fmt(result.stats.totalVendido)}
              sub={`${result.stats.contadores.todas} ventas registradas`}
              accent="amber"
            />
            <HeroStat
              icon={<TrendingUp className="text-indigo-500" />}
              label="Comisión generada"
              value={fmt(result.stats.totalComisionGenerada)}
              sub="Esperada para BM CORP"
              accent="indigo"
            />
            <HeroStat
              icon={<CheckCircle2 className="text-emerald-500" />}
              label="Comisión pagada"
              value={fmt(result.stats.totalComisionPagada)}
              sub={`${result.stats.porcentajeConciliado.toFixed(1)}% conciliado`}
              accent="emerald"
            />
            <HeroStat
              icon={<Clock className="text-rose-500" />}
              label="Pendiente"
              value={fmt(result.stats.totalComisionGenerada - result.stats.totalComisionPagada)}
              sub="Por cobrar / dispersar"
              accent="rose"
            />
          </div>

          {alianzasParaAlta && (
            <div className="mt-6">
              <VentaCreateForm
                empresaId={empresaId}
                alianzas={alianzasParaAlta}
                desarrollos={desarrollos}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modern Filter Bar */}
      <div className="border-border/50 bg-background/80 sticky top-0 z-20 -mx-4 rounded-b-2xl border-b px-4 py-4 shadow-sm backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form
            onSubmit={handleSearch}
            className="group relative flex w-full items-center gap-2 lg:max-w-md"
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="text-muted-foreground group-focus-within:text-primary h-4 w-4 transition-colors" />
            </div>
            <input
              type="search"
              value={queryLocal}
              onChange={(e) => setQueryLocal(e.target.value)}
              placeholder="Buscar cliente, lote..."
              className="border-border/50 bg-muted/30 focus:border-primary/50 focus:bg-background focus:ring-primary/10 w-full rounded-xl border py-2.5 pr-10 pl-10 text-sm transition-all outline-none focus:ring-4"
            />
            {queryLocal && (
              <button
                type="button"
                onClick={() => {
                  setQueryLocal('')
                  updateParams({ q: undefined })
                }}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-16 flex items-center pr-3"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 absolute top-1.5 right-1.5 bottom-1.5 rounded-lg px-4 text-xs font-medium transition-all hover:shadow-sm"
            >
              Buscar
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <div className="border-border/50 bg-muted/30 flex items-center gap-2 rounded-xl border px-3 py-1.5">
              <Filter className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Filtros
              </span>
            </div>

            <SelectFilter
              value={currentFilter.anio?.toString() ?? ''}
              onChange={(v) => updateParams({ anio: v || undefined })}
              options={[
                { value: '', label: 'Año' },
                ...anios.map((y) => ({ value: String(y), label: String(y) })),
              ]}
            />

            {currentFilter.anio && (
              <SelectFilter
                value={currentFilter.mes?.toString() ?? ''}
                onChange={(v) => updateParams({ mes: v || undefined })}
                options={[
                  { value: '', label: 'Mes' },
                  ...Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                    value: String(m),
                    label: new Date(2026, m - 1, 1).toLocaleDateString('es-MX', { month: 'long' }),
                  })),
                ]}
              />
            )}

            <SelectFilter
              value={currentFilter.afiliadoId ?? ''}
              onChange={(v) => updateParams({ alianza: v || undefined })}
              options={[
                { value: '', label: 'Alianza' },
                ...alianzas.map((a) => ({ value: a.id, label: a.nombre })),
              ]}
            />

            <SelectFilter
              value={currentFilter.desarrolloId ?? ''}
              onChange={(v) => updateParams({ desarrollo: v || undefined })}
              options={[
                { value: '', label: 'Desarrollo' },
                ...desarrollos.map((d) => ({ value: d.id, label: d.nombre })),
              ]}
            />

            {/* Asesor input filter */}
            <form
              onSubmit={handleSearch}
              className="border-border/50 bg-muted/30 focus-within:border-primary/50 focus-within:bg-background focus-within:ring-primary/10 flex items-center gap-1 rounded-xl border px-3 py-1.5 transition-all focus-within:ring-2"
            >
              <UserCircle2 className="text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={asesorLocal}
                onChange={(e) => setAsesorLocal(e.target.value)}
                placeholder="Asesor"
                className="placeholder:text-muted-foreground w-24 bg-transparent text-xs outline-none"
              />
              {asesorLocal && (
                <button
                  type="button"
                  onClick={() => {
                    setAsesorLocal('')
                    updateParams({ asesor: undefined })
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </form>

            {filtersActive && (
              <button
                onClick={() => {
                  setQueryLocal('')
                  setAsesorLocal('')
                  startTransition(() => router.push('?'))
                }}
                className="border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}

            {pending && (
              <div className="text-primary flex items-center gap-2 px-2 text-xs font-medium">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Actualizando...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Table Area */}
      <div className="border-border/50 bg-card/60 overflow-hidden rounded-2xl border shadow-sm backdrop-blur-xl">
        <div className="border-border/50 bg-muted/20 flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-foreground text-lg font-bold">Listado de Ventas</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Mostrando {result.rows.length} registros
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-border/50 bg-muted/30 text-muted-foreground border-b text-xs">
              <tr>
                <th className="px-6 py-4 text-left font-semibold tracking-wider uppercase">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left font-semibold tracking-wider uppercase">
                  Asignación
                </th>
                <th className="px-6 py-4 text-left font-semibold tracking-wider uppercase">
                  Ubicación
                </th>
                <th className="px-6 py-4 text-right font-semibold tracking-wider uppercase">
                  Monto Total
                </th>
                <th className="px-6 py-4 text-center font-semibold tracking-wider uppercase">
                  Avance Pago
                </th>
                <th className="px-6 py-4 text-center font-semibold tracking-wider uppercase">
                  Comisión
                </th>
                <th className="px-6 py-4 text-center font-semibold tracking-wider uppercase">
                  Estado
                </th>
                <th className="px-6 py-4 text-center font-semibold tracking-wider uppercase">
                  Año
                </th>
                <th className="px-6 py-4 text-center font-semibold tracking-wider uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-border/50 divide-y">
              {result.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="bg-muted/50 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                      <Package className="text-muted-foreground/50 h-10 w-10" />
                    </div>
                    <h3 className="text-foreground text-lg font-semibold">
                      No hay ventas que coincidan
                    </h3>
                    <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
                      Intenta ajustar o limpiar tus filtros actuales para encontrar lo que buscas.
                    </p>
                    {filtersActive && (
                      <button
                        onClick={() => {
                          setQueryLocal('')
                          setAsesorLocal('')
                          updateParams({
                            anio: undefined,
                            mes: undefined,
                            alianza: undefined,
                            desarrollo: undefined,
                            asesor: undefined,
                            q: undefined,
                          })
                        }}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-lg px-6 py-2 text-sm font-semibold transition-all hover:shadow-md"
                      >
                        Limpiar todos los filtros
                      </button>
                    )}
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
          <div className="border-border/50 bg-muted/10 flex items-center justify-between border-t px-6 py-4">
            <p className="text-muted-foreground text-xs font-medium">
              Mostrando página{' '}
              <span className="text-foreground font-bold">{currentFilter.page}</span> de{' '}
              <span className="text-foreground font-bold">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentFilter.page <= 1}
                onClick={() => updateParams({ page: String(currentFilter.page - 1) })}
                className="border-border/50 bg-background text-foreground hover:bg-muted flex items-center gap-1 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                disabled={currentFilter.page >= totalPages}
                onClick={() => updateParams({ page: String(currentFilter.page + 1) })}
                className="border-border/50 bg-background text-foreground hover:bg-muted flex items-center gap-1 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-border/50 bg-muted/30 focus:border-primary/50 focus:bg-background focus:ring-primary/10 hover:bg-muted/50 cursor-pointer appearance-none rounded-xl border px-3 py-1.5 text-xs transition-all outline-none focus:ring-2"
      style={{
        paddingRight: '2rem',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundPosition: 'right 0.5rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function HeroStat({
  icon,
  label,
  value,
  sub,
  accent = 'primary',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: 'primary' | 'amber' | 'indigo' | 'emerald' | 'rose'
}) {
  const accentClasses = {
    primary: 'border-primary/20 bg-primary/5 text-primary',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-600',
    indigo: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-600',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600',
    rose: 'border-rose-500/20 bg-rose-500/5 text-rose-600',
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-transform hover:scale-[1.02] ${accentClasses[accent].split(' ').slice(0, 2).join(' ')}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="bg-background/50 border-border/50 rounded-full border p-2 shadow-sm">
          {icon}
        </div>
        <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p
        className={`text-2xl font-extrabold tracking-tight tabular-nums ${accentClasses[accent].split(' ').pop()}`}
      >
        {value}
      </p>
      {sub && <p className="text-muted-foreground mt-1 text-[11px] font-medium uppercase">{sub}</p>}
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
  const router = useRouter()
  const estado = ESTADO_LABELS[v.estadoVenta] ?? {
    label: v.estadoVenta,
    color: 'border-muted/50 bg-muted/30 text-muted-foreground',
  }

  const diasDesdeApertura = v.diasEnPipeline
  const avancePagoCliente = v.porcentajeEnganchePagado
  const pctComisionPagada = v.porcentajeAvancePago

  return (
    <tr
      className="group hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => router.push(`/empresa/${empresaId}/ventas/${v.ventaId}`)}
    >
      {/* Cliente */}
      <td className="px-6 py-4">
        <p className="text-foreground group-hover:text-primary font-bold transition-colors">
          {v.cliente}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">ID: {v.ventaId.slice(0, 8)}</p>
      </td>

      {/* Alianza · Asesor */}
      <td className="px-6 py-4 text-xs">
        <div className="text-foreground mb-1 flex items-center gap-1.5 font-medium">
          <Briefcase className="text-primary/70 h-3 w-3" />
          {v.alianzaNombre ?? 'Sin alianza'}
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5">
          <UserCircle2 className="h-3 w-3" />
          {v.asesor ?? 'Sin asesor'}
        </div>
      </td>

      {/* Desarrollo · Lote */}
      <td className="px-6 py-4 text-xs">
        <div className="text-foreground mb-1 flex items-center gap-1.5 font-medium">
          <MapPin className="h-3 w-3 text-emerald-500/70" />
          {v.desarrolloNombre ?? '—'}
        </div>
        {v.loteAcciones && (
          <div className="bg-muted/50 text-muted-foreground inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px]">
            Lote: {v.loteAcciones}
          </div>
        )}
      </td>

      {/* Monto total */}
      <td className="px-6 py-4 text-right">
        <span className="text-foreground font-bold tabular-nums">{fmt(v.monto)}</span>
      </td>

      {/* Avance pago cliente */}
      <td className="px-6 py-4 text-center">
        <ProgressMini
          pct={avancePagoCliente}
          label={`${avancePagoCliente.toFixed(1)}%`}
          color="primary"
        />
      </td>

      {/* % Comisión pagada */}
      <td className="px-6 py-4 text-center">
        {v.sinEsquema ? (
          <span className="border-warning/20 bg-warning/10 text-warning inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase">
            <AlertCircle className="h-3 w-3" />
            Sin config
          </span>
        ) : (
          <ProgressMini
            pct={pctComisionPagada}
            label={`${pctComisionPagada.toFixed(1)}%`}
            color="success"
          />
        )}
      </td>

      {/* Estado */}
      <td className="px-6 py-4 text-center">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${estado.color}`}
        >
          {estado.label}
        </span>
      </td>

      {/* Año de la venta */}
      <td className="px-6 py-4 text-center text-xs">
        <div className="border-border/50 bg-muted/30 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-medium tabular-nums">
          <Calendar className="h-3 w-3" />
          {v.fechaApertura ? new Date(v.fechaApertura).getFullYear() : '—'}
        </div>
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
    <div className="flex flex-col items-center gap-1">
      <div className="bg-muted/50 h-2 w-24 overflow-hidden rounded-full shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color === 'success' ? 'bg-emerald-500' : 'bg-primary'}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <p className="text-muted-foreground text-[10px] font-bold tabular-nums">{label}</p>
    </div>
  )
}

function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function RefreshCw(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
