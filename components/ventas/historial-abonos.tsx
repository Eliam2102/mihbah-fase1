'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'

const TIPO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Op. BM Corp',
  OP_YESYUCAN: 'Op. YESYUCAN',
  ASESOR: 'Asesor (directo)',
  LIDER_SALDO: 'Líder (Afiliación)',
  SOCIO_BOLSA_JORGE: 'Socio bolsa — Jorge',
  SOCIO_BOLSA_KASS: 'Socio bolsa — Kass',
  SOCIO_BOLSA_DIANA: 'Socio bolsa — Diana',
  SOCIO_FIJO_JORGE: 'Socio fijo — Jorge',
  SOCIO_FIJO_KASS: 'Socio fijo — Kass',
}

const ESTADO_COLORS: Record<string, string> = {
  // Corte estados
  BORRADOR: 'bg-muted text-muted-foreground',
  EN_REVISION: 'bg-purple-100 text-purple-800',
  APROBADO: 'bg-emerald-100 text-emerald-800',
  RECHAZADO: 'bg-rose-100 text-rose-800',
  // Dispersión estados — solo 4
  DIFERIDO: 'bg-slate-100 text-slate-500',
  AUTORIZADA: 'bg-blue-100 text-blue-700',
  PARCIAL: 'bg-amber-100 text-amber-700',
  PAGADO: 'bg-emerald-100 text-emerald-700',
}

interface DispersionAbono {
  id: string
  tipoBeneficiario: string
  beneficiarioNombre: string
  montoTotal: string
  montoPagado: string
  estado: string
}

interface PagoCorte {
  id: string
  montoPagadoCliente: string
  porcentajePagado: string
  montoADispersar: string
  notasJoana: string | null
  dispersiones: DispersionAbono[]
}

interface Corte {
  id: string
  fechaCorte: string
  tipoDia: string
  estado: string
}

interface DispersionPadre {
  id: string
  tipoBeneficiario: string
  beneficiarioNombre: string
  montoTotal: string
  montoPagado: string
  estado: string
}

interface Props {
  empresaId: string
  pagos: { pago: PagoCorte; corte: Corte }[]
  /** Dispersiones padre — plan total acumulado por beneficiario */
  lineasPlan: DispersionPadre[]
}

export function HistorialAbonos({ empresaId, pagos, lineasPlan }: Props) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [vistaDetalle, setVistaDetalle] = useState(false)

  const toggle = (id: string) =>
    setExpandidos((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const fmt = (n: string | number) =>
    Number(n).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    })

  // KPIs globales del plan
  const totalPlan = lineasPlan.reduce((s, d) => s + Number(d.montoTotal), 0)
  const totalPagadoPlan = lineasPlan.reduce((s, d) => s + Number(d.montoPagado), 0)
  const totalPendientePlan = Math.max(0, totalPlan - totalPagadoPlan)

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-semibold">Historial de abonos ({pagos.length})</h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${!vistaDetalle ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
          >
            Global
          </span>
          <button
            type="button"
            onClick={() => setVistaDetalle((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${vistaDetalle ? 'bg-primary' : 'bg-muted'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${vistaDetalle ? 'translate-x-4' : 'translate-x-1'}`}
            />
          </button>
          <span
            className={`text-xs ${vistaDetalle ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
          >
            Detallado
          </span>
        </div>
      </div>
      <div className="divide-y">
        {pagos.map(({ pago, corte }) => {
          const expanded = expandidos.has(pago.id)
          const tieneDesglose = pago.dispersiones.length > 0

          return (
            <div key={pago.id}>
              {/* Fila resumen del abono */}
              <div
                className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm transition-colors ${tieneDesglose ? 'hover:bg-muted/20 cursor-pointer' : ''}`}
                onClick={() => tieneDesglose && toggle(pago.id)}
              >
                {/* Toggle */}
                <div className="text-muted-foreground w-4 shrink-0">
                  {tieneDesglose ? (
                    expanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )
                  ) : null}
                </div>

                {/* Corte */}
                <div className="min-w-[120px] font-mono text-xs">
                  <Link
                    href={`/empresa/${empresaId}/comisiones/cortes/${corte.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary font-semibold hover:underline"
                  >
                    {corte.fechaCorte} {corte.tipoDia}
                  </Link>
                </div>

                {/* Abono cliente */}
                <div className="ml-auto flex flex-wrap items-center gap-4 text-right text-xs">
                  <div>
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      Abono cliente
                    </p>
                    <p className="font-semibold tabular-nums">{fmt(pago.montoPagadoCliente)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      % venta
                    </p>
                    <p className="tabular-nums">{Number(pago.porcentajePagado).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      Comisión
                    </p>
                    <p className="text-success font-semibold tabular-nums">
                      {fmt(pago.montoADispersar)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLORS[corte.estado] ?? 'bg-muted'}`}
                  >
                    {corte.estado}
                  </span>
                  {pago.notasJoana && (
                    <span className="text-muted-foreground max-w-[150px] truncate text-xs italic">
                      {pago.notasJoana}
                    </span>
                  )}
                </div>
              </div>

              {/* Desglose acumulado — global o detallado según switch */}
              {expanded && (
                <div className="bg-muted/10 border-t px-4 pt-2 pb-3">
                  {!vistaDetalle ? (
                    /* Vista global — resumen en 3 KPIs */
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-card rounded-lg border p-3 text-center">
                        <p className="text-muted-foreground mb-1 text-[10px] tracking-wide uppercase">
                          Total comisión
                        </p>
                        <p className="text-foreground text-sm font-bold tabular-nums">
                          {fmt(totalPlan)}
                        </p>
                      </div>
                      <div className="bg-card rounded-lg border p-3 text-center">
                        <p className="text-muted-foreground mb-1 text-[10px] tracking-wide uppercase">
                          Pagado
                        </p>
                        <p className="text-sm font-bold text-emerald-600 tabular-nums">
                          {fmt(totalPagadoPlan)}
                        </p>
                      </div>
                      <div className="bg-card rounded-lg border p-3 text-center">
                        <p className="text-muted-foreground mb-1 text-[10px] tracking-wide uppercase">
                          Pendiente
                        </p>
                        <p
                          className={`text-sm font-bold tabular-nums ${totalPendientePlan > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
                        >
                          {totalPendientePlan > 0 ? fmt(totalPendientePlan) : 'Saldado'}
                        </p>
                      </div>
                    </div>
                  ) : /* Vista detallada — línea por línea */
                  lineasPlan.length === 0 ? (
                    <p className="text-muted-foreground text-xs italic">Sin plan calculado aún.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground border-b text-left">
                          <th className="pb-1.5 font-medium">Beneficiario</th>
                          <th className="pb-1.5 font-medium">Tipo</th>
                          <th className="pb-1.5 text-right font-medium">Total comisión</th>
                          <th className="pb-1.5 text-right font-medium">Pagado</th>
                          <th className="pb-1.5 text-right font-medium">Pendiente</th>
                          <th className="pb-1.5 text-center font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-muted/30 divide-y">
                        {lineasPlan.map((d) => {
                          const total = Number(d.montoTotal)
                          const pagado = Number(d.montoPagado)
                          const pendiente = Math.max(0, total - pagado)
                          const pct = total > 0 ? (pagado / total) * 100 : 0
                          return (
                            <tr key={d.id} className="hover:bg-muted/10">
                              <td className="py-2 font-medium">{d.beneficiarioNombre}</td>
                              <td className="text-muted-foreground py-2">
                                {TIPO_LABELS[d.tipoBeneficiario] ?? d.tipoBeneficiario}
                              </td>
                              <td className="py-2 text-right tabular-nums">{fmt(total)}</td>
                              <td className="text-success py-2 text-right font-semibold tabular-nums">
                                {fmt(pagado)}
                              </td>
                              <td
                                className={`py-2 text-right font-semibold tabular-nums ${pendiente > 0 ? 'text-amber-600' : 'text-success'}`}
                              >
                                {pendiente > 0 ? fmt(pendiente) : 'Saldado'}
                              </td>
                              <td className="py-2 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_COLORS[d.estado] ?? 'bg-muted'}`}
                                  >
                                    {d.estado}
                                  </span>
                                  <div className="bg-muted h-1 w-16 overflow-hidden rounded-full">
                                    <div
                                      className="h-full rounded-full bg-emerald-500"
                                      style={{ width: `${Math.min(100, pct)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="border-t font-semibold">
                        <tr>
                          <td colSpan={2} className="pt-1.5 text-xs">
                            Total
                          </td>
                          <td className="pt-1.5 text-right tabular-nums">
                            {fmt(lineasPlan.reduce((s, d) => s + Number(d.montoTotal), 0))}
                          </td>
                          <td className="text-success pt-1.5 text-right tabular-nums">
                            {fmt(lineasPlan.reduce((s, d) => s + Number(d.montoPagado), 0))}
                          </td>
                          <td className="pt-1.5 text-right text-amber-600 tabular-nums">
                            {fmt(
                              lineasPlan.reduce(
                                (s, d) =>
                                  s + Math.max(0, Number(d.montoTotal) - Number(d.montoPagado)),
                                0,
                              ),
                            )}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
