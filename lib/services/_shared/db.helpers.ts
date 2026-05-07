/**
 * lib/services/_shared/db.helpers.ts
 *
 * Utilidades compartidas de base de datos para todos los servicios.
 * Centraliza el patrón RLS con set_config para que no se duplique en cada servicio.
 */

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

/** Tipo del objeto de transacción de Drizzle */
export type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Establece el contexto RLS para el tenant activo.
 * Debe llamarse al inicio de cada db.transaction() para que las políticas
 * de Row Level Security apliquen correctamente en el pool de conexiones.
 *
 * @example
 * return db.transaction(async (tx) => {
 *   await setTenant(tx, tenantId)
 *   // ... queries
 * })
 */
export async function setTenant(tx: DrizzleTx, tenantId: string): Promise<void> {
  await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
}
