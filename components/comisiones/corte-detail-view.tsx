'use client'
import NumberInput from '@/components/ui/number-input'

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
  const [addForm, setAddForm] = useState({ ventaId: '', montoPagadoCliente: '', notasJoana: '' })
  const [addError, setAddError] = useState<string | null>(null)
  const [selectedVentaInfo, setSelectedVentaInfo] = useState<{
    id: string
    cliente: string
    loteAcciones: string | null
    monto: string
    desarrolloNombre: string | null
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDesarrollo, setSelectedDesarrollo] = useState<string | null>(null)
  const [porcentajeInput, setPorcentajeInput] = useState('')
  const [ajustando, setAjustando] = useState<string | null>(null)
  const [nuevoMonto, setNuevoMonto] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ventaTotal = selectedVentaInfo ? Number(selectedVentaInfo.monto) : 0

  const handleMontoChange = (val: string) => {
    setAddForm((f) => ({ ...f, montoPagadoCliente: val }))
    if (val && !isNaN(Number(val)) && ventaTotal > 0) {
      setPorcentajeInput(((Number(val) / ventaTotal) * 100).toFixed(2))
    } else {
      setPorcentajeInput('')
    }
  }

  const handlePctChange = (val: string) => {
    setPorcentajeInput(val)
    if (val && !isNaN(Number(val)) && ventaTotal > 0) {
      setAddForm((f) => ({
        ...f,
        montoPagadoCliente: ((Number(val) / 100) * ventaTotal).toFixed(2),
      }))
    } else {
      setAddForm((f) => ({ ...f, montoPagadoCliente: '' }))
    }
  }

  const resetModal = () => {
    setShowAddVenta(false)
    setSearchQuery('')
    setSelectedDesarrollo(null)
    setSelectedVentaInfo(null)
    setPorcentajeInput('')
    setAddForm({ ventaId: '', montoPagadoCliente: '', notasJoana: '' })
    setAddError(null)
  }

  const esBorrador = corte.estado === 'BORRADOR'
  const esEnRevision = corte.estado === 'EN_REVISION'
  const esAprobado = corte.estado === 'APROBADO'

  const handleAgregarVenta = () => {
    setAddError(null)
    if (!addForm.ventaId || !addForm.montoPagadoCliente) {
      setAddError('Completa el ID de venta y el monto pagado')
      return
    }
    startTransition(async () => {
      const res = await agregarVentaAlCorteAction({
        empresaId,
        corteId: corte.id,
        ventaId: addForm.ventaId,
        montoPagadoCliente: Number(addForm.montoPagadoCliente),
        notasJoana: addForm.notasJoana || null,
      })
      if (!res.ok) {
        setAddError(res.error)
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

  const handleEliminar = (pagoCorteId: string) => {
    if (!confirm('¿Eliminar esta venta del corte? Se eliminarán sus dispersiones.')) return
    startTransition(async () => {
      const res = await eliminarVentaDelCorteAction(empresaId, pagoCorteId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  const handleEnviarAprobacion = () => {
    if (!confirm('¿Enviar este corte a aprobación? No podrás modificarlo después.')) return
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

      {/* Modal agregar venta */}
      {showAddVenta &&
        esBorrador &&
        (() => {
          // Obtener desarrollos únicos de las ventas disponibles
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
              const hits = [v.cliente, v.loteAcciones ?? '', v.desarrolloNombre ?? ''].some((s) =>
                s.toLowerCase().includes(q),
              )
              if (!hits) return false
            }
            return true
          })

          return (
            <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md">
              <div className="bg-card animate-scale-up relative flex max-h-[90vh] w-full max-w-[90%] flex-col rounded-2xl border border-slate-200/80 p-6 shadow-2xl dark:border-slate-800/80">
                <button
                  onClick={resetModal}
                  className="text-muted-foreground hover:text-foreground absolute top-4 right-4 rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mb-4 shrink-0">
                  <h2 className="text-foreground mb-1 flex items-center gap-2 text-lg font-bold">
                    <Plus className="text-primary h-5 w-5" /> Agregar venta al corte
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Filtra por desarrollo, cliente o lote, selecciona la venta y captura su abono.
                  </p>
                </div>

                {/* Panel de Filtros Interactivos */}
                <div className="mb-4 shrink-0 space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-slate-800/80 dark:bg-slate-900/30">
                  {/* Filtro por Desarrollo (Pills Horizontales) */}
                  <div>
                    <span className="text-muted-foreground mb-1.5 block text-[10px] font-bold tracking-wider uppercase">
                      Filtrar por Desarrollo
                    </span>
                    <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto scroll-smooth pb-1">
                      <button
                        type="button"
                        onClick={() => setSelectedDesarrollo(null)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-[0.95] ${
                          selectedDesarrollo === null
                            ? 'bg-primary text-primary-foreground shadow-primary/20 shadow-sm'
                            : 'text-muted-foreground border bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'
                        }`}
                      >
                        Todos
                      </button>
                      {desarrollos.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDesarrollo(selectedDesarrollo === d ? null : d)}
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-[0.95] ${
                            selectedDesarrollo === d
                              ? 'bg-primary text-primary-foreground shadow-primary/20 shadow-sm'
                              : 'text-muted-foreground border bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buscador unificado: Cliente, Lote o Desarrollo */}
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] font-bold tracking-wider uppercase">
                      Buscar Venta
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          if (selectedVentaInfo && !e.target.value) {
                            setAddForm((f) => ({ ...f, ventaId: '', montoPagadoCliente: '' }))
                            setPorcentajeInput('')
                            setSelectedVentaInfo(null)
                          }
                        }}
                        placeholder="Buscar por cliente, lote o desarrollo..."
                        className="bg-background focus:border-primary focus:ring-primary w-full rounded-lg border border-slate-200 px-4 py-2 pr-8 text-sm transition-all focus:ring-1 focus:outline-none dark:border-slate-800"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-muted-foreground/60 hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de Resultados (Directamente en el Modal, NO flotante) */}
                <div className="scrollbar-thin max-h-[220px] min-h-[140px] flex-1 divide-y overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/20 p-2 dark:divide-slate-800 dark:border-slate-800/80 dark:bg-slate-900/10">
                  {filteredVentas.length === 0 ? (
                    <div className="text-muted-foreground/80 flex flex-col items-center justify-center gap-1 py-8 text-center text-xs">
                      <Search className="text-muted-foreground/45 h-6 w-6" />
                      <span>No se encontraron ventas finalizadas.</span>
                      <span className="text-muted-foreground/50 text-[10px]">
                        Intenta ajustando los filtros superiores.
                      </span>
                    </div>
                  ) : (
                    filteredVentas.map((v) => {
                      const isSelected = addForm.ventaId === v.id
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setAddForm((f) => ({ ...f, ventaId: v.id }))
                            setSelectedVentaInfo(v)
                          }}
                          className={`flex w-full items-center justify-between rounded-lg border-2 p-2.5 text-left transition-all hover:bg-slate-100/60 dark:hover:bg-slate-800/30 ${
                            isSelected
                              ? 'border-emerald-500/60 bg-emerald-500/[0.04] shadow-sm dark:border-emerald-500/40'
                              : 'border-transparent'
                          }`}
                        >
                          <div className="min-w-0 pr-3">
                            <span className="text-foreground block truncate text-xs font-bold">
                              {v.cliente}
                            </span>
                            <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-medium">
                              {v.desarrolloNombre && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Building2 className="h-2.5 w-2.5 shrink-0" />{' '}
                                  {v.desarrolloNombre}
                                </span>
                              )}
                              {v.loteAcciones && (
                                <span className="text-primary bg-primary/5 shrink-0 rounded px-1 py-0.25 font-mono">
                                  Lote: {v.loteAcciones}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-right">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {fmt(Number(v.monto))}
                            </span>
                            {isSelected && (
                              <span className="animate-scale-up shrink-0 rounded-full bg-emerald-500 p-0.5 text-white">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Formulario de Pago de la Venta Seleccionada */}
                {/* Formulario de Pago de la Venta Seleccionada o Estado Vacío */}
                {selectedVentaInfo ? (
                  <div className="animate-slide-up mt-4 shrink-0 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-3 text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold">Venta seleccionada</p>
                        <p className="text-foreground font-bold">
                          {selectedVentaInfo.cliente} (Lote: {selectedVentaInfo.loteAcciones ?? '—'}
                          )
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground font-semibold">Valor total</p>
                        <p className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {fmt(Number(selectedVentaInfo.monto))}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                          Monto pagado ($MXN)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={addForm.montoPagadoCliente}
                            onChange={(e) =>
                              handleMontoChange(e.target.value.replace(/[^0-9.]/g, ''))
                            }
                            placeholder="0.00"
                            className="bg-background focus:border-primary focus:ring-primary w-full rounded-lg border border-slate-200 py-2 pr-3 pl-3 text-xs font-semibold transition-all focus:ring-1 focus:outline-none dark:border-slate-800"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                          Porcentaje del total (%)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            max="100"
                            value={porcentajeInput}
                            onChange={(e) =>
                              handlePctChange(e.target.value.replace(/[^0-9.]/g, ''))
                            }
                            placeholder="0.00"
                            className="bg-background focus:border-primary focus:ring-primary w-full rounded-lg border border-slate-200 py-2 pr-8 pl-3 text-xs font-semibold transition-all focus:ring-1 focus:outline-none dark:border-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    {addForm.montoPagadoCliente && ventaTotal > 0 && (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-800/30 dark:bg-emerald-900/10">
                        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span>Progreso del pago abonado</span>
                          <span>
                            {Math.min(
                              (Number(addForm.montoPagadoCliente) / ventaTotal) * 100,
                              100,
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/50 dark:bg-emerald-900/50">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{
                              width: `${Math.min((Number(addForm.montoPagadoCliente) / ventaTotal) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-muted-foreground mb-1 block text-xs font-semibold">
                        Notas (opcional)
                      </label>
                      <input
                        type="text"
                        value={addForm.notasJoana}
                        onChange={(e) => setAddForm((f) => ({ ...f, notasJoana: e.target.value }))}
                        placeholder="Ej: Abono, enganche, liquidación..."
                        className="bg-background focus:border-primary focus:ring-primary w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-1 focus:outline-none dark:border-slate-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                      <Banknote className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Selecciona una venta
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Usa el buscador para filtrar y elegir la venta a abonar.
                      </p>
                    </div>
                  </div>
                )}

                {addError && (
                  <div className="bg-destructive/10 text-destructive border-destructive/20 mt-3 shrink-0 rounded-lg border p-3 text-xs">
                    {addError}
                  </div>
                )}

                <div className="mt-5 flex shrink-0 justify-end gap-3 border-t pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="text-muted-foreground rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium transition-all hover:bg-slate-200/80 active:scale-[0.98] dark:bg-slate-800 dark:hover:bg-slate-700/80"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-agregar-venta-submit"
                    onClick={handleAgregarVenta}
                    disabled={isPending || !addForm.ventaId || !addForm.montoPagadoCliente}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isPending ? 'Agregando...' : 'Agregar venta'}
                  </button>
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
