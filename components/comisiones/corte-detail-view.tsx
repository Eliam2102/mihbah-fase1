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
  MessageSquare,
  UserCog,
} from 'lucide-react'
import {
  agregarVentaAlCorteAction,
  ajustarDispersionEnCorteAction,
  eliminarVentaDelCorteAction,
  enviarCorteAAprobacionAction,
  reasignarLiderDispersionAction,
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
  afiliadoId?: string | null
  alianzaNombre?: string | null
  socioNombre?: string | null
  pctAfiliacion?: string | null
  pctJorge?: string | null
  pctKass?: string | null
  pctDiana?: string | null
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
  lideresPorAfiliado = {},
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
  lideresPorAfiliado?: Record<string, { id: string; nombre: string }[]>
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

  // Modal "Enviar a aprobación" con mensaje
  const [showEnviarModal, setShowEnviarModal] = useState(false)
  const [mensajeEnvio, setMensajeEnvio] = useState('')

  // Reasignación de líder en LIDER_SALDO (Tarea 2D)
  const [reasignandoDisp, setReasignandoDisp] = useState<string | null>(null)
  const [reasignandoLiderId, setReasignandoLiderId] = useState('')

  // Búsqueda dentro de ventas del corte
  const [pagosSearch, setPagosSearch] = useState('')

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

  const handleReasignarLider = (dispersionId: string) => {
    if (!reasignandoLiderId) return
    startTransition(async () => {
      const res = await reasignarLiderDispersionAction(empresaId, dispersionId, reasignandoLiderId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setReasignandoDisp(null)
      setReasignandoLiderId('')
      router.refresh()
    })
  }

  const handleEnviarAprobacion = () => {
    setMensajeEnvio('')
    setShowEnviarModal(true)
  }

  const handleConfirmarEnvio = () => {
    startTransition(async () => {
      const res = await enviarCorteAAprobacionAction(
        empresaId,
        corte.id,
        mensajeEnvio.trim() || null,
      )
      if (!res.ok) {
        setError(res.error)
        setShowEnviarModal(false)
        return
      }
      setShowEnviarModal(false)
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
            {/* Mensaje enviado al aprobador — solo aparece si ya se capturó al enviar */}
            {corte.notasJoana && (
              <div className="mt-1 flex items-center gap-1.5 text-sm">
                <MessageSquare className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                <span className="text-muted-foreground italic">{corte.notasJoana}</span>
              </div>
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
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 text-sm shadow-sm backdrop-blur-md sm:flex sm:flex-wrap sm:items-center sm:gap-6 sm:px-5 sm:py-3 dark:border-slate-800/60 dark:bg-slate-900/30">
        <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
              {/* Modal — rectángulo horizontal claro */}
              <div
                className="border-border flex w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-zinc-900"
                style={{ maxWidth: 880, height: 'min(560px, calc(100vh - 48px))' }}
              >
                {/* ─── HEADER ─────────────────────────────────────── */}
                <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-foreground text-base font-bold">Agregar ventas al corte</h2>
                    <p className="text-muted-foreground text-xs">
                      Selecciona ventas · captura abono · confirma
                    </p>
                  </div>
                  {selectedCount > 0 && (
                    <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-3 py-1 text-xs font-bold">
                      {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={resetModal}
                    className="text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-2 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* ─── BODY (split 55 / 45) ────────────────────────── */}
                <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {/* ── Panel izquierdo: catálogo ── */}
                  <div
                    style={{
                      width: '55%',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      borderRight: '1px solid var(--border)',
                    }}
                  >
                    {/* Buscador */}
                    <div className="shrink-0 space-y-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar cliente, lote o desarrollo..."
                          className="bg-background border-input focus:border-primary w-full rounded-lg border py-2 pr-8 pl-9 text-sm focus:outline-none"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {desarrollos.length > 0 && (
                        <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setSelectedDesarrollo(null)}
                            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${selectedDesarrollo === null ? 'bg-primary text-primary-foreground' : 'border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}
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
                              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${selectedDesarrollo === d ? 'bg-primary text-primary-foreground' : 'border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lista de ventas */}
                    <div
                      style={{ flex: 1, overflowY: 'auto' }}
                      className="divide-y divide-zinc-100 dark:divide-zinc-800"
                    >
                      {filteredVentas.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-14 text-center">
                          <Search className="h-7 w-7 opacity-30" />
                          <p className="text-sm">Sin resultados</p>
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="text-primary text-xs underline"
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
                              className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${isSel ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'}`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${isSel ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground/30 group-hover:border-emerald-400'}`}
                              >
                                {isSel && <Check className="h-3 w-3 text-white" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`truncate text-sm font-semibold ${isSel ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}
                                >
                                  {v.cliente}
                                </p>
                                <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                                  {v.desarrolloNombre && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {v.desarrolloNombre}
                                    </span>
                                  )}
                                  {v.loteAcciones && (
                                    <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
                                      L:{v.loteAcciones}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 text-sm font-bold tabular-nums ${isSel ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                              >
                                {fmt(Number(v.monto))}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>

                    {/* Pie del panel */}
                    <div className="shrink-0 border-t border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
                      <p className="text-muted-foreground text-xs">
                        {filteredVentas.length} disponibles
                      </p>
                    </div>
                  </div>

                  {/* ── Panel derecho: cola de abonos ── */}
                  <div
                    style={{ width: '45%', display: 'flex', flexDirection: 'column', minHeight: 0 }}
                    className="bg-zinc-50 dark:bg-zinc-800/40"
                  >
                    {/* Cabecera panel */}
                    <div className="shrink-0 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                      <p className="text-foreground text-sm font-semibold">Cola de abonos</p>
                      <p className="text-muted-foreground text-xs">
                        {selectedCount === 0
                          ? 'Selecciona ventas de la izquierda'
                          : `Captura el monto de cada venta`}
                      </p>
                    </div>

                    {/* Contenido */}
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        padding: 16,
                      }}
                    >
                      {selectedCount === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                          <div className="border-border flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed">
                            <Banknote className="text-muted-foreground/30 h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-semibold">Sin ventas aún</p>
                            <p className="text-muted-foreground mt-1 text-xs">
                              Toca una venta para agregarla.
                            </p>
                          </div>
                        </div>
                      ) : (
                        selectedList.map((v) => {
                          const entry = selectedVentas.get(v.id)!
                          const ventaMonto = Number(v.monto)
                          const pct =
                            entry.montoPagadoCliente && ventaMonto > 0
                              ? Math.min((Number(entry.montoPagadoCliente) / ventaMonto) * 100, 100)
                              : 0
                          const montoOk =
                            !!entry.montoPagadoCliente &&
                            !isNaN(Number(entry.montoPagadoCliente)) &&
                            Number(entry.montoPagadoCliente) > 0

                          return (
                            <div
                              key={v.id}
                              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                            >
                              {/* Cabecera card */}
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    {montoOk ? (
                                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                                        <Check className="h-2.5 w-2.5 text-white" />
                                      </span>
                                    ) : (
                                      <span className="h-4 w-4 shrink-0 rounded-full border-2 border-amber-400" />
                                    )}
                                    <p className="text-foreground truncate text-sm font-bold">
                                      {v.cliente}
                                    </p>
                                  </div>
                                  <p className="text-muted-foreground mt-0.5 pl-6 text-xs">
                                    {[
                                      v.desarrolloNombre,
                                      v.loteAcciones ? `L.${v.loteAcciones}` : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleVenta(v)}
                                  className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Monto de venta */}
                              <p className="text-muted-foreground mb-2 text-xs tabular-nums">
                                Venta:{' '}
                                <span className="text-foreground font-semibold">
                                  {fmt(ventaMonto)}
                                </span>
                              </p>

                              {/* Inputs */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
                                    Abono $
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
                                    className={`bg-background w-full rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none ${montoOk ? 'border-emerald-400 focus:border-emerald-500' : 'border-input focus:border-primary'}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
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
                                    className={`bg-background w-full rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none ${montoOk ? 'border-emerald-400 focus:border-emerald-500' : 'border-input focus:border-primary'}`}
                                  />
                                </div>
                              </div>

                              {/* Barra progreso */}
                              {ventaMonto > 0 && (
                                <div className="mt-2.5">
                                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-primary' : ''}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <p className="text-muted-foreground mt-1 text-right text-[10px] tabular-nums">
                                    {pct > 0 ? `${pct.toFixed(1)}% del total` : 'Ingresa el monto'}
                                  </p>
                                </div>
                              )}

                              {/* Nota */}
                              <input
                                type="text"
                                value={entry.notasJoana}
                                onChange={(e) =>
                                  updateVentaField(v.id, 'notasJoana', e.target.value)
                                }
                                placeholder="Nota interna (opcional)"
                                className="border-input bg-background focus:border-primary mt-2 w-full rounded-lg border px-3 py-1.5 text-xs text-slate-500 focus:outline-none"
                              />
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Progreso guardado */}
                    {addProgress && (
                      <div className="shrink-0 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
                        <div className="text-primary mb-1.5 flex justify-between text-xs font-semibold">
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
                      <div className="bg-destructive/10 text-destructive border-destructive/20 mx-4 mb-3 shrink-0 rounded-lg border p-3 text-xs">
                        {addError}
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── FOOTER ──────────────────────────────────────── */}
                <div className="shrink-0 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm">
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
                            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                              <Check className="h-4 w-4" /> Listas para guardar
                            </span>
                          )
                        })()
                      )}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={resetModal}
                        className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        Cancelar
                      </button>
                      <button
                        id="btn-agregar-venta-submit"
                        onClick={handleAgregarVentas}
                        disabled={isPending || selectedCount === 0}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-40"
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

      {/* Modal — Enviar a aprobación con mensaje */}
      {showEnviarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl border border-slate-200/80 shadow-2xl dark:border-slate-800/80">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <Send className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </span>
              <div>
                <h2 className="text-foreground text-sm font-bold">Enviar corte a aprobación</h2>
                <p className="text-muted-foreground text-[11px]">
                  El aprobador verá este mensaje al revisar el corte
                </p>
              </div>
            </div>

            <div className="px-5 py-4">
              <label className="text-foreground mb-2 block text-xs font-semibold">
                Mensaje para el aprobador{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                value={mensajeEnvio}
                onChange={(e) => setMensajeEnvio(e.target.value)}
                rows={4}
                autoFocus
                className="bg-background border-input w-full rounded-xl border px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400/50 focus:outline-none"
                placeholder="Ej: Este corte incluye el pago del cliente Pérez que llegó tarde. Los montos de Flamingo están ajustados por el descuento acordado..."
              />
              <p className="text-muted-foreground mt-1.5 text-[10px]">
                Este mensaje aparecerá destacado en la pantalla de autorización para que el
                aprobador tenga contexto antes de aprobar o rechazar.
              </p>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <button
                onClick={() => setShowEnviarModal(false)}
                disabled={isPending}
                className="text-muted-foreground flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-envio-aprobacion"
                onClick={handleConfirmarEnvio}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isPending ? 'Enviando...' : 'Enviar a aprobación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ventas del corte */}
      {pagos.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-foreground font-semibold">Ventas incluidas en el corte</h2>
            <span className="text-muted-foreground text-xs">
              {pagos.length} venta{pagos.length !== 1 ? 's' : ''}
            </span>
            <div className="relative ml-auto w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                type="text"
                value={pagosSearch}
                onChange={(e) => setPagosSearch(e.target.value)}
                placeholder="Buscar cliente, lote…"
                className="border-input bg-background focus:border-primary w-full rounded-lg border py-1.5 pr-7 pl-8 text-xs focus:outline-none"
              />
              {pagosSearch && (
                <button
                  type="button"
                  onClick={() => setPagosSearch('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {pagos
              .filter((p) => {
                if (!pagosSearch) return true
                const q = pagosSearch.toLowerCase()
                return (
                  p.ventaNombreCliente?.toLowerCase().includes(q) ||
                  p.ventaLote?.toLowerCase().includes(q) ||
                  p.desarrolloNombre?.toLowerCase().includes(q) ||
                  p.alianzaNombre?.toLowerCase().includes(q)
                )
              })
              .map((pago) => {
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

                    <VentaComisionDetalle
                      pago={pago}
                      dispsVenta={dispsVenta}
                      esBorrador={esBorrador}
                      isPending={isPending}
                      ajustando={ajustando}
                      nuevoMonto={nuevoMonto}
                      reasignandoDisp={reasignandoDisp}
                      reasignandoLiderId={reasignandoLiderId}
                      lideresDisponibles={
                        pago.afiliadoId ? (lideresPorAfiliado[pago.afiliadoId] ?? []) : []
                      }
                      onSetAjustando={(id) => {
                        setAjustando(id)
                        if (id === null) setNuevoMonto('')
                      }}
                      onSetNuevoMonto={setNuevoMonto}
                      onGuardarAjuste={handleAjustar}
                      onSetReasignandoDisp={(id) => setReasignandoDisp(id)}
                      onSetReasignandoLiderId={setReasignandoLiderId}
                      onGuardarReasignacion={handleReasignarLider}
                    />
                  </div>
                )
              })}
            {pagosSearch &&
              !pagos.some((p) => {
                const q = pagosSearch.toLowerCase()
                return (
                  p.ventaNombreCliente?.toLowerCase().includes(q) ||
                  p.ventaLote?.toLowerCase().includes(q) ||
                  p.desarrolloNombre?.toLowerCase().includes(q) ||
                  p.alianzaNombre?.toLowerCase().includes(q)
                )
              }) && (
                <div className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
                  Sin resultados para &ldquo;{pagosSearch}&rdquo;
                </div>
              )}
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

const CONCEPTO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Op. BM Corp',
  OP_YESYUCAN: 'Op. Yesyucan',
  ASESOR: 'Asesor',
  LIDER_SALDO: 'Afiliación',
  SOCIO_FIJO_JORGE: 'Fijo Jorge',
  SOCIO_FIJO_KASS: 'Fijo Kass',
  SOCIO_BOLSA_JORGE: 'Bolsa Jorge',
  SOCIO_BOLSA_KASS: 'Bolsa Kass',
  SOCIO_BOLSA_DIANA: 'Bolsa Diana',
}

function VentaComisionDetalle({
  pago,
  dispsVenta,
  esBorrador,
  isPending,
  ajustando,
  nuevoMonto,
  reasignandoDisp,
  reasignandoLiderId,
  lideresDisponibles,
  onSetAjustando,
  onSetNuevoMonto,
  onGuardarAjuste,
  onSetReasignandoDisp,
  onSetReasignandoLiderId,
  onGuardarReasignacion,
}: {
  pago: PagoCorte
  dispsVenta: Dispersion[]
  esBorrador: boolean
  isPending: boolean
  ajustando: string | null
  nuevoMonto: string
  reasignandoDisp: string | null
  reasignandoLiderId: string
  lideresDisponibles: { id: string; nombre: string }[]
  onSetAjustando: (id: string | null) => void
  onSetNuevoMonto: (v: string) => void
  onGuardarAjuste: (id: string) => void
  onSetReasignandoDisp: (id: string | null) => void
  onSetReasignandoLiderId: (id: string) => void
  onGuardarReasignacion: (id: string) => void
}) {
  const totalDisp = dispsVenta.reduce((s, d) => s + Number(d.montoTotal), 0)
  const montoADispersar = Number(pago.montoADispersar)
  const diferencia = Math.abs(totalDisp - montoADispersar)
  const cuadra = diferencia < 0.01

  // Monto ASESOR se absorbe visualmente en la línea Afiliación
  const asesorMonto = dispsVenta
    .filter((d) => d.tipoBeneficiario === 'ASESOR')
    .reduce((s, d) => s + Number(d.montoTotal), 0)

  if (dispsVenta.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center text-xs text-slate-400 dark:border-slate-700">
        Sin dispersiones calculadas para este pago.
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Contexto: solo alianza (asesor no se muestra por ser interno a la afiliación) */}
      {pago.alianzaNombre && (
        <div className="px-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Alianza:</span>{' '}
          {pago.alianzaNombre}
        </div>
      )}

      {/* Tabla de dispersiones */}
      <div className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b bg-slate-100/60 text-left text-[10px] font-semibold dark:bg-slate-900/60">
              <th className="px-3 py-2">Concepto</th>
              <th className="hidden px-3 py-2 sm:table-cell">Beneficiario</th>
              <th className="px-3 py-2 text-right tabular-nums">Monto</th>
              {esBorrador && <th className="w-14 px-2 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {dispsVenta.map((d) => {
              // ASESOR se absorbe en la línea de Afiliación — no se muestra por separado
              if (d.tipoBeneficiario === 'ASESOR') return null

              const esAfiliacion = d.tipoBeneficiario === 'LIDER_SALDO'
              // Para Afiliación: suma el monto del asesor interno de la alianza
              const montoDisplay = esAfiliacion
                ? Number(d.montoTotal) + asesorMonto
                : Number(d.montoTotal)
              const pctReal = montoADispersar > 0 ? (montoDisplay / montoADispersar) * 100 : 0
              const concepto = CONCEPTO_LABELS[d.tipoBeneficiario] ?? d.tipoBeneficiario
              const isAjustando = ajustando === d.id
              const isReasignando = reasignandoDisp === d.id

              return (
                <tr key={d.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-950/20">
                  {/* Concepto */}
                  <td className="px-3 py-2">
                    <span className="text-foreground font-medium">{concepto}</span>
                    {esAfiliacion && pago.alianzaNombre && (
                      <span className="ml-1.5 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                        {pago.alianzaNombre}
                      </span>
                    )}
                    {d.acumulaMensual && (
                      <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                        Acumula
                      </span>
                    )}
                  </td>

                  {/* Beneficiario — hidden en móvil */}
                  <td className="text-muted-foreground hidden px-3 py-2 sm:table-cell">
                    {isReasignando && esAfiliacion ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={reasignandoLiderId}
                          onChange={(e) => onSetReasignandoLiderId(e.target.value)}
                          className="bg-background border-input flex-1 rounded border px-2 py-0.5 text-[10px]"
                          autoFocus
                        >
                          <option value="">— Selecciona líder —</option>
                          {lideresDisponibles.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => onGuardarReasignacion(d.id)}
                          disabled={isPending || !reasignandoLiderId}
                          className="text-success rounded p-0.5 transition-all hover:bg-emerald-500/10 active:scale-[0.9] disabled:opacity-40"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            onSetReasignandoDisp(null)
                            onSetReasignandoLiderId('')
                          }}
                          className="text-muted-foreground rounded p-0.5 transition-all hover:bg-slate-200 active:scale-[0.9] dark:hover:bg-slate-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : esAfiliacion ? (
                      // Afiliación muestra el nombre de la alianza, no el nombre personal
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {pago.alianzaNombre ?? d.beneficiarioNombre}
                      </span>
                    ) : (
                      d.beneficiarioNombre
                    )}
                  </td>

                  {/* Monto */}
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {isAjustando ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={nuevoMonto}
                          onChange={(e) => onSetNuevoMonto(e.target.value)}
                          className="bg-background border-input w-20 rounded border px-1.5 py-0.5 text-right text-xs"
                          autoFocus
                        />
                        <button
                          onClick={() => onGuardarAjuste(d.id)}
                          disabled={isPending}
                          className="text-success rounded p-0.5 transition-all hover:bg-emerald-500/10 active:scale-[0.9]"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onSetAjustando(null)}
                          className="text-muted-foreground rounded p-0.5 transition-all hover:bg-slate-200 active:scale-[0.9] dark:hover:bg-slate-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className={esAfiliacion ? 'text-indigo-600 dark:text-indigo-400' : ''}>
                        {fmt(montoDisplay)}
                      </span>
                    )}
                  </td>

                  {/* Acciones (solo BORRADOR) */}
                  {esBorrador && (
                    <td className="px-2 py-2 text-right">
                      {!isAjustando && !isReasignando && (
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => {
                              onSetAjustando(d.id)
                              onSetNuevoMonto(montoDisplay.toFixed(2))
                            }}
                            className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-all hover:bg-slate-100 active:scale-[0.9] dark:hover:bg-slate-800"
                            title="Ajustar monto"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {esAfiliacion && (
                            <button
                              onClick={() => {
                                onSetReasignandoDisp(d.id)
                                onSetReasignandoLiderId('')
                              }}
                              className="text-muted-foreground rounded p-0.5 transition-all hover:bg-indigo-50 hover:text-indigo-600 active:scale-[0.9] dark:hover:bg-indigo-950/40"
                              title="Reasignar afiliación"
                            >
                              <UserCog className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-100/40 dark:border-slate-700 dark:bg-slate-900/40">
            <tr>
              <td
                colSpan={2}
                className="text-muted-foreground px-3 py-2 text-[10px] font-bold tracking-wider uppercase"
              >
                Total dispersado
              </td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">
                <span
                  className={
                    cuadra
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }
                >
                  {fmt(totalDisp)}
                </span>
              </td>
              {esBorrador && (
                <td className="px-2 py-2 text-right">
                  {cuadra ? (
                    <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <span title={`Diferencia: ${fmt(diferencia)}`}>
                      <AlertCircle className="ml-auto h-3.5 w-3.5 text-amber-500" />
                    </span>
                  )}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Móvil: selector reasignación cuando no hay columna beneficiario */}
      {esBorrador && reasignandoDisp !== null && (
        <div className="block rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:hidden dark:border-indigo-800/60 dark:bg-indigo-950/20">
          <p className="mb-2 text-[10px] font-bold tracking-wider text-indigo-700 uppercase dark:text-indigo-400">
            Reasignar afiliación a:
          </p>
          <div className="flex items-center gap-2">
            <select
              value={reasignandoLiderId}
              onChange={(e) => onSetReasignandoLiderId(e.target.value)}
              className="bg-background border-input flex-1 rounded border px-2 py-1 text-xs"
              autoFocus
            >
              <option value="">— Selecciona líder —</option>
              {lideresDisponibles.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={() => onGuardarReasignacion(reasignandoDisp)}
              disabled={isPending || !reasignandoLiderId}
              className="text-success rounded p-1 transition-all hover:bg-emerald-500/10 active:scale-[0.9] disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                onSetReasignandoDisp(null)
                onSetReasignandoLiderId('')
              }}
              className="text-muted-foreground rounded p-1 transition-all hover:bg-slate-200 active:scale-[0.9] dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
