'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Save, Search, X } from 'lucide-react'
import { guardarPautaAction } from '@/app/actions/comisiones/pautas'
import type { PautaMes } from '@/lib/services/comisiones/pautas.service'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const MESES_CORTO = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

const NIVEL_PILL: Record<string, string> = {
  JADE: 'bg-jade-100 text-jade-800',
  TURQUESA: 'bg-cyan-100 text-cyan-800',
  ONIX_NEGRO: 'bg-slate-200 text-slate-800',
}

type Accent = 'primary' | 'success' | 'warning' | 'destructive'

function semaforo(gap: number | null): { pill: string; label: string; accent: Accent | null } {
  if (gap === null) return { pill: 'bg-muted text-muted-foreground', label: '—', accent: null }
  const abs = Math.abs(gap)
  if (abs <= 10)
    return { pill: 'bg-success/15 text-success', label: `${gap.toFixed(2)}%`, accent: 'success' }
  if (abs <= 20)
    return { pill: 'bg-warning/15 text-warning', label: `${gap.toFixed(2)}%`, accent: 'warning' }
  return {
    pill: 'bg-destructive/15 text-destructive',
    label: `${gap.toFixed(2)}%`,
    accent: 'destructive',
  }
}

type FiltroNivel = 'TODOS' | 'JADE' | 'TURQUESA' | 'ONIX_NEGRO' | 'SIN_NIVEL'

export function PautasView({
  empresaId,
  anio,
  mes,
  pautas,
}: {
  empresaId: string
  anio: number
  mes: number
  pautas: PautaMes[]
}) {
  const router = useRouter()
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const [query, setQuery] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<FiltroNivel>('TODOS')

  const totalComp = pautas.reduce((s, p) => s + p.montoComprometido, 0)
  const totalEjec = pautas.reduce((s, p) => s + p.montoEjecutado, 0)
  const totalGap = totalComp > 0 ? ((totalEjec - totalComp) / totalComp) * 100 : null
  const capturadas = pautas.filter((p) => p.pautaId !== null).length
  const sinNivel = pautas.filter((p) => p.nivel === null).length

  const hoy = new Date()
  const esActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1
  const monthValue = `${anio}-${String(mes).padStart(2, '0')}`

  function cambiarPeriodo(value: string) {
    const [a, m] = value.split('-')
    if (!a || !m) return
    router.push(`/empresa/${empresaId}/comisiones/pautas?anio=${a}&mes=${Number(m)}`)
  }

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pautas.filter((p) => {
      // Nivel
      if (filtroNivel === 'SIN_NIVEL' && p.nivel !== null) return false
      if (filtroNivel !== 'TODOS' && filtroNivel !== 'SIN_NIVEL' && p.nivel !== filtroNivel)
        return false
      // Búsqueda
      if (q && !`${p.liderNombre} ${p.alianzaNombre}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [pautas, query, filtroNivel])

  const semTotal = semaforo(totalGap)

  return (
    <div className="space-y-4">
      {/* Header — picker + atajo */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={monthValue}
          onChange={(e) => cambiarPeriodo(e.target.value)}
          className="input w-auto text-lg font-semibold tabular-nums"
        />
        {!esActual && (
          <button
            type="button"
            onClick={() => router.push(`/empresa/${empresaId}/comisiones/pautas`)}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            Volver al mes actual
          </button>
        )}
      </div>

      {/* KPIs en hero card único */}
      <div className="bg-card rounded-xl border p-5">
        <div className="grid gap-5 sm:grid-cols-4">
          <Stat label="Comprometido" value={fmt(totalComp)} hint={`${pautas.length} líderes`} />
          {totalEjec > 0 ? (
            <Stat
              label="Ejecutado"
              value={fmt(totalEjec)}
              hint={`${capturadas} capturadas`}
              accent="primary"
            />
          ) : (
            <Stat label="Ejecutado" value={fmt(totalEjec)} hint={`${capturadas} capturadas`} />
          )}
          {semTotal.accent ? (
            <Stat
              label="Gap"
              value={`${totalGap! > 0 ? '+' : ''}${totalGap!.toFixed(2)}%`}
              hint={
                Math.abs(totalGap!) <= 10
                  ? 'al objetivo'
                  : Math.abs(totalGap!) <= 20
                    ? 'desviación moderada'
                    : 'fuera de objetivo'
              }
              accent={semTotal.accent}
            />
          ) : (
            <Stat label="Gap" value="—" hint="sin datos" />
          )}
          <ProgresoStat label="Avance del mes" actual={capturadas} total={pautas.length} />
        </div>
      </div>

      {sinNivel > 0 && (
        <div className="border-warning/40 bg-warning/10 text-warning flex items-start gap-2 rounded-md border p-3 text-xs">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <p>
            {sinNivel} líder{sinNivel === 1 ? '' : 'es'} sin nivel asignado. Asigna desde{' '}
            <a
              href={`/empresa/${empresaId}/comisiones/niveles`}
              className="font-semibold underline underline-offset-2"
            >
              /comisiones/niveles
            </a>{' '}
            para capturar pauta.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-card flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por líder o alianza..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input w-full pr-8 pl-8 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {(['TODOS', 'JADE', 'TURQUESA', 'ONIX_NEGRO', 'SIN_NIVEL'] as FiltroNivel[]).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setFiltroNivel(n)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                filtroNivel === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {n === 'ONIX_NEGRO'
                ? 'Ónix'
                : n === 'SIN_NIVEL'
                  ? 'Sin nivel'
                  : n === 'TODOS'
                    ? 'Todos'
                    : n}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground ml-auto text-xs">
          {filtradas.length} de {pautas.length}
        </span>
      </div>

      {/* Tabla líderes */}
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="w-1.5" />
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Líder</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase">Nivel</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Previa</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase">
                  Comprometido
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase">
                  Ejecutado
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase">Gap</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-muted-foreground px-3 py-10 text-center text-xs">
                    Sin resultados.
                  </td>
                </tr>
              ) : (
                filtradas.map((p) => (
                  <Fila
                    key={`${p.liderId}-${anio}-${mes}`}
                    empresaId={empresaId}
                    p={p}
                    anio={anio}
                    mes={mes}
                    fmt={fmt}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Fila({
  empresaId,
  p,
  anio,
  mes,
  fmt,
}: {
  empresaId: string
  p: PautaMes
  anio: number
  mes: number
  fmt: (n: number) => string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [ejec, setEjec] = useState<string>(p.montoEjecutado.toString())
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ejecNum = Number(ejec) || 0
  const dirty = ejecNum !== p.montoEjecutado
  const sinNivel = p.nivel === null
  const gapLive =
    p.montoComprometido > 0 ? ((ejecNum - p.montoComprometido) / p.montoComprometido) * 100 : null
  const sem = semaforo(gapLive)

  function guardar() {
    if (sinNivel) {
      setError('Asigna nivel primero')
      return
    }
    setError(null)
    startTransition(async () => {
      const r = await guardarPautaAction(empresaId, {
        liderId: p.liderId,
        anio,
        mes,
        montoEjecutado: ejecNum,
      })
      if (!r.ok) setError(r.error)
      else {
        setSavedAt(Date.now())
        router.refresh()
        setTimeout(() => setSavedAt(null), 2000)
      }
    })
  }

  const barColor = p.pautaId
    ? sem.accent === 'success'
      ? 'bg-success'
      : sem.accent === 'warning'
        ? 'bg-warning'
        : sem.accent === 'destructive'
          ? 'bg-destructive'
          : 'bg-primary'
    : 'bg-transparent'

  return (
    <tr className="hover:bg-muted/20">
      <td className="p-0">
        <div className={`mx-auto h-8 w-1 rounded-r ${barColor}`} />
      </td>
      <td className="px-3 py-2.5">
        <p className="text-foreground font-medium">{p.liderNombre}</p>
        <p className="text-muted-foreground text-xs">{p.alianzaNombre}</p>
      </td>
      <td className="px-3 py-2.5 text-center">
        {p.nivel ? (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${NIVEL_PILL[p.nivel]}`}
          >
            {p.nivel === 'ONIX_NEGRO' ? 'Ónix' : p.nivel}
          </span>
        ) : (
          <span className="text-muted-foreground text-[10px]">Sin nivel</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {p.ultimaCaptura ? (
          <div className="text-xs">
            <p className="text-foreground">
              {MESES_CORTO[p.ultimaCaptura.mes - 1]} {p.ultimaCaptura.anio}
            </p>
            <p className="text-muted-foreground tabular-nums">{fmt(p.ultimaCaptura.ejecutado)}</p>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="text-foreground px-3 py-2.5 text-right tabular-nums">
        {fmt(p.montoComprometido)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <input
          type="number"
          min={0}
          step={500}
          disabled={sinNivel}
          value={ejec}
          onChange={(e) => setEjec(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && guardar()}
          className="input w-32 text-right tabular-nums disabled:opacity-40"
        />
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sem.pill}`}>
          {sem.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        {dirty && (
          <button
            type="button"
            onClick={guardar}
            disabled={pending || sinNivel}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs disabled:opacity-50"
          >
            {savedAt ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {pending ? '...' : savedAt ? 'OK' : ''}
          </button>
        )}
        {error && <p className="text-destructive mt-1 text-[10px]">{error}</p>}
      </td>
    </tr>
  )
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent?: Accent
}) {
  const color =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'success'
        ? 'text-success'
        : accent === 'warning'
          ? 'text-warning'
          : accent === 'destructive'
            ? 'text-destructive'
            : 'text-foreground'
  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>
    </div>
  )
}

function ProgresoStat({ label, actual, total }: { label: string; actual: number; total: number }) {
  const pct = total > 0 ? (actual / total) * 100 : 0
  const color =
    actual === 0
      ? 'bg-muted-foreground/40'
      : actual === total
        ? 'bg-success'
        : pct >= 50
          ? 'bg-primary'
          : 'bg-warning'
  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
        {actual}
        <span className="text-muted-foreground text-base font-medium">/{total}</span>
      </p>
      <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
