'use client'
import NumberInput from '@/components/ui/number-input'
import { useConfirm } from '@/components/ui/confirm-dialog'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Pencil,
  Check,
  X,
  Banknote,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Users,
} from 'lucide-react'
import {
  agregarVentaAlCorteAction,
  ajustarDispersionEnCorteAction,
  eliminarVentaDelCorteAction,
  enviarCorteAAprobacionAction,
} from '@/app/actions/cortes'

type Corte = {
  id: string
  fechaCorte: string
  tipoDia: string
  estado: string
  totalADispersar: string | null
  notasJoana: string | null
  notasAprobador: string | null
}

type PagoCorte = {
  id: string
  ventaId: string
  montoPagadoCliente: string
  porcentajePagado: string
  montoADispersar: string
  notasJoana: string | null
  ventaNombreCliente: string | null
  ventaMonto: string | null
  ventaLote: string | null
  ventaAsesor: string | null
  desarrolloNombre: string | null
}

type Dispersion = {
  id: string
  liderId: string | null
  beneficiarioNombre: string
  tipoBeneficiario: string
  montoTotal: string
  estado: string
  acumulaMensual: boolean
  metodoPago: string | null
  pagoCorteId: string | null
}

const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

const TIPO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Op. BM Corp',
  OP_YESYUCAN: 'Op. Yesyucan',
  ASESOR: 'Asesor',
  LIDER_SALDO: 'Líder (Afiliación)',
  SOCIO_BOLSA_JORGE: 'Socio bolsa Jorge',
  SOCIO_BOLSA_KASS: 'Socio bolsa Kass',
  SOCIO_BOLSA_DIANA: 'Socio bolsa Diana',
  SOCIO_FIJO_JORGE: 'Socio fijo Jorge',
  SOCIO_FIJO_KASS: 'Socio fijo Kass',
}

export default function CorteDetailView({
  empresaId,
  corte,
  pagos,
  dispersiones,
  ventasDisponibles = [],
  userRole,
}: {
  empresaId: string
  corte: Corte
  pagos: PagoCorte[]
  dispersiones: Dispersion[]
  ventasDisponibles?: {
    id: string
    cliente: string
    loteAcciones: string | null
    monto: string
    desarrolloNombre: string | null
  }[]
  userRole: string
}) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [isPending, startTransition] = useTransition()
  const [showAddVenta, setShowAddVenta] = useState(false)

  // Bloquear el scroll del fondo cuando el modal está abierto
  useEffect(() => {
    if (showAddVenta) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showAddVenta])

  // ── Multi-selección ──────────────────────────────────────────────────────────
  // Map ventaId → { montoPagadoCliente, notasJoana, porcentajeInput }
  const [selectedVentas, setSelectedVentas] = useState<
    Map<string, { montoPagadoCliente: string; notasJoana: string; porcentajeInput: string }>
  >(new Map())
  const [addError, setAddError] = useState<string | null>(null)
  const [addProgress, setAddProgress] = useState<{ done: number; total: number } | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDesarrollo, setSelectedDesarrollo] = useState<string | null>(null)
  const [ajustando, setAjustando] = useState<string | null>(null)
  const [nuevoMonto, setNuevoMonto] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Helpers para manejar campos de cada venta seleccionada
  const toggleVenta = (v: { id: string; monto: string }) => {
    setSelectedVentas((prev) => {
      const next = new Map(prev)
      if (next.has(v.id)) {
        next.delete(v.id)
      } else {
        next.set(v.id, { montoPagadoCliente: '', notasJoana: '', porcentajeInput: '' })
      }
      return next
    })
  }

  const updateVentaField = (
    ventaId: string,
    field: 'montoPagadoCliente' | 'notasJoana' | 'porcentajeInput',
    value: string,
    ventaMonto?: number,
  ) => {
    setSelectedVentas((prev) => {
      const next = new Map(prev)
      const entry = next.get(ventaId)
      if (!entry) return prev
      const updated = { ...entry, [field]: value }
      // Sync monto ↔ porcentaje
      if (field === 'montoPagadoCliente' && ventaMonto && ventaMonto > 0) {
        updated.porcentajeInput =
          value && !isNaN(Number(value)) ? ((Number(value) / ventaMonto) * 100).toFixed(2) : ''
      }
      if (field === 'porcentajeInput' && ventaMonto && ventaMonto > 0) {
        updated.montoPagadoCliente =
          value && !isNaN(Number(value)) ? ((Number(value) / 100) * ventaMonto).toFixed(2) : ''
      }
      next.set(ventaId, updated)
      return next
    })
  }

  const resetModal = () => {
    setShowAddVenta(false)
    setSearchQuery('')
    setSelectedDesarrollo(null)
    setSelectedVentas(new Map())
    setAddError(null)
    setAddProgress(null)
  }

  const esBorrador = corte.estado === 'BORRADOR'
  const esEnRevision = corte.estado === 'EN_REVISION'
  const esAprobado = corte.estado === 'APROBADO'

  const handleAgregarVentas = () => {
    setAddError(null)
    const entries = Array.from(selectedVentas.entries())
    if (entries.length === 0) {
      setAddError('Selecciona al menos una venta')
      return
    }
    const invalid = entries.find(
      ([, v]) => !v.montoPagadoCliente || isNaN(Number(v.montoPagadoCliente)),
    )
    if (invalid) {
      setAddError(`Captura el monto pagado para todas las ventas seleccionadas`)
      return
    }
    startTransition(async () => {
      setAddProgress({ done: 0, total: entries.length })
      const errors: string[] = []
      for (let i = 0; i < entries.length; i++) {
        const [ventaId, fields] = entries[i]!
        const res = await agregarVentaAlCorteAction({
          empresaId,
          corteId: corte.id,
          ventaId,
          montoPagadoCliente: Number(fields.montoPagadoCliente),
          notasJoana: fields.notasJoana || null,
        })
        setAddProgress({ done: i + 1, total: entries.length })
        if (!res.ok) errors.push(res.error)
      }
      if (errors.length > 0) {
        setAddError(errors.join(' · '))
        setAddProgress(null)
        router.refresh()
        return
      }
      resetModal()
      router.refresh()
    })
  }

  const handleAjustar = (dispersionId: string) => {
    startTransition(async () => {
      const res = await ajustarDispersionEnCorteAction({
        empresaId,
        dispersionId,
        nuevoMonto: Number(nuevoMonto),
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setAjustando(null)
      router.refresh()
    })
  }

  const handleEliminar = async (pagoCorteId: string) => {
    const ok = await confirm({
      title: '¿Eliminar esta venta del corte?',
      description: 'Se eliminarán sus dispersiones.',
      confirmText: 'Eliminar',
    })
    if (!ok) return
    startTransition(async () => {
      const res = await eliminarVentaDelCorteAction(empresaId, pagoCorteId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  const handleEnviarAprobacion = async () => {
    const ok = await confirm({
      title: '¿Enviar este corte a aprobación?',
      description: 'No podrás modificarlo después.',
      confirmText: 'Enviar',
    })
    if (!ok) return
    startTransition(async () => {
      const res = await enviarCorteAAprobacionAction(empresaId, corte.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  const estadoBadge =
    {
      BORRADOR: (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          <Clock className="h-3.5 w-3.5" /> Borrador
        </span>
      ),
      EN_REVISION: (
        <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 shadow-sm">
          <AlertCircle className="h-3.5 w-3.5" /> En revisión
        </span>
      ),
      APROBADO: (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado
        </span>
      ),
      RECHAZADO: (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-sm">
          <X className="h-3.5 w-3.5" /> Rechazado
        </span>
      ),
    }[corte.estado] ?? null

  const totalDispersar = Number(corte.totalADispersar ?? 0)
  const uniqueBeneficiaries = new Set(dispersiones.map((d) => d.beneficiarioNombre)).size

  // Calcular el resumen consolidado agrupando por beneficiarioNombre
  const resumenGrupo: Record<string, { nombre: string; tipo: string; total: number }> = {}
  dispersiones.forEach((d) => {
    const grupo = (resumenGrupo[d.beneficiarioNombre] ??= {
      nombre: d.beneficiarioNombre,
      tipo: d.tipoBeneficiario,
      total: 0,
    })
    grupo.total += Number(d.montoTotal)
  })
  const resumenList = Object.values(resumenGrupo).sort((a, b) => b.total - a.total)

  return (
    <section className="3xl:p-12 w-full space-y-6 p-3 sm:p-6 xl:p-10">
      {/* Back + Header */}
      <div>
        <Link
          href={`/empresa/${empresaId}/comisiones/cortes`}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Cortes
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-foreground text-xl font-bold">
                Corte del{' '}
                {new Date(corte.fechaCorte + 'T12:00:00').toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h1>
              {estadoBadge}
            </div>
            {corte.notasJoana && (
              <p className="text-muted-foreground mt-1 text-sm">{corte.notasJoana}</p>
            )}
          </div>
          <div className="flex gap-2">
            {esBorrador && (
              <>
                <button
                  id="btn-agregar-venta"
                  onClick={() => setShowAddVenta(!showAddVenta)}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all duration-150 active:scale-95"
                >
                  <Plus className="h-4 w-4 stroke-[2.5px]" />
                  Agregar venta
                </button>
                <button
                  id="btn-enviar-aprobacion"
                  onClick={handleEnviarAprobacion}
                  disabled={isPending || pagos.length === 0}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all duration-150 active:scale-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4 animate-bounce" />
                  Enviar a aprobación
                </button>
              </>
            )}
            {esEnRevision && (
              <Link
                href={`/empresa/${empresaId}/comisiones/cortes/${corte.id}/aprobar`}
                className="bg-primary text-primary-foreground hover:bg-primary/95 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold shadow-sm transition-all duration-150 active:scale-[0.98]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Ir a aprobar
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Aviso de rechazo — corte regresado a borrador con motivo del aprobador */}
      {esBorrador && corte.notasAprobador && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                Corte regresado para ajustes
              </p>
              <p className="mt-0.5 text-sm text-rose-600/90 dark:text-rose-400/90">
                {corte.notasAprobador}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Ajusta lo necesario y vuelve a enviar a aprobación.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Stats Bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200/60 bg-slate-50/50 px-5 py-3 text-sm shadow-sm backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/30">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Banknote className="h-4 w-4" />
          </span>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Total a dispersar
            </p>
            <p className="text-sm font-extrabold text-emerald-600 tabular-nums dark:text-emerald-400">
              {fmt(totalDispersar)}
            </p>
          </div>
        </div>

        <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800" />

        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Ventas
            </p>
            <p className="text-foreground text-sm font-extrabold tabular-nums">{pagos.length}</p>
          </div>
        </div>

        <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800" />

        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              Beneficiarios
            </p>
            <p className="text-sm font-extrabold text-purple-600 tabular-nums dark:text-purple-400">
              {uniqueBeneficiaries}
            </p>
          </div>
        </div>
      </div>

      {/* Modal agregar ventas — split panel */}
      {showAddVenta &&
        esBorrador &&
        (() => {
          const desarrollos = Array.from(
            new Set(
              (ventasDisponibles ?? [])
                .map((v) => v.desarrolloNombre)
                .filter((n): n is string => !!n),
            ),
          ).sort()

          const filteredVentas = (ventasDisponibles ?? []).filter((v) => {
            if (selectedDesarrollo && v.desarrolloNombre !== selectedDesarrollo) return false
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim()
              return [v.cliente, v.loteAcciones ?? '', v.desarrolloNombre ?? ''].some((s) =>
                s.toLowerCase().includes(q),
              )
            }
            return true
          })

          const selectedCount = selectedVentas.size
          const selectedList = (ventasDisponibles ?? []).filter((v) => selectedVentas.has(v.id))

          return (
            <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-2 backdrop-blur-md md:p-4">
              <div className="bg-card animate-scale-up flex max-h-[95vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200/80 shadow-2xl dark:border-slate-800/80">
                {/* Header */}
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                    <Plus className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-foreground text-sm font-bold">Agregar ventas al corte</h2>
                    <p className="text-muted-foreground text-[11px]">
                      Toca una venta → llena su abono → confirma
                    </p>
                  </div>
                  {selectedCount > 0 && (
                    <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-3 py-1 text-xs font-bold">
                      {selectedCount} lista{selectedCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={resetModal}
                    className="text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body split */}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                  {/* Panel IZQUIERDO — catálogo */}
                  <div className="flex w-full flex-col border-r border-slate-100 md:w-[52%] dark:border-slate-800">
                    {/* Filtros */}
                    <div className="shrink-0 space-y-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/30">
                      <div className="relative">
                        <Search className="text-muted-foreground/50 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar cliente, lote o desarrollo..."
                          className="bg-background focus:border-primary focus:ring-primary w-full rounded-lg border border-slate-200 py-2 pr-8 pl-8 text-xs transition-all focus:ring-1 focus:outline-none dark:border-slate-700"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-muted-foreground/60 hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {desarrollos.length > 0 && (
                        <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDesarrollo(null)}
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all ${selectedDesarrollo === null ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
                          >
                            Todos
                          </button>
                          {desarrollos.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() =>
                                setSelectedDesarrollo(selectedDesarrollo === d ? null : d)
                              }
                              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all ${selectedDesarrollo === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground border bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lista de ventas */}
                    <div className="scrollbar-thin flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                      {filteredVentas.length === 0 ? (
                        <div className="text-muted-foreground/70 flex flex-col items-center justify-center gap-2 py-12 text-center">
                          <Search className="h-7 w-7 opacity-40" />
                          <span className="text-xs">Sin ventas disponibles</span>
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="text-primary text-[11px] underline"
                            >
                              Limpiar búsqueda
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredVentas.map((v) => {
                          const isSel = selectedVentas.has(v.id)
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => toggleVenta(v)}
                              className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-150 active:scale-[0.99] ${isSel ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                            >
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${isSel ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white group-hover:border-emerald-400 dark:border-slate-600 dark:bg-slate-800'}`}
                              >
                                {isSel ? (
                                  <Check className="h-3 w-3 text-white" />
                                ) : (
                                  <Plus className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                                )}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`truncate text-xs font-bold ${isSel ? 'text-emerald-800 dark:text-emerald-300' : 'text-foreground'}`}
                                >
                                  {v.cliente}
                                </p>
                                <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[9px]">
                                  {v.desarrolloNombre && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <Building2 className="h-2.5 w-2.5" />
                                      {v.desarrolloNombre}
                                    </span>
                                  )}
                                  {v.loteAcciones && (
                                    <span className="text-primary/80 rounded bg-slate-100 px-1 font-mono dark:bg-slate-800">
                                      L:{v.loteAcciones}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 text-xs font-bold tabular-nums ${isSel ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}
                              >
                                {fmt(Number(v.monto))}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>

                    <div className="shrink-0 border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                      <p className="text-muted-foreground text-[10px]">
                        {filteredVentas.length} disponible{filteredVentas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Panel DERECHO — cola con formularios */}
                  <div className="hidden w-[48%] flex-col md:flex">
                    <div className="shrink-0 border-b border-slate-100 bg-slate-50/40 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/20">
                      <p className="text-foreground text-xs font-bold">
                        Cola de ventas
                        {selectedCount > 0 && (
                          <span className="text-muted-foreground ml-1.5 font-normal">
                            — captura el abono de cada una
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="scrollbar-thin flex-1 overflow-y-auto">
                      {selectedCount === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 px-8 py-12 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <Banknote className="text-muted-foreground/40 h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-semibold">Sin ventas aún</p>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                              Toca cualquier venta de la izquierda para agregarla aquí.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedList.map((v) => {
                            const entry = selectedVentas.get(v.id)!
                            const ventaMonto = Number(v.monto)
                            const pct =
                              entry.montoPagadoCliente && ventaMonto > 0
                                ? Math.min(
                                    (Number(entry.montoPagadoCliente) / ventaMonto) * 100,
                                    100,
                                  )
                                : 0
                            const montoOk =
                              !!entry.montoPagadoCliente &&
                              !isNaN(Number(entry.montoPagadoCliente)) &&
                              Number(entry.montoPagadoCliente) > 0

                            return (
                              <div key={v.id} className="px-4 py-3">
                                <div className="mb-2.5 flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      {montoOk ? (
                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                                          <Check className="h-2.5 w-2.5 text-white" />
                                        </span>
                                      ) : (
                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20">
                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                        </span>
                                      )}
                                      <p className="text-foreground truncate text-xs font-bold">
                                        {v.cliente}
                                      </p>
                                    </div>
                                    <p className="text-muted-foreground mt-0.5 pl-5 text-[9px]">
                                      {v.desarrolloNombre ?? ''}
                                      {v.loteAcciones ? ` · Lote ${v.loteAcciones}` : ''}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                                      {fmt(ventaMonto)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleVenta(v)}
                                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md p-1 transition-all"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-muted-foreground mb-1 block text-[9px] font-bold tracking-wider uppercase">
                                      Monto $
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={entry.montoPagadoCliente}
                                      onChange={(e) =>
                                        updateVentaField(
                                          v.id,
                                          'montoPagadoCliente',
                                          e.target.value.replace(/[^0-9.]/g, ''),
                                          ventaMonto,
                                        )
                                      }
                                      placeholder="0.00"
                                      className={`bg-background w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all focus:ring-1 focus:outline-none ${montoOk ? 'border-emerald-400/60 focus:border-emerald-500 focus:ring-emerald-500/30' : 'focus:border-primary focus:ring-primary border-slate-200 dark:border-slate-700'}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-muted-foreground mb-1 block text-[9px] font-bold tracking-wider uppercase">
                                      %
                                    </label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={entry.porcentajeInput}
                                      onChange={(e) =>
                                        updateVentaField(
                                          v.id,
                                          'porcentajeInput',
                                          e.target.value.replace(/[^0-9.]/g, ''),
                                          ventaMonto,
                                        )
                                      }
                                      placeholder="0.00"
                                      className={`bg-background w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all focus:ring-1 focus:outline-none ${montoOk ? 'border-emerald-400/60 focus:border-emerald-500 focus:ring-emerald-500/30' : 'focus:border-primary focus:ring-primary border-slate-200 dark:border-slate-700'}`}
                                    />
                                  </div>
                                </div>

                                {ventaMonto > 0 && (
                                  <div className="mt-2">
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/50">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-primary' : ''}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <p className="text-muted-foreground mt-0.5 text-right text-[9px] tabular-nums">
                                      {pct > 0
                                        ? `${pct.toFixed(1)}% de ${fmt(ventaMonto)}`
                                        : 'Ingresa el monto'}
                                    </p>
                                  </div>
                                )}

                                <input
                                  type="text"
                                  value={entry.notasJoana}
                                  onChange={(e) =>
                                    updateVentaField(v.id, 'notasJoana', e.target.value)
                                  }
                                  placeholder="Nota interna (opcional)"
                                  className="bg-background focus:border-primary focus:ring-primary mt-2 w-full rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-[11px] text-slate-500 transition-all focus:ring-1 focus:outline-none dark:border-slate-700/60"
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {addProgress && (
                      <div className="shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                        <div className="text-primary mb-1.5 flex justify-between text-[10px] font-semibold">
                          <span>Guardando...</span>
                          <span>
                            {addProgress.done}/{addProgress.total}
                          </span>
                        </div>
                        <div className="bg-primary/15 h-1.5 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${(addProgress.done / addProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {addError && (
                      <div className="bg-destructive/10 text-destructive border-destructive/20 mx-4 mb-3 shrink-0 rounded-lg border p-2.5 text-xs">
                        {addError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs">
                      {selectedCount === 0 ? (
                        <span className="text-muted-foreground">Selecciona ventas de la lista</span>
                      ) : (
                        (() => {
                          const listos = selectedList.filter((v) => {
                            const e = selectedVentas.get(v.id)!
                            return (
                              e.montoPagadoCliente &&
                              !isNaN(Number(e.montoPagadoCliente)) &&
                              Number(e.montoPagadoCliente) > 0
                            )
                          }).length
                          return listos < selectedCount ? (
                            <span className="font-medium text-amber-600">
                              {selectedCount - listos} sin monto
                            </span>
                          ) : (
                            <span className="font-medium text-emerald-600">✓ Todas listas</span>
                          )
                        })()
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetModal}
                        className="text-muted-foreground rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium transition-all hover:bg-slate-200/80 active:scale-[0.98] dark:bg-slate-800 dark:hover:bg-slate-700/80"
                      >
                        Cancelar
                      </button>
                      <button
                        id="btn-agregar-venta-submit"
                        onClick={handleAgregarVentas}
                        disabled={isPending || selectedCount === 0}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isPending
                          ? `Guardando${addProgress ? ` ${addProgress.done}/${addProgress.total}` : '...'}`
                          : selectedCount > 1
                            ? `Agregar ${selectedCount} ventas`
                            : selectedCount === 1
                              ? 'Agregar 1 venta'
                              : 'Agregar ventas'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      {/* Ventas del corte */}
      {pagos.length > 0 && (
        <div>
          <h2 className="text-foreground mb-3 font-semibold">Ventas incluidas en el corte</h2>
          <div className="space-y-3">
            {pagos.map((pago) => {
              const dispsVenta = dispersiones.filter((d) => d.pagoCorteId === pago.id)
              return (
                <div
                  key={pago.id}
                  className="bg-card border-l-primary/60 hover:border-primary/20 rounded-xl border border-l-4 p-5 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  {/* Cabecera venta */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="text-primary h-4 w-4 shrink-0" />
                        <span className="text-foreground font-semibold">
                          {pago.ventaNombreCliente ?? 'Cliente sin nombre'}
                        </span>
                      </div>
                      {(pago.desarrolloNombre || pago.ventaLote) && (
                        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>
                            {pago.desarrolloNombre ?? '—'} · Lote {pago.ventaLote ?? '—'}
                          </span>
                        </div>
                      )}
                    </div>
                    {esBorrador && (
                      <button
                        onClick={() => handleEliminar(pago.id)}
                        disabled={isPending}
                        className="text-muted-foreground hover:text-destructive shrink-0 p-1 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Métricas del pago */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric label="Monto total venta" value={fmt(Number(pago.ventaMonto ?? 0))} />
                    <Metric
                      label="Pagó el cliente"
                      value={fmt(Number(pago.montoPagadoCliente))}
                      accent="primary"
                    />
                    <Metric
                      label="% abonado"
                      value={`${Number(pago.porcentajePagado).toFixed(2)}%`}
                      accent="warning"
                    />
                    <Metric
                      label="A dispersar"
                      value={fmt(Number(pago.montoADispersar))}
                      accent="success"
                    />
                  </div>

                  {pago.notasJoana && (
                    <p className="text-muted-foreground mt-3 text-xs">{pago.notasJoana}</p>
                  )}

                  {/* Desglose de dispersiones de este pago */}
                  {dispsVenta.length > 0 && (
                    <div className="mt-5 border-t pt-4">
                      {(() => {
                        const sumDisp = dispsVenta.reduce((s, d) => s + Number(d.montoTotal), 0)
                        const aDispersar = Number(pago.montoADispersar)
                        const diferencia = sumDisp - aDispersar
                        const ok = Math.abs(diferencia) < 0.01
                        // Cascada de prioridad para "distribuir restante"
                        const CASCADA_ORDER = [
                          'OP_BMCORP',
                          'OP_YESYUCAN',
                          'ASESOR',
                          'LIDER_SALDO',
                          'SOCIO_BOLSA_JORGE',
                          'SOCIO_BOLSA_KASS',
                          'SOCIO_BOLSA_DIANA',
                          'SOCIO_FIJO_JORGE',
                          'SOCIO_FIJO_KASS',
                        ]
                        const primeroConEspacio =
                          esBorrador && !ok && diferencia < 0
                            ? dispsVenta
                                .slice()
                                .sort(
                                  (a, b) =>
                                    CASCADA_ORDER.indexOf(a.tipoBeneficiario) -
                                    CASCADA_ORDER.indexOf(b.tipoBeneficiario),
                                )
                                .find((d) => d)
                            : null

                        return (
                          <div className="mb-3 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
                                <Users className="h-3.5 w-3.5" /> Dispersión de comisiones
                              </h4>
                              <div
                                className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-semibold ${ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'}`}
                              >
                                <span>Dispersado: {fmt(sumDisp)}</span>
                                <span className="text-muted-foreground font-normal">|</span>
                                <span>Abono: {fmt(aDispersar)}</span>
                                {!ok && (
                                  <>
                                    <span className="text-muted-foreground font-normal">|</span>
                                    <span>
                                      {diferencia > 0 ? 'Excede' : 'Falta'}:{' '}
                                      {fmt(Math.abs(diferencia))}
                                    </span>
                                  </>
                                )}
                                {ok && (
                                  <span className="font-semibold text-emerald-600">Cuadra</span>
                                )}
                              </div>
                            </div>
                            {esBorrador && !ok && diferencia < 0 && (
                              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950/20">
                                <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                  Faltan {fmt(Math.abs(diferencia))} — agregar a:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {dispsVenta.map((d) => (
                                    <button
                                      key={d.id}
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => {
                                        const nuevo =
                                          Math.round(
                                            (Number(d.montoTotal) + Math.abs(diferencia)) * 100,
                                          ) / 100
                                        startTransition(async () => {
                                          await ajustarDispersionEnCorteAction({
                                            empresaId,
                                            dispersionId: d.id,
                                            nuevoMonto: nuevo,
                                          })
                                          router.refresh()
                                        })
                                      }}
                                      className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-40 dark:bg-amber-950/40 dark:text-amber-300"
                                    >
                                      {TIPO_LABELS[d.tipoBeneficiario] ?? d.beneficiarioNombre}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      <div className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/30">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b bg-slate-100/50 text-left text-[10px] font-semibold dark:bg-slate-900/50">
                              <th className="px-3 py-2">Beneficiario</th>
                              <th className="px-3 py-2">Rol / Tipo</th>
                              <th className="px-3 py-2 text-right">Monto</th>
                              {esBorrador && <th className="w-10 px-3 py-2"></th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {dispsVenta.map((d) => (
                              <tr
                                key={d.id}
                                className="hover:bg-slate-100/30 dark:hover:bg-slate-950/20"
                              >
                                <td className="text-foreground px-3 py-2 font-medium">
                                  {d.beneficiarioNombre}
                                </td>
                                <td className="text-muted-foreground px-3 py-2">
                                  {TIPO_LABELS[d.tipoBeneficiario] ?? d.tipoBeneficiario}
                                  {d.acumulaMensual && (
                                    <span className="text-warning bg-warning/10 ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold">
                                      Acumula
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                  {ajustando === d.id ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={nuevoMonto}
                                        onChange={(e) => setNuevoMonto(e.target.value)}
                                        className="bg-background border-input w-20 rounded border px-1.5 py-0.5 text-right text-xs"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleAjustar(d.id)}
                                        disabled={isPending}
                                        className="text-success rounded p-0.5 transition-all hover:bg-emerald-500/10 active:scale-[0.9]"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setAjustando(null)}
                                        className="text-muted-foreground rounded p-0.5 transition-all hover:bg-slate-200 active:scale-[0.9] dark:hover:bg-slate-800"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span>{fmt(Number(d.montoTotal))}</span>
                                  )}
                                </td>
                                {esBorrador && (
                                  <td className="px-3 py-2 text-right">
                                    {ajustando !== d.id && (
                                      <button
                                        onClick={() => {
                                          setAjustando(d.id)
                                          setNuevoMonto(d.montoTotal)
                                        }}
                                        className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-all hover:bg-slate-100 active:scale-[0.9] dark:hover:bg-slate-800"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Resumen Consolidado del Corte */}
      {dispersiones.length > 0 && (
        <div className="bg-card rounded-xl border border-slate-200/80 p-5 shadow-sm dark:border-slate-800/80">
          <h2 className="text-foreground mb-1 flex items-center gap-1.5 text-sm font-bold">
            <Users className="h-4 w-4 text-purple-600" /> Resumen consolidado del corte
          </h2>
          <p className="text-muted-foreground mb-4 text-xs">
            Total a dispersar por beneficiario agrupado en este periodo.
          </p>
          <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800/80">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="text-muted-foreground border-b bg-slate-50 text-[10px] font-bold tracking-wider uppercase dark:bg-slate-900/50">
                  <th className="px-4 py-2.5">Beneficiario</th>
                  <th className="px-4 py-2.5">Rol / Tipo</th>
                  <th className="px-4 py-2.5 text-right">Monto total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {resumenList.map((item) => (
                  <tr key={item.nombre} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="text-foreground px-4 py-3 font-semibold">{item.nombre}</td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {TIPO_LABELS[item.tipo] ?? item.tipo}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                      {fmt(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-slate-50/80 dark:bg-slate-900/30">
                <tr className="text-foreground font-bold">
                  <td
                    colSpan={2}
                    className="text-muted-foreground px-4 py-3 text-xs tracking-wider uppercase"
                  >
                    Total dispersado
                  </td>
                  <td className="px-4 py-3 text-right text-base text-emerald-600 tabular-nums dark:text-emerald-400">
                    {fmt(dispersiones.reduce((s, d) => s + Number(d.montoTotal), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Sin ventas */}
      {pagos.length === 0 && (
        <div className="bg-muted/30 rounded-xl border border-dashed px-6 py-10 text-center">
          <Banknote className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <p className="text-foreground font-medium">Sin ventas en este corte</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Agrega las ventas cuyos clientes realizaron pagos en esta fecha.
          </p>
        </div>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'primary' | 'success' | 'warning'
}) {
  const styles = {
    success: 'bg-emerald-500/[0.03] border-emerald-500/10 text-emerald-600 dark:text-emerald-500',
    primary: 'bg-primary/[0.03] border-primary/10 text-primary',
    warning: 'bg-amber-500/[0.03] border-amber-500/10 text-amber-600 dark:text-amber-500',
    default: 'bg-muted/20 border-border text-foreground',
  }[accent ?? 'default']

  return (
    <div className={`rounded-xl border p-3 transition-all hover:shadow-sm ${styles}`}>
      <p className="text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold tabular-nums">{value}</p>
    </div>
  )
}
