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
  desarrollos,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, isNull, sql, not } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react'
import { RecalcularBoton } from '@/components/comisiones/recalcular-boton'
import { VentaEditForm } from '@/components/ventas/venta-edit-form'
import { RegistrarAbonoForm } from '@/components/ventas/registrar-abono-form'
import { HistorialAbonos } from '@/components/ventas/historial-abonos'
import { ComisionDesglose } from '@/components/ventas/comision-desglose'
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
        desarrolladora: desarrollos.desarrolladora,
      })
      .from(ventasBmcorp)
      .leftJoin(afiliados, eq(ventasBmcorp.afiliadoId, afiliados.id))
      .leftJoin(users, eq(ventasBmcorp.editadoPor, users.id))
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
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
      desarrolladora: venta.desarrolladora,
      comision,
      lines,
      pagosCorte,
      childDispersiones,
    }
  })

  if (!data) notFound()
  const {
    venta,
    afiliadoNombre,
    editorNombre,
    desarrolladora,
    comision,
    lines,
    pagosCorte,
    childDispersiones,
  } = data

  // Tipo detectado automáticamente (para mostrar en el form)
  const { detectarTipoProductoPorDesarrolladora, detectarTipoProducto } =
    await import('@/lib/services/comisiones/esquema-selector')
  const tipoProductoDetectado = desarrolladora
    ? detectarTipoProductoPorDesarrolladora(desarrolladora)
    : detectarTipoProducto(venta)
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

  // Agrega montoPagado REAL por tipo desde hija dispersiones (padre siempre tiene 0).
  // Joana puede pagar en cualquier orden — lo que importa es la suma acumulada.
  const pagadoPorTipo = new Map<string, number>()
  for (const d of childDispersiones) {
    if (Number(d.montoPagado) > 0) {
      const prev = pagadoPorTipo.get(d.tipoBeneficiario) ?? 0
      pagadoPorTipo.set(d.tipoBeneficiario, prev + Number(d.montoPagado))
    }
  }
  // Estado derivado por tipo — 4 estados:
  // DIFERIDO   = sin fondos del cliente asignados (esperando próximo pago)
  // AUTORIZADA = en corte aprobado, tesorería debe marcar pagado
  // PARCIAL    = pagado algo, falta el resto
  // PAGADO     = completamente pagado y entregado
  const estadoPorTipo = (tipo: string, montoTotal: number): string => {
    const pagado = pagadoPorTipo.get(tipo) ?? 0
    if (pagado >= montoTotal - 0.01) return 'PAGADO'
    if (pagado > 0) return 'PARCIAL'
    // Tiene hija con monto > 0 en corte aprobado → AUTORIZADA
    const tieneAutorizada = childDispersiones.some(
      (d) =>
        d.tipoBeneficiario === tipo &&
        Number(d.montoTotal) > 0 &&
        ['AUTORIZADA', 'PARCIAL'].includes(d.estado),
    )
    if (tieneAutorizada) return 'AUTORIZADA'
    // Todo lo demás: sin fondos asignados → DIFERIDO
    return 'DIFERIDO'
  }

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
          tipoProductoDetectado,
          tipoProductoOverride: venta.tipoProductoOverride,
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
          {/* Resumen comisión — englobado. El desglose se gestiona en Comisiones → Corte */}
          <div className="bg-card overflow-hidden rounded-xl border">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Comisión total calculada
                </p>
                <p className="text-foreground mt-1 text-2xl font-bold tabular-nums">
                  {fmt(comisionBruta)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {((comisionBruta / Number(venta.monto)) * 100).toFixed(1)}% de la venta ·{' '}
                  {comision.tipoProducto}
                </p>
              </div>
              <div className="min-w-[160px]">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cubierto en cortes</span>
                  <span className="font-semibold">{pctComisionAutorizada.toFixed(1)}%</span>
                </div>
                <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, pctComisionAutorizada)}%` }}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-right text-xs tabular-nums">
                  {fmt(comisionAutorizada)} / {fmt(comisionBruta)}
                </p>
              </div>
            </div>
            {lines.length > 0 && (
              <ComisionDesglose
                comisionBruta={comisionBruta}
                porcentajeTotalAplicado={String(comision.porcentajeTotalAplicado)}
                lines={lines.map((d) => {
                  const montoVentaSnap = Number(comision.montoVenta)
                  const pct =
                    montoVentaSnap > 0
                      ? ((Number(d.montoTotal) / montoVentaSnap) * 100).toFixed(2)
                      : '0.00'
                  return {
                    id: d.id,
                    tipoBeneficiario: d.tipoBeneficiario,
                    beneficiarioNombre: d.beneficiarioNombre,
                    montoTotal: d.montoTotal,
                    pct,
                    estado: estadoPorTipo(d.tipoBeneficiario, Number(d.montoTotal)),
                  }
                })}
              />
            )}
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
            <HistorialAbonos
              empresaId={empresaId}
              lineasPlan={lines.map((d) => {
                const pagadoReal = pagadoPorTipo.get(d.tipoBeneficiario) ?? 0
                return {
                  id: d.id,
                  tipoBeneficiario: d.tipoBeneficiario,
                  beneficiarioNombre: d.beneficiarioNombre,
                  montoTotal: d.montoTotal,
                  montoPagado: String(pagadoReal),
                  estado: estadoPorTipo(d.tipoBeneficiario, Number(d.montoTotal)),
                }
              })}
              pagos={pagosCorte.map(({ pago, corte }) => ({
                pago: {
                  id: pago.id,
                  montoPagadoCliente: pago.montoPagadoCliente,
                  porcentajePagado: pago.porcentajePagado,
                  montoADispersar: pago.montoADispersar,
                  notasJoana: pago.notasJoana,
                  dispersiones: childDispersiones
                    .filter((d) => d.pagoCorteId === pago.id && Number(d.montoTotal) > 0)
                    .map((d) => ({
                      id: d.id,
                      tipoBeneficiario: d.tipoBeneficiario,
                      beneficiarioNombre: d.beneficiarioNombre,
                      montoTotal: d.montoTotal,
                      montoPagado: d.montoPagado,
                      estado: d.estado,
                    })),
                },
                corte: {
                  id: corte.id,
                  fechaCorte: corte.fechaCorte,
                  tipoDia: corte.tipoDia,
                  estado: corte.estado,
                },
              }))}
            />
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
