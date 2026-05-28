import { Fragment } from 'react'
import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { db } from '@/lib/db'
import {
  comisionesCalculadas,
  ventasBmcorp,
  dispersiones,
  afiliados,
  users,
  ventasPagoCorte,
  cortesDispersion,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, isNull, sql, not } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react'
import { RecalcularBoton } from '@/components/comisiones/recalcular-boton'
import { VentaEditForm } from '@/components/ventas/venta-edit-form'
import { RegistrarAbonoForm } from '@/components/ventas/registrar-abono-form'
import { getCortesBorradorAction, getProximosDiasCorte } from '@/app/actions/cortes'

export default async function VentaDetalle({
  params,
}: {
  params: Promise<{ empresaId: string; ventaId: string }>
}) {
  const { empresaId, ventaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'ventas')
  const tenantId = user.tenantId!

  const data = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [venta] = await tx
      .select({
        venta: ventasBmcorp,
        afiliado: afiliados.nombre,
        editorNombre: users.name,
      })
      .from(ventasBmcorp)
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .leftJoin(users, eq(ventasBmcorp.editadoPor, users.id))
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))
      .limit(1)
    if (!venta) return null
    const [comision] = await tx
      .select()
      .from(comisionesCalculadas)
      .where(
        and(eq(comisionesCalculadas.tenantId, tenantId), eq(comisionesCalculadas.ventaId, ventaId)),
      )
      .limit(1)
    const lines = comision
      ? await tx
          .select()
          .from(dispersiones)
          .where(
            and(
              eq(dispersiones.tenantId, tenantId),
              eq(dispersiones.comisionId, comision.id),
              // Solo mostrar las dispersiones "padre" (con corteId nulo) para evitar duplicados en desglose general
              isNull(dispersiones.corteId),
            ),
          )
          .orderBy(dispersiones.tipoBeneficiario)
      : []
    const pagosCorte = await tx
      .select({
        pago: ventasPagoCorte,
        corte: cortesDispersion,
      })
      .from(ventasPagoCorte)
      .innerJoin(cortesDispersion, eq(ventasPagoCorte.corteId, cortesDispersion.id))
      .where(and(eq(ventasPagoCorte.tenantId, tenantId), eq(ventasPagoCorte.ventaId, ventaId)))
      .orderBy(cortesDispersion.fechaCorte)

    const childDispersiones = comision
      ? await tx
          .select()
          .from(dispersiones)
          .where(
            and(
              eq(dispersiones.tenantId, tenantId),
              eq(dispersiones.comisionId, comision.id),
              // Solo mostrar dispersiones "hijas" (asociadas a un corte)
              not(isNull(dispersiones.corteId)),
            ),
          )
          .orderBy(dispersiones.tipoBeneficiario)
      : []

    return {
      venta: venta.venta,
      afiliadoNombre: venta.afiliado,
      editorNombre: venta.editorNombre,
      comision,
      lines,
      pagosCorte,
      childDispersiones,
    }
  })

  if (!data) notFound()
  const { venta, afiliadoNombre, editorNombre, comision, lines, pagosCorte, childDispersiones } =
    data
  const fmt = (n: string | number) =>
    Number(n).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  // Avance de cobro: solo cuenta lo de cortes YA APROBADOS (no borrador/revisión).
  const totalPagadoCliente = pagosCorte
    .filter((p) => p.corte.estado === 'APROBADO')
    .reduce((s, p) => s + Number(p.pago.montoPagadoCliente), 0)
  const pctPagadoCliente =
    Number(venta.monto) > 0 ? (totalPagadoCliente / Number(venta.monto)) * 100 : 0

  // Avance de comisiones: dispersiones ya autorizadas (aprobadas en corte) sobre la comisión bruta.
  // AUTORIZADA cuenta como "se va a pagar" — sin gate de marcar entregado.
  const ESTADOS_AUTORIZADOS = ['AUTORIZADA', 'PARCIAL', 'PAGADO']
  const comisionAutorizada = childDispersiones
    .filter((d) => ESTADOS_AUTORIZADOS.includes(d.estado))
    .reduce((s, d) => s + Number(d.montoTotal), 0)
  const comisionBruta = comision ? Number(comision.comisionBrutaTotal) : 0
  const pctComisionAutorizada = comisionBruta > 0 ? (comisionAutorizada / comisionBruta) * 100 : 0

  // Abono solo tiene sentido si hay comisión calculada (con config) que dispersar.
  const puedeAbonar = Boolean(comision) && !comision?.sinConfig
  const cortesBorradorRes = puedeAbonar ? await getCortesBorradorAction(empresaId) : null
  const cortesBorrador = cortesBorradorRes?.ok ? cortesBorradorRes.data : []
  const proximosDias = puedeAbonar ? await getProximosDiasCorte() : { lunes: '', jueves: '' }

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/ventas`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a ventas
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">{venta.cliente}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {afiliadoNombre ?? 'Sin alianza'} · {venta.asesor ?? 'sin asesor'} ·{' '}
            {venta.loteAcciones ? `Lote ${venta.loteAcciones}` : 'Terreno'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO'].includes(venta.estadoVenta) && (
            <RecalcularBoton empresaId={empresaId} ventaId={ventaId} />
          )}
        </div>
      </div>

      <VentaEditForm
        empresaId={empresaId}
        venta={{
          id: venta.id,
          cliente: venta.cliente,
          estadoVenta: venta.estadoVenta,
          fechaApertura: venta.fechaApertura,
          fechaCierre: venta.fechaCierre,
          monto: String(venta.monto),
          enganche: venta.enganche ? String(venta.enganche) : null,
          loteAcciones: venta.loteAcciones,
          asesor: venta.asesor,
          notasInternas: venta.notasInternas,
          editadoEnSistema: venta.editadoEnSistema,
          editadoPorNombre: editorNombre,
          editadoEn: venta.editadoEn ? venta.editadoEn.toISOString() : null,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Monto venta" value={fmt(venta.monto)} />
        <Card label="Enganche pagado" value={fmt(venta.enganche ?? '0')} />
        <Card label="Cobrado (aprobado)" value={fmt(totalPagadoCliente)} accent />
        <Card label="Avance de cobro" value={`${pctPagadoCliente.toFixed(2)}%`} />
      </div>

      {!comision ? (
        ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO'].includes(venta.estadoVenta) ? (
          <div className="bg-card border-warning/40 text-warning rounded-lg border p-4 text-sm">
            Sin comisión calculada. Click <RefreshCw className="inline h-3 w-3" /> Recalcular
            arriba.
          </div>
        ) : (
          <div className="bg-card text-muted-foreground rounded-lg border p-4 text-sm">
            La venta está en estado <strong>{venta.estadoVenta}</strong> y no ha cerrado. Las
            comisiones se calculan automáticamente cuando la venta se finaliza.
          </div>
        )
      ) : comision.sinConfig ? (
        <div className="border-warning/40 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Comisión calculada como SIN_CONFIG porque la alianza no tiene matriz configurada para
            este tipo de producto ({comision.tipoProducto}). Configura matriz en{' '}
            <Link href={`/empresa/${empresaId}/comisiones/alianzas`} className="underline">
              Alianzas
            </Link>{' '}
            y recalcula.
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="Liberable" value={fmt(comision.montoLiberable)} accent />
            <Card label="Diferido" value={fmt(comision.montoDiferido)} />
            <Card label="Tipo producto" value={comision.tipoProducto} />
            <Card label="Comisión autorizada" value={fmt(comisionAutorizada)} accent />
            <Card label="% comisión pagada" value={`${pctComisionAutorizada.toFixed(2)}%`} />
          </div>

          <div className="bg-card overflow-hidden rounded-lg border">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Distribución de Comisiones</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Resumen de cómo se divide la comisión de esta venta. El detalle de pagos, diferidos
                y beneficiarios se gestiona en Tesorería.
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Concepto</th>
                  <th className="px-4 py-2 text-right font-medium">% de la Venta</th>
                  <th className="px-4 py-2 text-right font-medium">Monto Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { concepto: 'Operativa BM Corp', monto: Number(comision.montoOpBmcorp) },
                  { concepto: 'Operativa YESYUCAN', monto: Number(comision.montoOpYesyucan) },
                  { concepto: 'Afiliación / Alianza', monto: Number(comision.montoLiderSaldo) },
                  { concepto: 'Asesor (Cobro directo)', monto: Number(comision.montoAsesor) },
                  {
                    concepto: 'Bolsa Comercial Socios',
                    monto:
                      Number(comision.montoSocioBolsaJorge) +
                      Number(comision.montoSocioBolsaKass) +
                      Number(comision.montoSocioBolsaDiana),
                  },
                  {
                    concepto: 'Socios Fijos',
                    monto:
                      Number(comision.montoSocioFijoJorge) + Number(comision.montoSocioFijoKass),
                  },
                ]
                  .filter((item) => item.monto > 0)
                  .map((item, idx) => {
                    const pct =
                      Number(venta.monto) > 0 ? (item.monto / Number(venta.monto)) * 100 : 0
                    return (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-medium">{item.concepto}</td>
                        <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                          {pct.toFixed(1).replace('.0', '')}%
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {fmt(item.monto)}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot className="bg-muted/10 font-semibold">
                <tr>
                  <td className="px-4 py-3 text-left">
                    Total de Comisiones ({((comisionBruta / Number(venta.monto)) * 100).toFixed(0)}
                    %)
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums"></td>
                  <td className="text-primary px-4 py-3 text-right tabular-nums">
                    {fmt(comisionBruta)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-3">
            <p className="text-foreground text-sm font-semibold">Abonos del cliente</p>
            <RegistrarAbonoForm
              empresaId={empresaId}
              ventaId={ventaId}
              montoVenta={Number(venta.monto)}
              cortesBorrador={cortesBorrador}
              proximosDias={proximosDias}
              engancheSugerido={Number(venta.enganche ?? 0)}
              esPrimerAbono={pagosCorte.length === 0}
            />
          </div>

          {pagosCorte.length > 0 && (
            <div className="bg-card overflow-hidden rounded-lg border">
              <h2 className="border-b px-4 py-2 text-sm font-semibold">
                Historial de pagos registrados en cortes ({pagosCorte.length} abonos)
              </h2>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Fecha corte</th>
                    <th className="px-3 py-2 text-left font-medium">Día</th>
                    <th className="px-3 py-2 text-right font-medium">Abono cliente</th>
                    <th className="px-3 py-2 text-right font-medium">% del total</th>
                    <th className="px-3 py-2 text-right font-medium">Monto a dispersar</th>
                    <th className="px-3 py-2 text-center font-medium">Estado corte</th>
                    <th className="px-3 py-2 text-left font-medium">Notas Joana</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pagosCorte.map(({ pago, corte }) => {
                    const estadoMap: Record<string, string> = {
                      BORRADOR: 'bg-muted text-muted-foreground',
                      EN_REVISION: 'bg-purple-100 text-purple-800',
                      APROBADO: 'bg-emerald-100 text-emerald-800',
                      RECHAZADO: 'bg-rose-100 text-rose-800',
                    }
                    const dispsDeEstePago = childDispersiones.filter(
                      (d) => d.pagoCorteId === pago.id,
                    )

                    return (
                      <Fragment key={pago.id}>
                        <tr className="hover:bg-muted/10 transition-colors">
                          <td className="px-3 py-2 font-mono text-xs">
                            <Link
                              href={`/empresa/${empresaId}/comisiones/cortes/${corte.id}`}
                              className="text-primary font-semibold hover:underline"
                            >
                              {corte.fechaCorte}
                            </Link>
                          </td>
                          <td className="text-muted-foreground px-3 py-2 text-xs">
                            {corte.tipoDia}
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {fmt(pago.montoPagadoCliente)}
                          </td>
                          <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                            {Number(pago.porcentajePagado).toFixed(2)}%
                          </td>
                          <td className="text-success px-3 py-2 text-right font-semibold tabular-nums">
                            {fmt(pago.montoADispersar)}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            <span
                              className={`rounded-full px-2 py-0.5 font-medium ${estadoMap[corte.estado] ?? 'bg-muted'}`}
                            >
                              {corte.estado}
                            </span>
                          </td>
                          <td className="text-muted-foreground max-w-[200px] truncate px-3 py-2 text-xs">
                            {pago.notasJoana ?? '—'}
                          </td>
                        </tr>
                        {dispsDeEstePago.length > 0 && (
                          <tr className="bg-muted/10">
                            <td
                              colSpan={7}
                              className="border-primary/40 bg-muted/20 border-l-2 px-6 py-2"
                            >
                              <div className="flex flex-col gap-1 py-1">
                                <span className="text-primary text-[10px] font-bold tracking-wider uppercase">
                                  Comisiones dispersadas por este abono ({dispsDeEstePago.length}{' '}
                                  beneficiarios):
                                </span>
                                <div className="mt-1.5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                                  {dispsDeEstePago.map((cd) => (
                                    <div
                                      key={cd.id}
                                      className="bg-card flex flex-col justify-between rounded-md border p-2 text-xs shadow-sm"
                                    >
                                      <div>
                                        <span
                                          className="text-foreground block truncate font-semibold"
                                          title={cd.beneficiarioNombre}
                                        >
                                          {cd.beneficiarioNombre}
                                        </span>
                                        <span className="text-muted-foreground block text-[10px] font-medium uppercase">
                                          {cd.tipoBeneficiario
                                            .replace('SOCIO_BOLSA_', 'Socio ')
                                            .replace('SOCIO_FIJO_', 'Socio ')
                                            .replace('LIDER_SALDO', 'Líder')}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex items-center justify-between border-t pt-1.5">
                                        <span className="text-foreground font-bold tabular-nums">
                                          {fmt(cd.montoTotal)}
                                        </span>
                                        <span
                                          className={`rounded px-1.5 text-[9px] font-bold uppercase ${
                                            cd.estado === 'AUTORIZADA'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : cd.estado === 'EN_REVISION'
                                                ? 'bg-purple-100 text-purple-800'
                                                : cd.estado === 'PAGADO'
                                                  ? 'bg-jade-100 text-jade-800'
                                                  : 'bg-muted text-muted-foreground'
                                          }`}
                                        >
                                          {cd.estado}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}
      >
        {value}
      </p>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDIENTE: 'bg-muted text-muted-foreground',
    EN_REVISION: 'bg-purple-100 text-purple-800',
    AUTORIZADA: 'bg-emerald-100 text-emerald-800',
    PARCIAL: 'bg-amber-100 text-amber-800',
    PAGADO: 'bg-jade-100 text-jade-800',
    DIFERIDO: 'bg-blue-100 text-blue-800',
  }
  return <span className={`rounded-full px-2 py-0.5 ${map[estado] ?? 'bg-muted'}`}>{estado}</span>
}
