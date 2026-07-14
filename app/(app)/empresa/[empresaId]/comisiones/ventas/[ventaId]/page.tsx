import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import {
  comisionesCalculadas,
  ventasBmcorp,
  dispersiones,
  afiliados,
  desarrollos,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, isNull } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { RecalcularBoton } from '@/components/comisiones/recalcular-boton'

export const metadata = { title: 'Detalle de Venta · Comisiones' }

const fmt = (n: string | number) =>
  Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const pct = (monto: string | number, total: string | number) => {
  const t = Number(total)
  if (!t) return '—'
  return ((Number(monto) / t) * 100).toFixed(1) + '%'
}

export default async function VentaDetalle({
  params,
}: {
  params: Promise<{ empresaId: string; ventaId: string }>
}) {
  const { empresaId, ventaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const data = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    const [row] = await tx
      .select({
        venta: ventasBmcorp,
        afiliadoNombre: afiliados.nombre,
        desarrolloNombre: desarrollos.nombre,
      })
      .from(ventasBmcorp)
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))
      .limit(1)

    if (!row) return null

    const [comision] = await tx
      .select()
      .from(comisionesCalculadas)
      .where(
        and(eq(comisionesCalculadas.tenantId, tenantId), eq(comisionesCalculadas.ventaId, ventaId)),
      )
      .limit(1)

    // Solo dispersiones BASE (pagoCorteId IS NULL) — evita duplicados por corte
    const lines = comision
      ? await tx
          .select()
          .from(dispersiones)
          .where(
            and(
              eq(dispersiones.tenantId, tenantId),
              eq(dispersiones.comisionId, comision.id),
              isNull(dispersiones.pagoCorteId),
            ),
          )
          .orderBy(dispersiones.tipoBeneficiario)
      : []

    return {
      venta: row.venta,
      afiliadoNombre: row.afiliadoNombre,
      desarrolloNombre: row.desarrolloNombre,
      comision,
      lines,
    }
  })

  if (!data) notFound()
  const { venta, afiliadoNombre, desarrolloNombre, comision, lines } = data

  // Lookup helpers from dispersiones by tipo
  const byTipo = (tipo: string) => lines.find((l) => l.tipoBeneficiario === tipo)

  // Build cascada rows from snapshot fields in comisionesCalculadas
  const cascadaRows = comision
    ? [
        {
          concepto: 'Op. BM Corp',
          beneficiario: byTipo('OP_BMCORP')?.beneficiarioNombre ?? 'BM Corp',
          monto: comision.montoOpBmcorp,
          tipo: 'OP_BMCORP',
        },
        {
          concepto: 'Op. Yesyucan',
          beneficiario: byTipo('OP_YESYUCAN')?.beneficiarioNombre ?? 'Yesyucan',
          monto: comision.montoOpYesyucan,
          tipo: 'OP_YESYUCAN',
        },
        {
          concepto: 'Asesor',
          beneficiario: byTipo('ASESOR')?.beneficiarioNombre ?? venta.asesor ?? '—',
          monto: comision.montoAsesor,
          tipo: 'ASESOR',
        },
        {
          concepto: 'Afiliación',
          beneficiario: byTipo('LIDER_SALDO')?.beneficiarioNombre ?? afiliadoNombre ?? '—',
          monto: comision.montoLiderSaldo,
          tipo: 'LIDER_SALDO',
          alianza: afiliadoNombre,
        },
        {
          concepto: 'Fijo Jorge',
          beneficiario: byTipo('SOCIO_FIJO_JORGE')?.beneficiarioNombre ?? 'Jorge',
          monto: comision.montoSocioFijoJorge,
          tipo: 'SOCIO_FIJO_JORGE',
        },
        {
          concepto: 'Fijo Kass',
          beneficiario: byTipo('SOCIO_FIJO_KASS')?.beneficiarioNombre ?? 'Kass',
          monto: comision.montoSocioFijoKass,
          tipo: 'SOCIO_FIJO_KASS',
        },
        {
          concepto: 'Bolsa Jorge',
          beneficiario: byTipo('SOCIO_BOLSA_JORGE')?.beneficiarioNombre ?? 'Jorge',
          monto: comision.montoSocioBolsaJorge,
          tipo: 'SOCIO_BOLSA_JORGE',
        },
        {
          concepto: 'Bolsa Kass',
          beneficiario: byTipo('SOCIO_BOLSA_KASS')?.beneficiarioNombre ?? 'Kass',
          monto: comision.montoSocioBolsaKass,
          tipo: 'SOCIO_BOLSA_KASS',
        },
        {
          concepto: 'Bolsa Diana',
          beneficiario: byTipo('SOCIO_BOLSA_DIANA')?.beneficiarioNombre ?? 'Diana',
          monto: comision.montoSocioBolsaDiana,
          tipo: 'SOCIO_BOLSA_DIANA',
        },
      ]
    : []

  const ESTADO_MAP: Record<string, { label: string; cls: string }> = {
    PENDIENTE: {
      label: 'Pendiente',
      cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    },
    PARCIAL: {
      label: 'Parcial',
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    },
    PAGADO: {
      label: 'Pagado',
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    },
    DIFERIDO: {
      label: 'Diferido',
      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    },
    AUTORIZADA: {
      label: 'Autorizado',
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    },
  }

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/comisiones/ventas`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a ventas
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">{venta.cliente}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {desarrolloNombre && <span>{desarrolloNombre} · </span>}
            {venta.loteAcciones ? `Lote ${venta.loteAcciones}` : 'Terreno'}
            {afiliadoNombre && <span> · Alianza: {afiliadoNombre}</span>}
            {venta.asesor && <span> · Asesor: {venta.asesor}</span>}
          </p>
        </div>
        <RecalcularBoton empresaId={empresaId} ventaId={ventaId} />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Monto venta" value={fmt(venta.monto)} />
        <Card label="Enganche pagado" value={fmt(venta.enganche ?? '0')} />
        <Card
          label={`Comisión bruta (${comision ? comision.porcentajeTotalAplicado : '—'}%)`}
          value={comision ? fmt(comision.comisionBrutaTotal) : '—'}
          accent="primary"
        />
        <Card
          label="Estado venta"
          value={venta.estadoVenta ?? '—'}
          accent={
            venta.estadoVenta === 'FINALIZADO_Y_LIQUIDADO'
              ? 'success'
              : venta.estadoVenta === 'FINALIZADA'
                ? 'warning'
                : 'primary'
          }
        />
      </div>

      {/* Sin comisión */}
      {!comision ? (
        <div className="bg-card flex items-center gap-2 rounded-lg border border-amber-300/60 p-4 text-sm text-amber-700 dark:text-amber-400">
          <RefreshCw className="h-4 w-4 shrink-0" />
          Sin comisión calculada — usa el botón Recalcular.
        </div>
      ) : (
        <>
          {/* Aviso sinConfig — como banner, no bloquea las tablas */}
          {comision.sinConfig && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Alianza sin matriz configurada para {comision.tipoProducto} — los montos aparecen en
                cero.{' '}
                <Link href={`/empresa/${empresaId}/comisiones/alianzas`} className="underline">
                  Configurar alianzas →
                </Link>{' '}
                y luego Recalcular.
              </div>
            </div>
          )}

          {/* Liberable / Diferido */}
          {!comision.sinConfig && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card label="Liberable" value={fmt(comision.montoLiberable)} accent="success" />
              <Card label="Diferido" value={fmt(comision.montoDiferido)} accent="warning" />
            </div>
          )}

          {/* Cascada de comisión — desglose por concepto */}
          <div className="bg-card overflow-hidden rounded-xl border border-slate-200/80 shadow-sm dark:border-slate-800/80">
            <div className="border-b bg-slate-50/60 px-4 py-3 dark:bg-slate-900/40">
              <h2 className="text-foreground text-sm font-bold">Cascada de comisión</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Desglose completo del {comision.porcentajeTotalAplicado}% · tipo{' '}
                {comision.tipoProducto}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b bg-slate-100/50 text-left text-[10px] font-semibold tracking-wider uppercase dark:bg-slate-900/50">
                    <th className="px-4 py-2.5">Concepto</th>
                    <th className="px-4 py-2.5">Beneficiario</th>
                    <th className="px-4 py-2.5 text-right">% comisión</th>
                    <th className="px-4 py-2.5 text-right">Monto total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cascadaRows.map((row) => {
                    const esAfiliacion = row.tipo === 'LIDER_SALDO'
                    const montoNum = Number(row.monto)
                    const esCero = montoNum === 0
                    return (
                      <tr
                        key={row.tipo}
                        className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/20 ${esCero ? 'opacity-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`font-medium ${esAfiliacion ? 'text-indigo-700 dark:text-indigo-400' : 'text-foreground'}`}
                          >
                            {row.concepto}
                          </span>
                          {esAfiliacion && row.alianza && (
                            <span className="ml-2 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                              {row.alianza}
                            </span>
                          )}
                        </td>
                        <td className="text-muted-foreground px-4 py-3">{row.beneficiario}</td>
                        <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                          {pct(row.monto, comision.comisionBrutaTotal)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${esAfiliacion ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground'}`}
                        >
                          {fmt(row.monto)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
                  <tr>
                    <td
                      colSpan={2}
                      className="text-muted-foreground px-4 py-3 text-[10px] font-bold tracking-wider uppercase"
                    >
                      Total comisión bruta
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right text-xs font-semibold tabular-nums">
                      100.0%
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                      {fmt(comision.comisionBrutaTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Estado de pagos por beneficiario */}
          {lines.length > 0 && (
            <div className="bg-card overflow-hidden rounded-xl border border-slate-200/80 shadow-sm dark:border-slate-800/80">
              <div className="border-b bg-slate-50/60 px-4 py-3 dark:bg-slate-900/40">
                <h2 className="text-foreground text-sm font-bold">Estado de pagos</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Seguimiento de pagado vs. diferido por beneficiario
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b bg-slate-100/50 text-left text-[10px] font-semibold tracking-wider uppercase dark:bg-slate-900/50">
                      <th className="px-4 py-2.5">Concepto</th>
                      <th className="hidden px-4 py-2.5 sm:table-cell">Beneficiario</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                      <th className="px-4 py-2.5 text-right">Pagado</th>
                      <th className="hidden px-4 py-2.5 text-right sm:table-cell">Diferido</th>
                      <th className="px-4 py-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lines.map((l) => {
                      const estadoInfo = ESTADO_MAP[l.estado] ?? {
                        label: l.estado,
                        cls: 'bg-slate-100 text-slate-600',
                      }
                      const conceptoLabel =
                        CONCEPTO_LABELS[l.tipoBeneficiario] ?? l.tipoBeneficiario
                      const esAfiliacion = l.tipoBeneficiario === 'LIDER_SALDO'
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/20">
                          <td className="px-4 py-3">
                            <span
                              className={`font-medium ${esAfiliacion ? 'text-indigo-700 dark:text-indigo-400' : 'text-foreground'}`}
                            >
                              {conceptoLabel}
                            </span>
                            {esAfiliacion && afiliadoNombre && (
                              <span className="ml-2 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                {afiliadoNombre}
                              </span>
                            )}
                            {l.acumulaMensual && (
                              <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                Acumula
                              </span>
                            )}
                          </td>
                          <td className="text-muted-foreground hidden px-4 py-3 sm:table-cell">
                            {l.beneficiarioNombre}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {fmt(l.montoTotal)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 tabular-nums dark:text-emerald-400">
                            {fmt(l.montoPagado)}
                          </td>
                          <td className="text-muted-foreground hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                            {fmt(l.montoDiferido)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${estadoInfo.cls}`}
                            >
                              {estadoInfo.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
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

function Card({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'primary' | 'success' | 'warning'
}) {
  const styles: Record<string, string> = {
    success: 'text-emerald-600 dark:text-emerald-400',
    primary: 'text-primary',
    warning: 'text-amber-600 dark:text-amber-400',
  }
  const valueStyle = accent ? (styles[accent] ?? 'text-foreground') : 'text-foreground'

  return (
    <div className="bg-card rounded-xl border border-slate-200/80 p-4 shadow-sm dark:border-slate-800/80">
      <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${valueStyle}`}>{value}</p>
    </div>
  )
}
