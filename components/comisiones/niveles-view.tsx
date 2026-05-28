'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  AlertCircle,
  Save,
  Search,
  Filter,
  Users,
  Award,
  Flame,
  Shield,
  TrendingUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { actualizarLiderAction } from '@/app/actions/comisiones/alianzas'

export interface LiderNivelRow {
  id: string
  nombre: string
  alianzaNombre: string
  nivelActual: 'JADE' | 'TURQUESA' | 'ONIX_NEGRO' | null
  promedioMensual: number
}

// Umbrales de meta según doc YESYUCAN v5
function getThresholds(alianzaNombre: string) {
  const name = (alianzaNombre ?? '').toUpperCase()
  const isYCD = name.includes('YCD') || name.includes('YUCAN')
  if (isYCD) {
    return {
      onix: 1_000_000,
      turquesa: 2_000_000,
      jade: 3_000_000,
      tipo: 'YCD',
    }
  }
  return {
    onix: 2_000_000,
    turquesa: 3_500_000,
    jade: 5_000_000,
    tipo: 'Terrenos',
  }
}

// Sugerir nivel basado en promedio y reglas de la alianza
function sugerirNivel(
  promedio: number,
  alianzaNombre: string,
): 'JADE' | 'TURQUESA' | 'ONIX_NEGRO' | null {
  const { onix, turquesa, jade } = getThresholds(alianzaNombre)
  if (promedio >= jade) return 'JADE'
  if (promedio >= turquesa) return 'TURQUESA'
  if (promedio >= onix) return 'ONIX_NEGRO'
  return null
}

const NIVEL_COLOR: Record<string, string> = {
  JADE: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/20',
  TURQUESA:
    'bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-400 dark:bg-cyan-500/20',
  ONIX_NEGRO:
    'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300 dark:bg-slate-500/20',
  SIN_ASIGNAR: 'bg-muted text-muted-foreground border-transparent',
}

const NIVEL_DOCK_COLOR: Record<string, string> = {
  JADE: 'border-emerald-500/30 focus:border-emerald-500 focus:ring-emerald-500/20 bg-emerald-500/[0.02]',
  TURQUESA: 'border-cyan-500/30 focus:border-cyan-500 focus:ring-cyan-500/20 bg-cyan-500/[0.02]',
  ONIX_NEGRO:
    'border-slate-500/30 focus:border-slate-500 focus:ring-slate-500/20 bg-slate-500/[0.02]',
  '': 'border-input focus:border-primary focus:ring-primary/20',
}

export function NivelesView({
  empresaId,
  lideres,
}: {
  empresaId: string
  lideres: LiderNivelRow[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('ALL')

  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  // Estadísticas de distribución
  const stats = useMemo(() => {
    const counts = { total: lideres.length, JADE: 0, TURQUESA: 0, ONIX_NEGRO: 0, SIN_ASIGNAR: 0 }
    lideres.forEach((l) => {
      if (l.nivelActual === 'JADE') counts.JADE++
      else if (l.nivelActual === 'TURQUESA') counts.TURQUESA++
      else if (l.nivelActual === 'ONIX_NEGRO') counts.ONIX_NEGRO++
      else counts.SIN_ASIGNAR++
    })
    return counts
  }, [lideres])

  // Filtrado y ordenamiento de líderes
  const filteredLideres = useMemo(() => {
    return lideres
      .filter((l) => {
        const matchesSearch =
          l.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.alianzaNombre.toLowerCase().includes(searchTerm.toLowerCase())

        let matchesFilter = true
        if (levelFilter !== 'ALL') {
          if (levelFilter === 'SIN_ASIGNAR') {
            matchesFilter = l.nivelActual === null
          } else {
            matchesFilter = l.nivelActual === levelFilter
          }
        }

        return matchesSearch && matchesFilter
      })
      .sort((a, b) =>
        `${a.alianzaNombre} ${a.nombre}`.localeCompare(`${b.alianzaNombre} ${b.nombre}`),
      )
  }, [lideres, searchTerm, levelFilter])

  return (
    <div className="space-y-6">
      {/* KPIs Interactivos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 xl:gap-4">
        {/* KPI Total */}
        <button
          onClick={() => setLevelFilter('ALL')}
          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-sm ${
            levelFilter === 'ALL'
              ? 'border-primary ring-primary/20 bg-primary/[0.02] ring-2'
              : 'bg-card'
          }`}
        >
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase">
            <Users className="h-3.5 w-3.5" />
            <span>Todos</span>
          </div>
          <p className="text-foreground mt-2 text-2xl font-black">{stats.total}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">Líderes activos</p>
        </button>

        {/* KPI Jade */}
        <button
          onClick={() => setLevelFilter('JADE')}
          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-sm ${
            levelFilter === 'JADE'
              ? 'border-emerald-500 bg-emerald-500/[0.02] ring-2 ring-emerald-500/20'
              : 'bg-card'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 uppercase dark:text-emerald-400">
            <Award className="h-3.5 w-3.5" />
            <span>Jade</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {stats.JADE}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">Bono +3.0% / +1.5%</p>
        </button>

        {/* KPI Turquesa */}
        <button
          onClick={() => setLevelFilter('TURQUESA')}
          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-sm ${
            levelFilter === 'TURQUESA'
              ? 'border-cyan-500 bg-cyan-500/[0.02] ring-2 ring-cyan-500/20'
              : 'bg-card'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 uppercase dark:text-cyan-400">
            <Flame className="h-3.5 w-3.5" />
            <span>Turquesa</span>
          </div>
          <p className="mt-2 text-2xl font-black text-cyan-700 dark:text-cyan-300">
            {stats.TURQUESA}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">Bono +2.0% / +1.0%</p>
        </button>

        {/* KPI Ónix */}
        <button
          onClick={() => setLevelFilter('ONIX_NEGRO')}
          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-sm ${
            levelFilter === 'ONIX_NEGRO'
              ? 'border-slate-500 bg-slate-500/[0.02] ring-2 ring-slate-500/20'
              : 'bg-card'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase dark:text-slate-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Ónix Negro</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-700 dark:text-slate-300">
            {stats.ONIX_NEGRO}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">Bono +1.0% / +0.5%</p>
        </button>

        {/* KPI Sin Asignar */}
        <button
          onClick={() => setLevelFilter('SIN_ASIGNAR')}
          className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-sm ${
            levelFilter === 'SIN_ASIGNAR'
              ? 'border-amber-500 bg-amber-500/[0.02] ring-2 ring-amber-500/20'
              : 'bg-card'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 uppercase dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Sin Asignar</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">
            {stats.SIN_ASIGNAR}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">Por autorizar</p>
        </button>
      </div>

      {/* Buscador y Controles de Filtro */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por líder o alianza..."
            className="input w-full pr-4 pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="input w-auto text-xs"
          >
            <option value="ALL">Todos los Niveles</option>
            <option value="JADE">Jade</option>
            <option value="TURQUESA">Turquesa</option>
            <option value="ONIX_NEGRO">Ónix Negro</option>
            <option value="SIN_ASIGNAR">Sin asignar</option>
          </select>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground border-b text-xs font-semibold uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Líder</th>
                <th className="px-4 py-3 text-left">Alianza</th>
                <th className="px-4 py-3 text-right">Promedio mes (Últ. 3)</th>
                <th className="px-4 py-3 text-center">Recomendación</th>
                <th className="px-4 py-3 text-center">Nivel Asignado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLideres.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="text-muted-foreground/30 h-10 w-10" />
                      <p className="font-medium">
                        No se encontraron líderes con los filtros aplicados
                      </p>
                      <button
                        onClick={() => {
                          setSearchTerm('')
                          setLevelFilter('ALL')
                        }}
                        className="text-primary text-xs font-semibold hover:underline"
                      >
                        Restablecer filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLideres.map((l) => (
                  <FilaNivel key={l.id} empresaId={empresaId} lider={l} fmt={fmt} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilaNivel({
  empresaId,
  lider,
  fmt,
}: {
  empresaId: string
  lider: LiderNivelRow
  fmt: (n: number) => string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [nivel, setNivel] = useState<'' | 'JADE' | 'TURQUESA' | 'ONIX_NEGRO'>(
    lider.nivelActual ?? '',
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const sugerencia = sugerirNivel(lider.promedioMensual, lider.alianzaNombre)
  const thresholds = getThresholds(lider.alianzaNombre)
  const dirty = (nivel || null) !== (lider.nivelActual ?? null)

  function aplicarSugerencia() {
    if (sugerencia) {
      setNivel(sugerencia)
    }
  }

  function guardar() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await actualizarLiderAction(empresaId, lider.id, {
        nivel: nivel || null,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    })
  }

  // Lógica de cálculo de barra de progreso para la meta
  const { progressPercentage, labelMeta, accentColor } = useMemo(() => {
    const promedio = lider.promedioMensual
    const { onix, turquesa, jade } = thresholds

    let pct = 0
    let label = ''
    let color = 'bg-slate-400'

    if (promedio < onix) {
      pct = (promedio / onix) * 100
      label = `Faltan ${fmt(onix - promedio)} para Ónix`
      color = 'bg-slate-400 dark:bg-slate-500'
    } else if (promedio >= onix && promedio < turquesa) {
      pct = ((promedio - onix) / (turquesa - onix)) * 100
      label = `Faltan ${fmt(turquesa - promedio)} para Turquesa`
      color = 'bg-cyan-500'
    } else if (promedio >= turquesa && promedio < jade) {
      pct = ((promedio - turquesa) / (jade - turquesa)) * 100
      label = `Faltan ${fmt(jade - promedio)} para Jade`
      color = 'bg-emerald-500'
    } else {
      pct = 100
      label = '¡Meta máxima Jade alcanzada!'
      color = 'bg-emerald-600 dark:bg-emerald-400 shadow-sm shadow-emerald-500/20'
    }

    return {
      progressPercentage: Math.min(Math.max(pct, 0), 100),
      labelMeta: label,
      accentColor: color,
    }
  }, [lider.promedioMensual, thresholds])

  // Obtener iniciales para el avatar
  const iniciales = useMemo(() => {
    return lider.nombre
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  }, [lider.nombre])

  return (
    <tr className="hover:bg-muted/30 group transition-colors">
      {/* Columna Líder */}
      <td className="px-4 py-3 font-medium">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary ring-background flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-2">
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm leading-tight font-semibold">
              {lider.nombre}
            </p>
            <span className="text-muted-foreground mt-0.5 block text-[10px] font-medium tracking-wider uppercase">
              ID: {lider.id.slice(-6)}
            </span>
          </div>
        </div>
      </td>

      {/* Columna Alianza */}
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="text-foreground text-xs leading-tight font-semibold">
            {lider.alianzaNombre}
          </p>
          <span className="bg-muted text-muted-foreground mt-1 inline-block rounded border px-1.5 py-0.25 text-[9px] font-medium tracking-wider uppercase">
            Esquema: {thresholds.tipo}
          </span>
        </div>
      </td>

      {/* Columna Promedio mes */}
      <td className="px-4 py-3 text-right">
        <div className="inline-flex flex-col items-end">
          <span className="text-foreground text-sm font-bold tabular-nums">
            {fmt(lider.promedioMensual)}
          </span>

          {/* Mini Barra de Progreso */}
          <div className="mt-1.5 w-40 space-y-1 text-right">
            <div className="bg-muted border-background h-1.5 w-full overflow-hidden rounded-full border">
              <div
                className={`h-full rounded-full transition-all duration-500 ${accentColor}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-muted-foreground block truncate text-[9px] leading-none font-medium">
              {labelMeta}
            </p>
          </div>
        </div>
      </td>

      {/* Columna Recomendación */}
      <td className="px-4 py-3 text-center">
        {sugerencia ? (
          <button
            onClick={aplicarSugerencia}
            disabled={pending || nivel === sugerencia}
            title="Haga clic para autorizar y aplicar"
            className={`group/btn inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold shadow-sm transition-all hover:scale-[1.03] active:scale-[0.98] disabled:scale-100 disabled:opacity-40 ${NIVEL_COLOR[sugerencia]}`}
          >
            <Sparkles className="h-3 w-3 animate-pulse text-current" />
            <span>Sugerir {sugerencia.replace('_', ' ')}</span>
          </button>
        ) : (
          <span className="bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-semibold">
            Sin meta
          </span>
        )}
      </td>

      {/* Columna Nivel Asignado */}
      <td className="px-4 py-3 text-center">
        <select
          value={nivel}
          onChange={(e) => setNivel(e.target.value as typeof nivel)}
          disabled={pending}
          className={`input h-8.5 w-full max-w-[140px] rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${NIVEL_DOCK_COLOR[nivel]}`}
        >
          <option value="">Sin Asignar</option>
          <option value="JADE">Jade (+Bono)</option>
          <option value="TURQUESA">Turquesa (+Bono)</option>
          <option value="ONIX_NEGRO">Ónix Negro (+Bono)</option>
        </select>
      </td>

      {/* Columna Acción (Guardar) */}
      <td className="px-4 py-3 text-right">
        <div className="flex h-8 items-center justify-end">
          {error ? (
            <div
              title={error}
              className="text-destructive animate-shake inline-flex items-center gap-1 text-xs font-semibold"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Error</span>
            </div>
          ) : saved ? (
            <div className="inline-flex animate-pulse items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Guardado</span>
            </div>
          ) : dirty ? (
            <button
              onClick={guardar}
              disabled={pending}
              className="bg-primary text-primary-foreground hover:bg-primary/95 focus:ring-primary/45 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:outline-none active:scale-[0.98]"
            >
              {pending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Guardar</span>
            </button>
          ) : (
            <span className="text-muted-foreground/40 px-2 text-[11px] font-medium">Al día</span>
          )}
        </div>
      </td>
    </tr>
  )
}
