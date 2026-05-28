'use client'

import { useState } from 'react'
import { FileUp, CheckCircle, Wallet, Building2, Calendar, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { marcarPagoBeneficiarioAction } from '@/app/actions/cortes-pago'

export interface TesoreriaCorte {
  id: string
  identificador?: string | null
  periodo?: string | null
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

export interface TesoreriaCorteData {
  corte: TesoreriaCorte
  grupos: TesoreriaGrupo[]
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white/40 p-12 shadow-sm backdrop-blur-md">
        <CheckCircle className="mb-4 h-16 w-16 text-emerald-400" />
        <h3 className="text-xl font-semibold text-slate-800">Todo al día</h3>
        <p className="mt-2 text-slate-500">No hay pagos pendientes en Tesorería en este momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {data.map((corteData) => (
        <div
          key={corteData.corte.id}
          className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white/70 shadow-sm backdrop-blur-xl"
        >
          {/* Header del Corte */}
          <div className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white/50 p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Corte: {corteData.corte.identificador || 'Sin ID'}
                </h3>
                <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Período: {corteData.corte.periodo || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                    Efectivo a retirar
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatMoney(corteData.totalEfectivo)}
                  </span>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">
                    A Depositar
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatMoney(corteData.totalDeposito)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Pagos por Beneficiario */}
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {corteData.grupos.map((grupo) => (
                <div
                  key={grupo.key}
                  className="group relative rounded-2xl border border-slate-200/50 bg-white/50 p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] transition-all duration-300 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <span className="mb-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {grupo.tipoBeneficiario.replace('_', ' ')}
                      </span>
                      <h4
                        className="truncate font-semibold text-slate-900"
                        title={grupo.nombre ?? undefined}
                      >
                        {grupo.nombre}
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">
                        {formatMoney(grupo.totalMonto)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {grupo.dispersiones.length} dispersiones
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-center gap-2 text-sm">
                      {grupo.metodoPago === 'EFECTIVO' ? (
                        <Wallet className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Building2 className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="font-medium text-slate-700">{grupo.metodoPago}</span>
                    </div>

                    {grupo.metodoPago !== 'EFECTIVO' && (
                      <div className="space-y-1 text-xs text-slate-600">
                        {grupo.banco && (
                          <div>
                            <span className="text-slate-400">Banco:</span> {grupo.banco}
                          </div>
                        )}
                        {grupo.clabe && (
                          <div>
                            <span className="text-slate-400">CLABE:</span> {grupo.clabe}
                          </div>
                        )}
                        {grupo.numeroCuenta && (
                          <div>
                            <span className="text-slate-400">Cuenta:</span> {grupo.numeroCuenta}
                          </div>
                        )}
                        {!grupo.banco && !grupo.clabe && !grupo.numeroCuenta && (
                          <div className="font-medium text-amber-600">
                            ⚠️ Faltan datos bancarios
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenModal(corteData.corte, grupo)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 focus:outline-none"
                  >
                    <FileUp className="h-4 w-4" />
                    Marcar Pagado
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Modal para subir comprobante */}
      {isModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleCloseModal}
          />

          <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl border border-slate-200/50 bg-white/90 shadow-2xl backdrop-blur-xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-200/50 bg-white/50 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Registrar Pago</h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 transition-colors hover:text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-1 text-sm text-slate-500">Beneficiario</div>
                  <div className="font-semibold text-slate-900">{selectedGroup.nombre}</div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="text-sm text-slate-600">Total a pagar:</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatMoney(selectedGroup.totalMonto)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Fecha de Pago
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Calendar className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="date"
                        required
                        value={fechaPago}
                        onChange={(e) => setFechaPago(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 py-2 pr-3 pl-10 transition-shadow focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Comprobante
                    </label>
                    <div className="mt-1 flex justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/50 px-6 pt-5 pb-6 transition-colors hover:bg-slate-50">
                      <div className="space-y-1 text-center">
                        <FileUp className="mx-auto h-10 w-10 text-slate-400" />
                        <div className="flex justify-center text-sm text-slate-600">
                          <label className="relative cursor-pointer rounded-md bg-transparent font-medium text-blue-600 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:outline-none hover:text-blue-500">
                            <span>Subir un archivo</span>
                            <input
                              type="file"
                              className="sr-only"
                              accept=".pdf,.jpg,.jpeg,.png"
                              required
                              onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-slate-500">PDF, PNG, JPG hasta 20MB</p>
                        {file && (
                          <div className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">
                            {file.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !file}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Guardando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
