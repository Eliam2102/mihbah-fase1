/**
 * Bonos por umbral mensual — servicio con DB.
 *
 * Orquesta:
 *   1. CRUD de bonosUmbralConfig (admin Joana/Carla)
 *   2. Agregación de ventas finalizadas del mes por grupo de desarrolladora
 *   3. Cálculo (función pura `calcularBonoUmbral`) y upsert idempotente
 *      en bonosUmbralCalculados
 *
 * Idempotente: ejecutar `calcularYPersistirBonosMes` N veces para mismo
 * (config × año × mes) produce 1 sola fila actualizada con el snapshot del
 * último cálculo.
 */

import { db } from '@/lib/db'
import {
  afiliados,
  bonosUmbralCalculados,
  bonosUmbralConfig,
  comprobantesPago,
  desarrollos,
  ventasBmcorp,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { guardarComprobante } from '@/lib/storage/comprobantes'
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import {
  calcularBonoUmbral,
  type ConfigBonoUmbral,
  type GrupoDesarrolladora,
  type ResultadoBono,
  type VentasPorGrupo,
} from './bonos-umbral'

export type BonoConfig = typeof bonosUmbralConfig.$inferSelect
export type BonoCalculado = typeof bonosUmbralCalculados.$inferSelect

const GRUPOS: GrupoDesarrolladora[] = ['YCD', 'ARKA', 'RH', 'OTRO']

// Estados de venta que cuentan para el bono. Mismos que pagan comisión normal.
const ESTADOS_PAGABLES = ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO'] as const

// ─── CRUD config ─────────────────────────────────────────────────────────────

export async function listarBonosConfig(tenantId: string): Promise<BonoConfig[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(bonosUmbralConfig)
      .where(eq(bonosUmbralConfig.tenantId, tenantId))
      .orderBy(bonosUmbralConfig.nombre)
  })
}

export interface BonoConfigInput {
  nombre: string
  afiliadoDestinatarioId: string
  tipoFuente: 'PROPIA' | 'OVERRIDE_AFILIADO'
  afiliadoOrigenId: string | null
  overridePct: number | null
  umbralAcumuladoMensual: number
  bonoPct: number
  gruposAcumulan: GrupoDesarrolladora[]
  gruposAplicaBono: GrupoDesarrolladora[]
  formulaCalculo: 'EXCEDENTE' | 'TOTAL_GRUPOS_APLICA' | 'EXCEDENTE_CAP_GRUPOS'
  activo: boolean
  vigenteDesde: string // YYYY-MM-DD
  vigenteHasta: string | null
  notas: string | null
}

export async function crearBonoConfig(
  tenantId: string,
  input: BonoConfigInput,
): Promise<BonoConfig> {
  validarInput(input)
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .insert(bonosUmbralConfig)
      .values({
        tenantId,
        nombre: input.nombre,
        afiliadoDestinatarioId: input.afiliadoDestinatarioId,
        tipoFuente: input.tipoFuente,
        afiliadoOrigenId: input.afiliadoOrigenId,
        overridePct: input.overridePct != null ? input.overridePct.toFixed(2) : null,
        umbralAcumuladoMensual: input.umbralAcumuladoMensual.toFixed(2),
        bonoPct: input.bonoPct.toFixed(2),
        gruposAcumulan: input.gruposAcumulan,
        gruposAplicaBono: input.gruposAplicaBono,
        formulaCalculo: input.formulaCalculo,
        activo: input.activo,
        vigenteDesde: input.vigenteDesde,
        vigenteHasta: input.vigenteHasta,
        notas: input.notas,
      })
      .returning()
    if (!row) throw new Error('No se pudo crear configuración de bono')
    return row
  })
}

export async function actualizarBonoConfig(
  tenantId: string,
  id: string,
  input: BonoConfigInput,
): Promise<BonoConfig> {
  validarInput(input)
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .update(bonosUmbralConfig)
      .set({
        nombre: input.nombre,
        afiliadoDestinatarioId: input.afiliadoDestinatarioId,
        tipoFuente: input.tipoFuente,
        afiliadoOrigenId: input.afiliadoOrigenId,
        overridePct: input.overridePct != null ? input.overridePct.toFixed(2) : null,
        umbralAcumuladoMensual: input.umbralAcumuladoMensual.toFixed(2),
        bonoPct: input.bonoPct.toFixed(2),
        gruposAcumulan: input.gruposAcumulan,
        gruposAplicaBono: input.gruposAplicaBono,
        formulaCalculo: input.formulaCalculo,
        activo: input.activo,
        vigenteDesde: input.vigenteDesde,
        vigenteHasta: input.vigenteHasta,
        notas: input.notas,
        updatedAt: new Date(),
      })
      .where(and(eq(bonosUmbralConfig.tenantId, tenantId), eq(bonosUmbralConfig.id, id)))
      .returning()
    if (!row) throw new Error('Configuración de bono no encontrada')
    return row
  })
}

export async function eliminarBonoConfig(tenantId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .delete(bonosUmbralConfig)
      .where(and(eq(bonosUmbralConfig.tenantId, tenantId), eq(bonosUmbralConfig.id, id)))
  })
}

function validarInput(input: BonoConfigInput): void {
  if (!input.nombre.trim()) throw new Error('Nombre requerido')
  if (input.tipoFuente === 'OVERRIDE_AFILIADO' && !input.afiliadoOrigenId) {
    throw new Error('OVERRIDE_AFILIADO requiere afiliado origen')
  }
  if (input.tipoFuente === 'PROPIA' && input.afiliadoOrigenId) {
    throw new Error('PROPIA no debe tener afiliado origen')
  }
  if (input.umbralAcumuladoMensual < 0) throw new Error('Umbral no puede ser negativo')
  if (input.bonoPct < 0 || input.bonoPct > 100) throw new Error('Bono % fuera de rango')
  if (input.overridePct != null && (input.overridePct < 0 || input.overridePct > 100)) {
    throw new Error('Override % fuera de rango')
  }
  if (input.gruposAcumulan.length === 0)
    throw new Error('Debe seleccionar al menos un grupo que acumule')
  if (input.gruposAplicaBono.length === 0)
    throw new Error('Debe seleccionar al menos un grupo donde aplique el bono')
}

// ─── Agregación de ventas del mes por grupo ─────────────────────────────────

/**
 * Suma ventas FINALIZADA/FINALIZADO_Y_LIQUIDADO del afiliado en el mes,
 * agrupadas por grupo de desarrolladora. Ventas sin desarrollo cuentan en OTRO.
 */
export async function agregarVentasPorGrupoDelMes(
  tenantId: string,
  afiliadoId: string,
  anio: number,
  mes: number,
): Promise<VentasPorGrupo> {
  const inicio = new Date(Date.UTC(anio, mes - 1, 1)).toISOString().slice(0, 10)
  const finExclusivo = new Date(Date.UTC(anio, mes, 1)).toISOString().slice(0, 10)

  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select({
        grupo: sql<string>`COALESCE(${desarrollos.grupoDesarrolladora}, 'OTRO')`,
        suma: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)`,
      })
      .from(ventasBmcorp)
      .leftJoin(desarrollos, eq(ventasBmcorp.desarrolloId, desarrollos.id))
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.afiliadoId, afiliadoId),
          inArray(ventasBmcorp.estadoVenta, [...ESTADOS_PAGABLES]),
          gte(ventasBmcorp.fecha, inicio),
          // fecha < primer día mes siguiente (inclusive del último día del mes)
          sql`${ventasBmcorp.fecha} < ${finExclusivo}`,
        ),
      )
      .groupBy(sql`COALESCE(${desarrollos.grupoDesarrolladora}, 'OTRO')`)

    const out: VentasPorGrupo = { YCD: 0, ARKA: 0, RH: 0, OTRO: 0 }
    for (const r of rows) {
      const g = (GRUPOS as string[]).includes(r.grupo) ? (r.grupo as GrupoDesarrolladora) : 'OTRO'
      out[g] += Number(r.suma)
    }
    return out
  })
}

// ─── Cálculo + persistencia ──────────────────────────────────────────────────

export interface BonoMesResultado {
  config: BonoConfig
  ventas: VentasPorGrupo
  resultado: ResultadoBono
  calculado: BonoCalculado
}

/**
 * Calcula todos los bonos del mes para todas las configs activas + vigentes.
 * Idempotente: upsert por (config, año, mes).
 */
export async function calcularYPersistirBonosMes(
  tenantId: string,
  anio: number,
  mes: number,
  userId: string | null,
): Promise<BonoMesResultado[]> {
  // 1. Configs activas vigentes en el último día del mes (criterio: vigenteDesde
  //    <= último día del mes y (vigenteHasta IS NULL o >= primer día del mes)).
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1)).toISOString().slice(0, 10)
  const finMes = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10)

  const configs = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(bonosUmbralConfig)
      .where(
        and(
          eq(bonosUmbralConfig.tenantId, tenantId),
          eq(bonosUmbralConfig.activo, true),
          lte(bonosUmbralConfig.vigenteDesde, finMes),
          sql`(${bonosUmbralConfig.vigenteHasta} IS NULL OR ${bonosUmbralConfig.vigenteHasta} >= ${inicioMes})`,
        ),
      )
  })

  const resultados: BonoMesResultado[] = []

  for (const cfg of configs) {
    // 2. Afiliado origen — propia → destinatario; override → afiliadoOrigen.
    const origenId =
      cfg.tipoFuente === 'OVERRIDE_AFILIADO' ? cfg.afiliadoOrigenId : cfg.afiliadoDestinatarioId
    if (!origenId) continue // config inválida, salta

    const ventas = await agregarVentasPorGrupoDelMes(tenantId, origenId, anio, mes)

    const configPura: ConfigBonoUmbral = {
      tipoFuente: cfg.tipoFuente,
      overridePct: Number(cfg.overridePct ?? 0),
      umbralAcumuladoMensual: Number(cfg.umbralAcumuladoMensual),
      bonoPct: Number(cfg.bonoPct),
      gruposAcumulan: cfg.gruposAcumulan as GrupoDesarrolladora[],
      gruposAplicaBono: cfg.gruposAplicaBono as GrupoDesarrolladora[],
      formulaCalculo: cfg.formulaCalculo,
    }
    const resultado = calcularBonoUmbral(ventas, configPura)

    const calculado = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      const values = {
        tenantId,
        configId: cfg.id,
        anio,
        mes,
        ventasYcd: ventas.YCD.toFixed(2),
        ventasArka: ventas.ARKA.toFixed(2),
        ventasRh: ventas.RH.toFixed(2),
        ventasOtro: ventas.OTRO.toFixed(2),
        totalAcumulado: resultado.totalAcumulado.toFixed(2),
        excedente: resultado.excedente.toFixed(2),
        montoOverride: resultado.montoOverride.toFixed(2),
        montoBono: resultado.montoBono.toFixed(2),
        montoTotal: resultado.montoTotal.toFixed(2),
        calculadoEn: new Date(),
        calculadoPor: userId,
      }
      const [row] = await tx
        .insert(bonosUmbralCalculados)
        .values(values)
        .onConflictDoUpdate({
          target: [
            bonosUmbralCalculados.tenantId,
            bonosUmbralCalculados.configId,
            bonosUmbralCalculados.anio,
            bonosUmbralCalculados.mes,
          ],
          set: {
            ventasYcd: values.ventasYcd,
            ventasArka: values.ventasArka,
            ventasRh: values.ventasRh,
            ventasOtro: values.ventasOtro,
            totalAcumulado: values.totalAcumulado,
            excedente: values.excedente,
            montoOverride: values.montoOverride,
            montoBono: values.montoBono,
            montoTotal: values.montoTotal,
            calculadoEn: values.calculadoEn,
            calculadoPor: values.calculadoPor,
            updatedAt: new Date(),
          },
        })
        .returning()
      if (!row) throw new Error('No se pudo persistir bono calculado')
      return row
    })

    resultados.push({ config: cfg, ventas, resultado, calculado })
  }

  return resultados
}

// ─── Vinculación y pago ──────────────────────────────────────────────────────

export async function vincularBonoCorte(
  tenantId: string,
  bonoId: string,
  corteId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(bonosUmbralCalculados)
      .set({ corteId, updatedAt: new Date() })
      .where(
        and(eq(bonosUmbralCalculados.tenantId, tenantId), eq(bonosUmbralCalculados.id, bonoId)),
      )
  })
}

export interface MarcarPagoBonoInput {
  bonoId: string
  file: File
  fechaPago: string // YYYY-MM-DD
  metodoPago: 'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'OTRO'
  beneficiarioNombre: string
  userId: string
}

export async function marcarPagoBono(tenantId: string, input: MarcarPagoBonoInput): Promise<void> {
  const { bonoId, file, fechaPago, metodoPago, beneficiarioNombre, userId } = input

  // 1. Resolver corteId del bono (necesario para comprobantesPago)
  const [bonoRow] = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select({ corteId: bonosUmbralCalculados.corteId })
      .from(bonosUmbralCalculados)
      .where(
        and(eq(bonosUmbralCalculados.tenantId, tenantId), eq(bonosUmbralCalculados.id, bonoId)),
      )
      .limit(1)
  })
  if (!bonoRow) throw new Error('Bono no encontrado')
  if (!bonoRow.corteId) throw new Error('Bono sin corte asignado. Asigna un corte primero.')

  // 2. Guardar archivo
  const archivo = await guardarComprobante(file, tenantId)

  // 3. Insertar comprobante + actualizar bono en tx
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [comprobante] = await tx
      .insert(comprobantesPago)
      .values({
        tenantId,
        corteId: bonoRow.corteId,
        beneficiarioNombre,
        metodoPago,
        montoPagado: null,
        fechaPago,
        nombre: archivo.nombre,
        rutaArchivo: archivo.rutaArchivo,
        mimeType: archivo.mimeType,
        tamanioBytes: archivo.tamanioBytes,
        subidoPor: userId,
      })
      .returning({ id: comprobantesPago.id })
    if (!comprobante) throw new Error('No se pudo registrar comprobante')

    await tx
      .update(bonosUmbralCalculados)
      .set({
        pagado: true,
        fechaPago,
        comprobanteId: comprobante.id,
        updatedAt: new Date(),
      })
      .where(
        and(eq(bonosUmbralCalculados.tenantId, tenantId), eq(bonosUmbralCalculados.id, bonoId)),
      )
  })
}

export async function listarBonosPorCortes(
  tenantId: string,
  corteIds: string[],
): Promise<{ bono: BonoCalculado; config: BonoConfig; destinatario: string | null }[]> {
  if (corteIds.length === 0) return []
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select({
        bono: bonosUmbralCalculados,
        config: bonosUmbralConfig,
        destinatario: afiliados.nombre,
      })
      .from(bonosUmbralCalculados)
      .innerJoin(bonosUmbralConfig, eq(bonosUmbralCalculados.configId, bonosUmbralConfig.id))
      .leftJoin(afiliados, eq(bonosUmbralConfig.afiliadoDestinatarioId, afiliados.id))
      .where(
        and(
          eq(bonosUmbralCalculados.tenantId, tenantId),
          inArray(bonosUmbralCalculados.corteId, corteIds),
          eq(bonosUmbralCalculados.pagado, false),
        ),
      )
      .orderBy(bonosUmbralConfig.nombre)
    return rows
  })
}

export async function listarBonosCalculados(
  tenantId: string,
  anio: number,
  mes: number,
): Promise<{ bono: BonoCalculado; config: BonoConfig; destinatario: string | null }[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select({
        bono: bonosUmbralCalculados,
        config: bonosUmbralConfig,
        destinatario: afiliados.nombre,
      })
      .from(bonosUmbralCalculados)
      .innerJoin(bonosUmbralConfig, eq(bonosUmbralCalculados.configId, bonosUmbralConfig.id))
      .leftJoin(afiliados, eq(bonosUmbralConfig.afiliadoDestinatarioId, afiliados.id))
      .where(
        and(
          eq(bonosUmbralCalculados.tenantId, tenantId),
          eq(bonosUmbralCalculados.anio, anio),
          eq(bonosUmbralCalculados.mes, mes),
        ),
      )
      .orderBy(bonosUmbralConfig.nombre)
    return rows
  })
}
