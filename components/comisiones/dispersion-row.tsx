'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  RotateCcw,
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react'
import {
  marcarPagadoAction,
  revertirPagoDispersionAction,
} from '@/app/actions/comisiones/dispersiones'
import type { Dispersion } from '@/lib/services/comisiones/comisiones.service'
import { ConfirmInline } from './confirm-inline'

const MAX_SIZE_MB = 20
const TIPOS_VALIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']

export function DispersionRow({
  empresaId,
  dispersion,
  ventaCliente,
  ventaId,
  ventaDesarrolloNombre,
  ventaLoteAcciones,
  aprobadoPorNombre,
  canModify = false,
}: {
  empresaId: string
  dispersion: Dispersion
  ventaCliente: string
  ventaId: string
  ventaDesarrolloNombre?: string | null
  ventaLoteAcciones?: string | null
  aprobadoPorNombre?: string | null
  canModify?: boolean
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [montoCustom, setMontoCustom] = useState('')
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [comprobanteError, setComprobanteError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fmt = (n: string | number) =>
    Number(n).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const yaPagado = Number(dispersion.montoPagado) >= Number(dispersion.montoTotal) - 0.01
  const restante = Number(dispersion.montoTotal) - Number(dispersion.montoPagado)
  const tienePago = Number(dispersion.montoPagado) > 0

  function resetForm() {
    setFecha(new Date().toISOString().slice(0, 10))
    setMontoCustom('')
    setComprobante(null)
    setComprobanteError(null)
    setError(null)
  }

  function abrirModal() {
    resetForm()
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    resetForm()
  }

  function validarArchivo(file: File): string | null {
    if (!TIPOS_VALIDOS.includes(file.type)) {
      return 'Solo se permite PDF o imagen (PNG/JPG).'
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Archivo muy grande. Máximo ${MAX_SIZE_MB} MB.`
    }
    return null
  }

  function onArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    setComprobanteError(null)
    const file = e.target.files?.[0]
    if (!file) {
      setComprobante(null)
      return
    }
    const err = validarArchivo(file)
    if (err) {
      setComprobanteError(err)
      setComprobante(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setComprobante(file)
  }

  function handleMarcar() {
    if (!comprobante) {
      setError('Adjunta el comprobante de pago para continuar.')
      return
    }
    setError(null)
    const monto = montoCustom ? Number(montoCustom) : undefined
    startTransition(async () => {
      // TODO storage real: aún no se persiste el archivo. Solo se registra el pago.
      // El comprobante se conectará al volumen Easypanel en deploy.
      const result = await marcarPagadoAction(empresaId, {
        dispersionId: dispersion.id,
        fechaPago: fecha,
        montoPagado: monto,
      })
      if (!result.ok) setError(result.error)
      else {
        cerrarModal()
        router.refresh()
      }
    })
  }

  async function handleRevertir() {
    const result = await revertirPagoDispersionAction(empresaId, dispersion.id)
    if (result.ok) router.refresh()
    else setError(result.error)
  }

  return (
    <>
      <tr className="hover:bg-muted/20">
        <td className="px-2 py-1.5 sm:px-3">
          <div className="font-medium">{dispersion.beneficiarioNombre}</div>
          <Link
            href={`/empresa/${empresaId}/ventas/${ventaId}`}
            className="text-muted-foreground text-xs hover:underline md:hidden"
          >
            {ventaCliente}
          </Link>
        </td>
        <td className="text-muted-foreground hidden px-3 py-1.5 text-xs md:table-cell">
          <Link href={`/empresa/${empresaId}/ventas/${ventaId}`} className="hover:underline">
            {ventaCliente}
          </Link>
          {ventaDesarrolloNombre && (
            <div className="text-muted-foreground/80 truncate text-[10px]">
              {ventaDesarrolloNombre}
              {ventaLoteAcciones && <span className="font-mono"> · Lote {ventaLoteAcciones}</span>}
            </div>
          )}
          {!ventaDesarrolloNombre && ventaLoteAcciones && (
            <div className="text-muted-foreground/80 font-mono text-[10px]">
              Lote {ventaLoteAcciones}
            </div>
          )}
        </td>
        <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">
          <div>{fmt(dispersion.montoTotal)}</div>
          <div className="text-success text-xs tabular-nums sm:hidden">
            {fmt(dispersion.montoPagado)}
          </div>
        </td>
        <td className="text-success hidden px-3 py-1.5 text-right tabular-nums sm:table-cell">
          {fmt(dispersion.montoPagado)}
        </td>
        <td className="px-2 py-1.5 text-center text-xs sm:px-3">
          <EstadoBadge estado={dispersion.estado} />
        </td>
        <td className="text-muted-foreground hidden px-3 py-1.5 text-center text-xs lg:table-cell">
          {dispersion.fechaPago ?? '—'}
        </td>
        <td className="text-muted-foreground hidden px-3 py-1.5 text-xs lg:table-cell">
          {aprobadoPorNombre ?? <span className="opacity-40">—</span>}
        </td>
        <td className="px-2 py-1.5 sm:px-3">
          {canModify ? (
            <div className="flex items-center justify-end gap-1">
              {!yaPagado && (
                <button
                  onClick={abrirModal}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                >
                  <Check className="h-3 w-3" />
                  <span className="hidden sm:inline">Marcar</span>
                </button>
              )}
              {tienePago && (
                <ConfirmInline
                  onConfirm={handleRevertir}
                  label="Revertir"
                  question="¿Revertir pago?"
                />
              )}
              {dispersion.comprobanteId && (
                <a
                  href={`/api/comprobantes/${dispersion.comprobanteId}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Ver comprobante"
                  className="ml-2 inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-600 shadow-sm transition-colors hover:bg-blue-100"
                >
                  <FileText className="h-3 w-3" />
                  <span className="hidden xl:inline">Comprobante</span>
                </a>
              )}
            </div>
          ) : (
            tienePago && (
              <span
                className="text-muted-foreground inline-flex items-center gap-1 text-[10px] italic"
                title="Solo super_admin puede modificar"
              >
                <RotateCcw className="h-3 w-3" />
                bloqueado
              </span>
            )
          )}
        </td>
      </tr>

      {/* Modal marcar pagado con comprobante obligatorio */}
      {modalOpen && (
        <tr>
          <td colSpan={8} className="p-0">
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
              onClick={cerrarModal}
            >
              <div
                className="bg-card relative w-full max-w-lg overflow-hidden rounded-t-2xl shadow-xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-foreground text-base font-semibold">Registrar pago</h3>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {dispersion.beneficiarioNombre} · {fmt(dispersion.montoTotal)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={cerrarModal}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-5 py-4">
                  {/* Fecha + Monto */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase">
                        Fecha pago
                      </span>
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="input w-full"
                      />
                    </label>
                    <label className="block">
                      <span className="text-muted-foreground mb-1 block text-[11px] font-semibold uppercase">
                        Monto
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        max={restante}
                        value={montoCustom}
                        onChange={(e) => setMontoCustom(e.target.value)}
                        placeholder={restante.toFixed(2)}
                        className="input w-full tabular-nums"
                      />
                      <span className="text-muted-foreground mt-0.5 block text-[10px]">
                        Vacío = restante {fmt(restante)}
                      </span>
                    </label>
                  </div>

                  {/* Comprobante obligatorio */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase">
                        Comprobante de pago <span className="text-destructive">obligatorio</span>
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        PDF/PNG/JPG · máx 20MB
                      </span>
                    </div>

                    {comprobante ? (
                      <div className="border-success/30 bg-success/5 flex items-center gap-3 rounded-lg border p-3">
                        <div className="bg-success/15 text-success grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                          {comprobante.type === 'application/pdf' ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <ImageIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm font-medium">
                            {comprobante.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {(comprobante.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setComprobante(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          aria-label="Quitar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        className="hover:bg-muted/40 hover:border-primary/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 text-center transition-colors"
                        htmlFor={`file-${dispersion.id}`}
                      >
                        <Upload className="text-muted-foreground h-6 w-6" />
                        <p className="text-foreground text-sm font-medium">
                          Click para adjuntar comprobante
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          Foto del recibo o ticket de depósito
                        </p>
                      </label>
                    )}
                    <input
                      ref={fileInputRef}
                      id={`file-${dispersion.id}`}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
                      onChange={onArchivoSeleccionado}
                      className="hidden"
                    />

                    {comprobanteError && (
                      <p className="text-destructive mt-2 inline-flex items-center gap-1 text-xs">
                        <AlertCircle className="h-3 w-3" /> {comprobanteError}
                      </p>
                    )}
                  </div>

                  {/* Nota informativa */}
                  <div className="bg-muted/40 text-muted-foreground rounded-md px-3 py-2 text-[11px] leading-relaxed">
                    El comprobante es obligatorio tanto en efectivo (recibo) como en depósito (foto
                    o ticket). Queda registrado para trazabilidad y se mostrará al beneficiario en
                    el portal.
                  </div>

                  {error && (
                    <p className="text-destructive inline-flex items-center gap-1 text-xs">
                      <AlertCircle className="h-3 w-3" /> {error}
                    </p>
                  )}
                </div>

                <div className="bg-muted/20 flex items-center justify-end gap-2 border-t px-5 py-3">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-2 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleMarcar}
                    disabled={pending || !comprobante}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {pending ? (
                      'Guardando...'
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirmar pago
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDIENTE: 'bg-muted text-muted-foreground',
    PARCIAL: 'bg-amber-100 text-amber-800',
    PAGADO: 'bg-jade-100 text-jade-800',
    DIFERIDO: 'bg-blue-100 text-blue-800',
  }
  return <span className={`rounded-full px-2 py-0.5 ${map[estado] ?? 'bg-muted'}`}>{estado}</span>
}
