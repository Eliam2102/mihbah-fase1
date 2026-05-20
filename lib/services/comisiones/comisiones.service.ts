/**
 * Servicio de comisiones — cálculo y persistencia.
 *
 * Orquesta:
 *   1. esquema-selector: resuelve esquema activo + matriz para una venta
 *   2. calculator (motor puro): aplica fórmulas del doc YESYUCAN v5
 *   3. Persistencia: upsert comisionesCalculadas + insert/update dispersiones
 *
 * Idempotente: misma venta procesada N veces produce 1 sola fila en
 * comisionesCalculadas y exactamente N tipos de dispersiones (1 por beneficiario).
 */

import { db } from '@/lib/db'
import { comisionesCalculadas, dispersiones, ventasBmcorp, auditLogs } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import {
  calcular,
  type CalculatorInput,
  type CalculatorOutput,
  type EsquemaConfig,
  type LineaDispersion,
  type MatrizConfig,
} from './calculator'
import { resolverParaVenta } from './esquema-selector'

export type Comision = typeof comisionesCalculadas.$inferSelect
export type Dispersion = typeof dispersiones.$inferSelect

export interface CalcularPersistirResult {
  comision: Comision
  dispersiones: Dispersion[]
  resultado: CalculatorOutput
}

// ─── Precálculo (sin persistir) ──────────────────────────────────────────────

export interface PrecalculoInput {
  montoVenta: number
  enganchePagado: number
  porcentajeEnganche?: number
  esquema: EsquemaConfig
  matriz: MatrizConfig | null
}

export function precalcularComision(input: PrecalculoInput): CalculatorOutput {
  return calcular(input as CalculatorInput)
}

// ─── Calcular y persistir (flujo principal) ──────────────────────────────────

export async function calcularYPersistirComision(
  tenantId: string,
  ventaId: string,
  opts: { esPrecalculo?: boolean; userId?: string } = {},
): Promise<CalcularPersistirResult | null> {
  const resolucion = await resolverParaVenta(tenantId, ventaId)
  if (!resolucion) {
    throw new Error(`Venta ${ventaId} no encontrada para tenant ${tenantId}`)
  }

  const {
    ventaRaw,
    esquema,
    matriz,
    esquemaRowId,
    matrizRowId,
    liderId: matrizLiderId,
  } = resolucion

  const montoVenta = Number(ventaRaw.monto ?? '0')
  const enganchePagado = Number(ventaRaw.enganche ?? '0')
  const porcentajeEnganche = montoVenta > 0 ? (enganchePagado / montoVenta) * 100 : 0

  const resultado = calcular({
    montoVenta,
    enganchePagado,
    porcentajeEnganche,
    esquema,
    matriz,
  })

  // Persistir en transacción única
  const persisted = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // Upsert comisionesCalculadas (unique por tenantId+ventaId)
    const comisionValues = {
      tenantId,
      ventaId,
      esquemaId: esquemaRowId,
      matrizId: matrizRowId,
      montoVenta: montoVenta.toFixed(2),
      tipoProducto: resolucion.tipoProducto,
      porcentajeTotalAplicado: esquema.porcentajeTotalCliente.toFixed(2),
      comisionBrutaTotal: resultado.comisionBrutaTotal.toFixed(2),
      montoOpBmcorp: resultado.montoOpBmcorp.toFixed(2),
      montoOpYesyucan: resultado.montoOpYesyucan.toFixed(2),
      montoSocioFijoJorge: resultado.montoSocioFijoJorge.toFixed(2),
      montoSocioFijoKass: resultado.montoSocioFijoKass.toFixed(2),
      montoBolsaComercial: resultado.montoBolsaComercial.toFixed(2),
      montoAsesor: resultado.montoAsesor.toFixed(2),
      montoLiderSaldo: resultado.montoLiderSaldo.toFixed(2),
      montoSocioBolsaJorge: resultado.montoSocioBolsaJorge.toFixed(2),
      montoSocioBolsaKass: resultado.montoSocioBolsaKass.toFixed(2),
      montoSocioBolsaDiana: resultado.montoSocioBolsaDiana.toFixed(2),
      enganchePagado: resultado.enganchePagado.toFixed(2),
      porcentajeEnganche: resultado.porcentajeEnganche.toFixed(2),
      montoLiberable: resultado.montoLiberable.toFixed(2),
      montoDiferido: resultado.montoDiferido.toFixed(2),
      esPrecalculo: opts.esPrecalculo ?? false,
      sinConfig: resultado.sinConfig,
    }

    const [comision] = await tx
      .insert(comisionesCalculadas)
      .values(comisionValues)
      .onConflictDoUpdate({
        target: [comisionesCalculadas.tenantId, comisionesCalculadas.ventaId],
        set: {
          esquemaId: comisionValues.esquemaId,
          matrizId: comisionValues.matrizId,
          montoVenta: comisionValues.montoVenta,
          tipoProducto: comisionValues.tipoProducto,
          porcentajeTotalAplicado: comisionValues.porcentajeTotalAplicado,
          comisionBrutaTotal: comisionValues.comisionBrutaTotal,
          montoOpBmcorp: comisionValues.montoOpBmcorp,
          montoOpYesyucan: comisionValues.montoOpYesyucan,
          montoSocioFijoJorge: comisionValues.montoSocioFijoJorge,
          montoSocioFijoKass: comisionValues.montoSocioFijoKass,
          montoBolsaComercial: comisionValues.montoBolsaComercial,
          montoAsesor: comisionValues.montoAsesor,
          montoLiderSaldo: comisionValues.montoLiderSaldo,
          montoSocioBolsaJorge: comisionValues.montoSocioBolsaJorge,
          montoSocioBolsaKass: comisionValues.montoSocioBolsaKass,
          montoSocioBolsaDiana: comisionValues.montoSocioBolsaDiana,
          enganchePagado: comisionValues.enganchePagado,
          porcentajeEnganche: comisionValues.porcentajeEnganche,
          montoLiberable: comisionValues.montoLiberable,
          montoDiferido: comisionValues.montoDiferido,
          esPrecalculo: comisionValues.esPrecalculo,
          sinConfig: comisionValues.sinConfig,
          updatedAt: new Date(),
        },
      })
      .returning()

    if (!comision) throw new Error('No se persistió comisión')

    // Sin matriz → no se crean dispersiones (motor retornó sinConfig=true)
    if (resultado.sinConfig || resultado.dispersiones.length === 0) {
      return { comision, dispersiones: [] as Dispersion[] }
    }

    // Upsert dispersiones (unique por comisionId+tipoBeneficiario)
    const dispersionRows: Dispersion[] = []
    for (const linea of resultado.dispersiones) {
      const estado = computeEstadoLinea(linea)
      const [row] = await tx
        .insert(dispersiones)
        .values({
          tenantId,
          comisionId: comision.id,
          liderId: shouldAttachLider(linea, matriz, matrizLiderId) ? matrizLiderId : null,
          tipoBeneficiario: linea.tipoBeneficiario,
          beneficiarioNombre: linea.beneficiarioNombre,
          montoTotal: linea.montoTotal.toFixed(2),
          montoPagado: '0',
          montoDiferido: linea.montoDiferido.toFixed(2),
          estado,
          acumulaMensual: linea.acumulaMensual,
        })
        .onConflictDoUpdate({
          target: [dispersiones.comisionId, dispersiones.tipoBeneficiario],
          set: {
            beneficiarioNombre: linea.beneficiarioNombre,
            montoTotal: linea.montoTotal.toFixed(2),
            montoDiferido: linea.montoDiferido.toFixed(2),
            estado: sql`CASE WHEN ${dispersiones.montoPagado} > 0 THEN 'PARCIAL'::estado_dispersion ELSE ${estado}::estado_dispersion END`,
            acumulaMensual: linea.acumulaMensual,
            updatedAt: new Date(),
          },
        })
        .returning()
      if (row) dispersionRows.push(row)
    }

    // Log de auditoría
    await tx.insert(auditLogs).values({
      tenantId,
      userId: opts.userId ?? null,
      accion: 'COMISION_CALCULADA',
      recursoTipo: 'comisiones_calculadas',
      recursoId: comision.id,
      cambios: {
        ventaId,
        montoVenta,
        enganchePagado,
        comisionBruta: resultado.comisionBrutaTotal,
        liberable: resultado.montoLiberable,
        diferido: resultado.montoDiferido,
        lineas: resultado.dispersiones.length,
        advertencias: resultado.advertencias,
      },
    })

    return { comision, dispersiones: dispersionRows }
  })

  return { ...persisted, resultado }
}

function computeEstadoLinea(linea: LineaDispersion): 'PENDIENTE' | 'DIFERIDO' {
  // Estado inicial al crear/recalcular. Nada pagado todavía → PENDIENTE si todo
  // liberable, DIFERIDO si parte diferida sin enganche que la cubra.
  return linea.montoDiferido > 0 ? 'DIFERIDO' : 'PENDIENTE'
}

function shouldAttachLider(
  linea: LineaDispersion,
  matriz: MatrizConfig | null,
  liderId: string | null,
): boolean {
  if (!matriz || !liderId) return false
  // FLAMINGO_DIRECTO: ASESOR no tiene líder asociado (YESYUCAN paga directo).
  if (matriz.reglaEspecial === 'FLAMINGO_DIRECTO' && linea.tipoBeneficiario === 'ASESOR') {
    return false
  }
  // LIDER_SALDO y ASESOR pertenecen al líder. Socios y operativos no.
  return linea.tipoBeneficiario === 'LIDER_SALDO' || linea.tipoBeneficiario === 'ASESOR'
}

// ─── Recálculo (cuando cambia enganche cobrado) ──────────────────────────────

export async function recalcularComision(
  tenantId: string,
  ventaId: string,
  nuevoEnganche: number,
  opts: { userId?: string } = {},
): Promise<CalcularPersistirResult | null> {
  // Actualizar enganche en venta primero
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(ventasBmcorp)
      .set({ enganche: nuevoEnganche.toFixed(2), updatedAt: new Date() })
      .where(and(eq(ventasBmcorp.tenantId, tenantId), eq(ventasBmcorp.id, ventaId)))
  })
  const callOpts = opts.userId ? { userId: opts.userId } : {}
  return calcularYPersistirComision(tenantId, ventaId, callOpts)
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getComisionByVenta(
  tenantId: string,
  ventaId: string,
): Promise<Comision | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(comisionesCalculadas)
      .where(
        and(eq(comisionesCalculadas.tenantId, tenantId), eq(comisionesCalculadas.ventaId, ventaId)),
      )
      .limit(1)
    return row ?? null
  })
}

export async function getDispersionesByComision(
  tenantId: string,
  comisionId: string,
): Promise<Dispersion[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(dispersiones)
      .where(and(eq(dispersiones.tenantId, tenantId), eq(dispersiones.comisionId, comisionId)))
      .orderBy(dispersiones.tipoBeneficiario)
  })
}

export async function getComisionesPorEmpresa(
  tenantId: string,
  empresaId: string,
  opts: { sinConfigSolo?: boolean; limit?: number } = {},
): Promise<Comision[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const filters = [
      eq(comisionesCalculadas.tenantId, tenantId),
      eq(ventasBmcorp.empresaId, empresaId),
    ]
    if (opts.sinConfigSolo) filters.push(eq(comisionesCalculadas.sinConfig, true))
    const rows = await tx
      .select({ comision: comisionesCalculadas })
      .from(comisionesCalculadas)
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .where(and(...filters))
      .orderBy(desc(comisionesCalculadas.createdAt))
      .limit(opts.limit ?? 200)
    return rows.map((r) => r.comision)
  })
}

export async function getComisionesPendientesDelMes(
  tenantId: string,
  empresaId: string,
  anio: number,
  mes: number,
): Promise<{ comision: Comision; dispersion: Dispersion }[]> {
  // Pendientes = dispersiones con estado distinto de PAGADO en el mes target
  const inicioMes = new Date(anio, mes - 1, 1).toISOString().slice(0, 10)
  const finMes = new Date(anio, mes, 0).toISOString().slice(0, 10)
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select({ comision: comisionesCalculadas, dispersion: dispersiones })
      .from(dispersiones)
      .innerJoin(comisionesCalculadas, eq(dispersiones.comisionId, comisionesCalculadas.id))
      .innerJoin(ventasBmcorp, eq(comisionesCalculadas.ventaId, ventasBmcorp.id))
      .where(
        and(
          eq(dispersiones.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          gte(comisionesCalculadas.createdAt, new Date(inicioMes)),
          lte(comisionesCalculadas.createdAt, new Date(finMes + 'T23:59:59Z')),
        ),
      )
      .orderBy(desc(comisionesCalculadas.createdAt))
    return rows
  })
}
