'use client'

import { useState, useTransition } from 'react'

const TIPO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Operativa BM Corp',
  OP_YESYUCAN: 'Operativa YESYUCAN',
  ASESOR: 'Asesor (comisión directa)',
  LIDER_SALDO: 'Líder (Afiliación)',
  SOCIO_BOLSA_JORGE: 'Socio bolsa — Jorge',
  SOCIO_BOLSA_KASS: 'Socio bolsa — Kass',
  SOCIO_BOLSA_DIANA: 'Socio bolsa — Diana',
  SOCIO_FIJO_JORGE: 'Socio fijo — Jorge',
  SOCIO_FIJO_KASS: 'Socio fijo — Kass',
}

import { FileUp, CheckCircle, Wallet, Building2, X, AlertCircle, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { marcarPagoBeneficiarioAction } from '@/app/actions/cortes-pago'
import { marcarPagoBonoAction } from '@/app/actions/comisiones/bonos-umbral'

export interface TesoreriaCorte {
  id: string
  fechaCorte: string
  tipoDia: string
}

export interface TesoreriaGrupo {
  key: string
  tipoBeneficiario: string
  nombre: string | null
  metodoPago: string
  clabe: string | null
  banco: string | null
  numeroCuenta: string | null
  totalMonto: number
  dispersiones: Array<{ id: string }>
}

export interface TesoreríaBono {
  id: string
  nombre: string
  configNombre: string
  montoTotal: number
  anio: number
  mes: number
}

export interface TesoreriaCorteData {
  corte: TesoreriaCorte
  grupos: TesoreriaGrupo[]
  bonos: TesoreríaBono[]
  totalEfectivo: number
  totalDeposito: number
}

export default function TesoreriaWorklist({
  data,
  empresaId,
}: {
  data: TesoreriaCorteData[]
  empresaId: string
}) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<TesoreriaGrupo | null>(null)
  const [selectedCorte, setSelectedCorte] = useState<TesoreriaCorte | null>(null)

  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenModal = (corte: TesoreriaCorte, grupo: TesoreriaGrupo) => {
    setSelectedCorte(corte)
    setSelectedGroup(grupo)
    setFechaPago(new Date().toISOString().slice(0, 10))
    setFile(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedGroup(null)
    setSelectedCorte(null)
    setFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !selectedCorte || !selectedGroup) {
      toast.error('Debe adjuntar un comprobante')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('corteId', selectedCorte.id)
      formData.append('beneficiarioKey', selectedGroup.key)
      formData.append('dispersionIds', JSON.stringify(selectedGroup.dispersiones.map((d) => d.id)))
      formData.append('metodoPago', selectedGroup.metodoPago)
      formData.append('fechaPago', fechaPago)
      formData.append('file', file)
      formData.append('empresaId', empresaId)

      await marcarPagoBeneficiarioAction(formData)
      toast.success('Pago registrado exitosamente')
      handleCloseModal()
      router.refresh()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Ocurrió un error al registrar el pago'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-12">
        <CheckCircle className="mb-4 h-10 w-10 text-slate-300" />
        <h3 className="text-sm font-medium text-slate-900">Sin pagos pendientes</h3>
        <p className="mt-1 text-sm text-slate-500">Todo se encuentra al día en Tesorería.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {data.map((corteData) => (
        <div
          key={corteData.corte.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Header del Corte */}
          <div className="border-b border-slate-200 bg-slate-50/50 p-4 sm:p-5 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <h3 className="text-base font-semibold break-words text-slate-900">
                  Corte {corteData.corte.tipoDia} — {corteData.corte.fechaCorte}
                </h3>
                <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-500/10 ring-inset">
                  APROBADO
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-3 text-sm md:mt-0 md:border-0 md:bg-transparent md:p-0">
                <div className="flex min-w-[120px] flex-1 flex-col md:flex-none md:items-end">
                  <span className="mb-0.5 text-xs tracking-wider text-slate-500 uppercase">
                    Total Efectivo
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(corteData.totalEfectivo)}
                  </span>
                </div>
                <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                <div className="flex min-w-[120px] flex-1 flex-col md:flex-none md:items-end">
                  <span className="mb-0.5 text-xs tracking-wider text-slate-500 uppercase">
                    Total depósito
                  </span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(corteData.totalDeposito)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Pagos por Beneficiario */}
          <div className="bg-slate-50/30 p-4 sm:p-5 md:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {corteData.grupos.map((grupo) => (
                <div
                  key={grupo.key}
                  className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex h-full flex-col">
                    <div className="mb-4">
                      <div className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        {TIPO_LABELS[grupo.tipoBeneficiario] ??
                          grupo.tipoBeneficiario.replace('_', ' ')}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <h4
                          className="line-clamp-2 text-sm font-semibold text-slate-900"
                          title={grupo.nombre ?? undefined}
                        >
                          {grupo.nombre}
                        </h4>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold text-slate-900">
                            {formatMoney(grupo.totalMonto)}
                          </div>
                          <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                            {grupo.dispersiones.length}{' '}
                            {grupo.dispersiones.length === 1 ? 'disp.' : 'disp.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 flex-grow space-y-2 rounded-md bg-slate-50 p-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        {grupo.metodoPago === 'EFECTIVO' ? (
                          <Wallet className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate font-medium">
                          {grupo.metodoPago === 'TRANSFERENCIA'
                            ? 'Depósito / Transferencia'
                            : grupo.metodoPago === 'DEPOSITO'
                              ? 'Depósito'
                              : grupo.metodoPago === 'OTRO'
                                ? 'Otro'
                                : grupo.metodoPago}
                        </span>
                      </div>

                      {grupo.metodoPago !== 'EFECTIVO' && (
                        <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2 text-slate-600">
                          {grupo.banco && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-slate-400">Banco</span>
                              <span
                                className="truncate font-medium text-slate-700"
                                title={grupo.banco}
                              >
                                {grupo.banco}
                              </span>
                            </div>
                          )}
                          {grupo.clabe && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-slate-400">CLABE</span>
                              <span className="font-mono font-medium break-all text-slate-700">
                                {grupo.clabe}
                              </span>
                            </div>
                          )}
                          {grupo.numeroCuenta && (
                            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-slate-400">Cuenta</span>
                              <span className="font-mono font-medium break-all text-slate-700">
                                {grupo.numeroCuenta}
                              </span>
                            </div>
                          )}
                          {!grupo.banco && !grupo.clabe && !grupo.numeroCuenta && (
                            <div className="flex items-center gap-1.5 rounded bg-amber-50 p-1.5 font-medium text-amber-600">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              Faltan datos
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenModal(corteData.corte, grupo)}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus:outline-none"
                  >
                    <FileUp className="h-4 w-4" />
                    Registrar Pago
                  </button>
                </div>
              ))}
            </div>

            {/* Bonos del mes asignados a este corte */}
            {corteData.bonos.length > 0 && (
              <div className="border-t border-slate-200 bg-amber-50/40 px-4 py-4 sm:px-5 md:px-6">
                <div className="mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    Bonos por umbral ({corteData.bonos.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {corteData.bonos.map((bono) => (
                    <BonoCard key={bono.id} bono={bono} empresaId={empresaId} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Modal para subir comprobante */}
      {isModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={handleCloseModal}
          />

          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
              <h3 className="text-base font-semibold text-slate-900">Registrar Pago</h3>
              <button
                onClick={handleCloseModal}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-5">
                <div className="rounded-md border border-slate-100 bg-slate-50 p-3 sm:p-4">
                  <div className="mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase sm:text-xs">
                    Beneficiario
                  </div>
                  <div className="text-sm font-semibold break-words text-slate-900">
                    {selectedGroup.nombre}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs text-slate-600 sm:text-sm">Total a pagar</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatMoney(selectedGroup.totalMonto)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Fecha de Pago
                    </label>
                    <input
                      type="date"
                      required
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Comprobante
                    </label>
                    <div className="mt-1 flex justify-center rounded-md border border-dashed border-slate-300 px-4 py-6 transition-colors hover:bg-slate-50 sm:px-6 sm:py-8">
                      <div className="w-full text-center">
                        <FileUp className="mx-auto h-8 w-8 text-slate-400" />
                        <div className="mt-4 flex flex-col items-center text-sm leading-6 text-slate-600">
                          <label className="relative cursor-pointer rounded-md bg-white font-semibold text-slate-900 focus-within:ring-2 focus-within:ring-slate-600 focus-within:ring-offset-2 focus-within:outline-none hover:text-slate-700">
                            <span className="px-2">Subir un archivo</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept=".pdf,.jpg,.jpeg,.png"
                              required
                              onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                        <p className="mt-2 text-[10px] leading-5 text-slate-500 sm:text-xs">
                          PDF, PNG, JPG hasta 20MB
                        </p>
                        {file && (
                          <div className="mx-auto mt-3 w-full max-w-[250px] truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-900 sm:text-sm">
                            {file.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset hover:bg-slate-50 sm:w-1/2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !file}
                  className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 sm:w-1/2"
                >
                  {isLoading ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const MESES_SHORT = [
  '',
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

function BonoCard({ bono, empresaId }: { bono: TesoreríaBono; empresaId: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10))
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [pending, startTransition] = useTransition()

  const submit = () => {
    if (!file) {
      toast.error('Adjunta comprobante')
      return
    }
    startTransition(async () => {
      const fd = new FormData()
      fd.append('empresaId', empresaId)
      fd.append('bonoId', bono.id)
      fd.append('metodoPago', metodoPago)
      fd.append('fechaPago', fechaPago)
      fd.append('file', file)
      fd.append('beneficiarioNombre', bono.nombre)
      const res = await marcarPagoBonoAction(fd)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Bono pagado')
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

  return (
    <>
      <div className="flex flex-col justify-between rounded-lg border border-amber-200 bg-white p-4">
        <div className="mb-3">
          <div className="mb-1 text-[10px] font-bold tracking-wider text-amber-600 uppercase">
            BONO · {MESES_SHORT[bono.mes]} {bono.anio}
          </div>
          <div className="text-sm font-semibold text-slate-900">{bono.nombre}</div>
          <div className="text-xs text-slate-500">{bono.configNombre}</div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-amber-700">{fmt(bono.montoTotal)}</span>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            <FileUp className="h-3 w-3" /> Pagar
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Pagar bono</h3>
              <button type="button" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm">
              <div className="font-semibold">{bono.nombre}</div>
              <div className="text-lg font-bold text-amber-700">{fmt(bono.montoTotal)}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Método</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="DEPOSITO">Depósito</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Fecha</label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Comprobante</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending || !file}
                onClick={submit}
                className="flex-1 rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {pending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
