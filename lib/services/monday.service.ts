/**
 * lib/services/monday.service.ts
 *
 * Monday.com sync service for BM CORP.
 *
 * syncBoard():
 *  1. Fetches all items from Monday board
 *  2. Maps each item → MappedVenta
 *  3. Upserts afiliados & desarrollos (by nombre, idempotent)
 *  4. Upserts ventas_bmcorp by (tenant_id, monday_item_id)
 *  5. Writes a sincronizaciones_monday record with stats
 */

import { db } from '@/lib/db'
import {
  ventasBmcorp,
  repartosBmcorp,
  afiliados,
  desarrollos,
  sincronizacionesMonday,
  empresas,
} from '@/lib/db/schema'
import { getBoard, MondayApiError } from '@/lib/monday/client'
import { mapItemToVenta, normalizeNombre, type MappedPago } from '@/lib/monday/mappers'
import { and, eq, ilike, sql } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncStats {
  syncId: string
  creados: number
  actualizados: number
  errores: number
  errorDetails: string[]
  totalItems: number
  boardName: string
  duration: number // ms
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function setTenant(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
) {
  await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
}

// ─── Upsert afiliado ──────────────────────────────────────────────────────────

async function upsertAfiliado(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  nombre: string,
  tenantId: string,
): Promise<string> {
  const normalized = normalizeNombre(nombre)

  const [existing] = await tx
    .select({ id: afiliados.id })
    .from(afiliados)
    .where(and(eq(afiliados.tenantId, tenantId), ilike(afiliados.nombre, normalized)))
    .limit(1)

  if (existing) return existing.id

  const [created] = await tx
    .insert(afiliados)
    .values({ tenantId, nombre: normalized })
    .returning({ id: afiliados.id })

  return created!.id
}

// ─── Upsert desarrollo ────────────────────────────────────────────────────────

async function upsertDesarrollo(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  nombre: string,
  tenantId: string,
  desarrolladora: string | null = null,
): Promise<string> {
  const normalized = normalizeNombre(nombre)

  const [existing] = await tx
    .select({ id: desarrollos.id, desarrolladora: desarrollos.desarrolladora })
    .from(desarrollos)
    .where(and(eq(desarrollos.tenantId, tenantId), ilike(desarrollos.nombre, normalized)))
    .limit(1)

  if (existing) {
    // Si ya existe pero no tenía desarrolladora, la actualizamos
    if (desarrolladora && !existing.desarrolladora) {
      await tx.update(desarrollos).set({ desarrolladora }).where(eq(desarrollos.id, existing.id))
    }
    return existing.id
  }

  const [created] = await tx
    .insert(desarrollos)
    .values({ tenantId, nombre: normalized, desarrolladora })
    .returning({ id: desarrollos.id })

  return created!.id
}

// ─── Sync pagos (repartos + comisiones) ──────────────────────────────────────

/**
 * Upserts pagos en `repartos_bmcorp` por (tenant, monday_item_id, tipo).
 * `monday_item_id` aquí es del formato "${ventaMondayId}:${tipo}" para que
 * cada venta pueda tener un reparto y una comisión sin colisión.
 */
async function syncPagos(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  pagos: MappedPago[],
  ctx: {
    tenantId: string
    empresaId: string
    ventaId: string
    afiliadoId: string | null
  },
): Promise<void> {
  for (const pago of pagos) {
    const [existing] = await tx
      .select({ id: repartosBmcorp.id })
      .from(repartosBmcorp)
      .where(
        and(
          eq(repartosBmcorp.tenantId, ctx.tenantId),
          eq(repartosBmcorp.mondayItemId, pago.mondayItemId),
          eq(repartosBmcorp.tipo, pago.tipo),
        ),
      )
      .limit(1)

    const payload = {
      tenantId: ctx.tenantId,
      empresaId: ctx.empresaId,
      ventaId: ctx.ventaId,
      // afiliadoId solo aplica a REPARTO_ALIANZA
      afiliadoId: pago.tipo === 'REPARTO_ALIANZA' ? ctx.afiliadoId : null,
      mondayItemId: pago.mondayItemId,
      tipo: pago.tipo,
      estado: pago.estado,
      beneficiario: pago.beneficiario,
      monto: pago.monto,
      fecha: pago.fecha,
      updatedAt: new Date(),
    }

    if (existing) {
      await tx.update(repartosBmcorp).set(payload).where(eq(repartosBmcorp.id, existing.id))
    } else {
      await tx.insert(repartosBmcorp).values(payload)
    }
  }
}

// ─── Main sync ────────────────────────────────────────────────────────────────

/**
 * Syncs Monday board → BM CORP DB tables.
 * Fully idempotent: run it N times without duplicating data.
 *
 * @param empresaId  UUID of BM CORP empresa
 * @param tenantId   Tenant UUID (from session)
 * @param userId     User who triggered the sync
 * @param boardId    Monday board ID (from env MONDAY_BOARD_ID or param)
 */
export async function syncBoard(
  empresaId: string,
  tenantId: string,
  userId: string,
  boardId?: string,
): Promise<SyncStats> {
  const targetBoardId = boardId ?? process.env.MONDAY_BOARD_ID
  if (!targetBoardId) throw new Error('MONDAY_BOARD_ID no está configurado')

  const startedAt = Date.now()
  let syncId = ''
  const stats: SyncStats = {
    syncId: '',
    creados: 0,
    actualizados: 0,
    errores: 0,
    errorDetails: [],
    totalItems: 0,
    boardName: '',
    duration: 0,
  }

  // Create sync record (INICIADO)
  const [syncRecord] = await db
    .insert(sincronizacionesMonday)
    .values({
      tenantId,
      empresaId,
      tablero: targetBoardId,
      estado: 'INICIADO',
      iniciadaPor: userId,
    })
    .returning({ id: sincronizacionesMonday.id })

  syncId = syncRecord!.id
  stats.syncId = syncId

  try {
    // 1. Fetch from Monday
    const { name: boardName, items } = await getBoard(targetBoardId)
    stats.boardName = boardName
    stats.totalItems = items.length

    // 2. Process each item in a single transaction
    await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)

      for (const item of items) {
        try {
          const mapped = mapItemToVenta(item)

          // Upsert afiliado
          let afiliadoId: string | null = null
          if (mapped.afiliadoNombre) {
            afiliadoId = await upsertAfiliado(tx, mapped.afiliadoNombre, tenantId)
          }

          // Upsert desarrollo
          let desarrolloId: string | null = null
          if (mapped.desarrolloNombre) {
            desarrolloId = await upsertDesarrollo(
              tx,
              mapped.desarrolloNombre,
              tenantId,
              mapped.desarrolladoraNombre,
            )
          }

          // Check if venta already exists (by monday_item_id + tenant)
          const [existing] = await tx
            .select({ id: ventasBmcorp.id })
            .from(ventasBmcorp)
            .where(
              and(
                eq(ventasBmcorp.tenantId, tenantId),
                eq(ventasBmcorp.mondayItemId, mapped.mondayItemId),
              ),
            )
            .limit(1)

          const payload = {
            tenantId,
            empresaId,
            mondayItemId: mapped.mondayItemId,
            cliente: mapped.cliente,
            afiliadoId,
            desarrolloId,
            asesor: mapped.asesor,
            monto: mapped.monto,
            financiamiento: mapped.financiamiento,
            enganche: mapped.enganche,
            estadoVenta: mapped.estadoVenta,
            fechaApertura: mapped.fechaApertura,
            fechaCierre: mapped.fechaCierre,
            fecha: mapped.fecha,

            // New fields
            loteAcciones: mapped.loteAcciones,
            paqueteAccion: mapped.paqueteAccion,
            pipelineGroup: mapped.pipelineGroup,
            operativoApertura: mapped.operativoApertura,
            operativoCierre: mapped.operativoCierre,
            comisionBmcorp: mapped.comisionBmcorp,
            mondayBoardId: targetBoardId,
            telefono: mapped.telefono,
            correo: mapped.correo,
            nacionalidad: mapped.nacionalidad,
            residencia: mapped.residencia,
            sexo: mapped.sexo,
            fechaNacimiento: mapped.fechaNacimiento,

            updatedAt: new Date(),
          }

          let ventaId: string
          if (existing) {
            await tx.update(ventasBmcorp).set(payload).where(eq(ventasBmcorp.id, existing.id))
            ventaId = existing.id
            stats.actualizados++
          } else {
            const [created] = await tx
              .insert(ventasBmcorp)
              .values(payload)
              .returning({ id: ventasBmcorp.id })
            ventaId = created!.id
            stats.creados++
          }

          // Pagos derivados — repartos a alianzas + comisiones a asesores.
          // Si las columnas Monday no existen o vienen vacías, mapped.pagos = []
          // y este bloque es no-op. Cuando cliente agregue las columnas
          // (ver docs/MONDAY_COLUMNAS_REQUERIDAS.md), pagos se sincronizan.
          if (mapped.pagos.length > 0) {
            await syncPagos(tx, mapped.pagos, {
              tenantId,
              empresaId,
              ventaId,
              afiliadoId,
            })
          }
        } catch (itemErr) {
          stats.errores++
          stats.errorDetails.push(
            `Item ${item.id} (${item.name}): ${itemErr instanceof Error ? itemErr.message : String(itemErr)}`,
          )
        }
      }
    })

    // 3. Update sync record → COMPLETADO
    stats.duration = Date.now() - startedAt
    await db
      .update(sincronizacionesMonday)
      .set({
        estado: 'COMPLETADO',
        registrosCreados: stats.creados,
        registrosActualizados: stats.actualizados,
        registrosErrores: stats.errores,
        errores: stats.errorDetails.length > 0 ? stats.errorDetails : null,
        finalizadaEn: new Date(),
      })
      .where(eq(sincronizacionesMonday.id, syncId))

    return stats
  } catch (err) {
    // Update sync record → ERROR
    const errMsg =
      err instanceof MondayApiError
        ? `API Monday: ${err.message} (HTTP ${err.statusCode})`
        : err instanceof Error
          ? err.message
          : String(err)

    await db
      .update(sincronizacionesMonday)
      .set({
        estado: 'ERROR',
        errores: [errMsg],
        finalizadaEn: new Date(),
      })
      .where(eq(sincronizacionesMonday.id, syncId))

    throw err
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function listSyncHistory(empresaId: string, tenantId: string, limit = 20) {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(sincronizacionesMonday)
      .where(
        and(
          eq(sincronizacionesMonday.tenantId, tenantId),
          eq(sincronizacionesMonday.empresaId, empresaId),
        ),
      )
      .orderBy(sql`${sincronizacionesMonday.iniciadaEn} DESC`)
      .limit(limit)
  })
}

export async function getLastSuccessfulSync(empresaId: string, tenantId: string) {
  const [row] = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(sincronizacionesMonday)
      .where(
        and(
          eq(sincronizacionesMonday.tenantId, tenantId),
          eq(sincronizacionesMonday.empresaId, empresaId),
          eq(sincronizacionesMonday.estado, 'COMPLETADO'),
        ),
      )
      .orderBy(sql`${sincronizacionesMonday.finalizadaEn} DESC`)
      .limit(1)
  })
  return row ?? null
}
