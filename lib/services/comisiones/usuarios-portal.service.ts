/**
 * CRUD de usuariosPortal — puente entre Better Auth users y entidad portal.
 * Un usuario portal tiene rol LIDER_ALIANZA o ASESOR y está vinculado a una entidad.
 */

import { db } from '@/lib/db'
import { usuariosPortal, users, lideresAlianza, asesores } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq } from 'drizzle-orm'

export type UsuarioPortal = typeof usuariosPortal.$inferSelect
export type UsuarioPortalInsert = typeof usuariosPortal.$inferInsert

export interface UsuarioPortalDetalle {
  usuario: UsuarioPortal
  userEmail: string
  userName: string
  userRole: string | null
  liderNombre: string | null
  asesorNombre: string | null
}

export async function getUsuariosPortal(tenantId: string): Promise<UsuarioPortalDetalle[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select({
        usuario: usuariosPortal,
        userEmail: users.email,
        userName: users.name,
        userRole: users.role,
        liderNombre: lideresAlianza.nombre,
        asesorNombre: asesores.nombre,
      })
      .from(usuariosPortal)
      .innerJoin(users, eq(usuariosPortal.userId, users.id))
      .leftJoin(lideresAlianza, eq(usuariosPortal.liderId, lideresAlianza.id))
      .leftJoin(asesores, eq(usuariosPortal.asesorId, asesores.id))
      .where(eq(usuariosPortal.tenantId, tenantId))
    return rows.map((r) => ({
      usuario: r.usuario,
      userEmail: r.userEmail,
      userName: r.userName,
      userRole: r.userRole,
      liderNombre: r.liderNombre,
      asesorNombre: r.asesorNombre,
    }))
  })
}

export async function getUsuarioPortalByUserId(userId: string): Promise<UsuarioPortal | null> {
  // NOTA: Esta query NO usa setTenant porque el usuario del portal no conoce su tenantId
  // todavía. RLS la bloquearía. Usamos query directa controlada — el userId es la
  // clave de aislamiento.
  const [row] = await db
    .select()
    .from(usuariosPortal)
    .where(eq(usuariosPortal.userId, userId))
    .limit(1)
  return row ?? null
}

export async function crearUsuarioPortal(
  tenantId: string,
  data: Omit<UsuarioPortalInsert, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
): Promise<UsuarioPortal> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .insert(usuariosPortal)
      .values({ ...data, tenantId })
      .returning()
    if (!row) throw new Error('Insert no retornó fila')
    return row
  })
}

export async function actualizarUsuarioPortal(
  tenantId: string,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(usuariosPortal)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(usuariosPortal.tenantId, tenantId), eq(usuariosPortal.id, id)))
  })
}

export async function desactivarUsuarioPortal(tenantId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(usuariosPortal)
      .set({ activo: false, updatedAt: new Date() })
      .where(and(eq(usuariosPortal.tenantId, tenantId), eq(usuariosPortal.id, id)))
  })
}
