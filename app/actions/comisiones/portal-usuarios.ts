'use server'

import { requireUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import * as service from '@/lib/services/comisiones/usuarios-portal.service'
import { accounts } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { z } from 'zod'

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const crearSchema = z.object({
  rolPortal: z.enum(['LIDER_ALIANZA', 'ADMINISTRATIVO', 'ASESOR']),
  liderId: z.string().uuid().nullable().optional(),
  asesorId: z.string().uuid().nullable().optional(),
  email: z.string().email(),
  nombre: z.string().min(2),
  password: z.string().min(8),
})

function handleError(err: unknown): { ok: false; error: string } {
  console.error('[portal-usuarios action]', err)
  return {
    ok: false,
    error: err instanceof Error ? err.message : 'Error desconocido',
  }
}

export async function crearUsuarioPortalAction(
  empresaId: string,
  input: z.input<typeof crearSchema>,
): Promise<ActionResult<{ userId: string; usuarioPortalId: string }>> {
  try {
    const admin = await requireUser()
    if (!admin.tenantId) return { ok: false, error: 'Admin sin tenant' }
    const parsed = crearSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Validación falló' }
    const { rolPortal, liderId, asesorId, email, nombre, password } = parsed.data

    if ((rolPortal === 'LIDER_ALIANZA' || rolPortal === 'ADMINISTRATIVO') && !liderId) {
      return { ok: false, error: `liderId requerido para rol ${rolPortal}` }
    }
    if (rolPortal === 'ASESOR' && !asesorId) {
      return { ok: false, error: 'asesorId requerido para rol ASESOR' }
    }

    // Verificar email no duplicado
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    if (existingUser.length > 0) {
      return { ok: false, error: 'Email ya registrado' }
    }

    // Hash password con argon2 (mismo algoritmo que Better Auth config)
    const { hash } = await import('@node-rs/argon2')
    const hashedPassword = await hash(password, {
      algorithm: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    })

    // Crear user + account credencial DIRECTO en DB (sin signUpEmail).
    // Razón: auth.api.signUpEmail inicia sesión automáticamente y BOTA al admin
    // que está ejecutando esta acción. Inserción directa NO toca cookies.
    const newUserId = randomUUID()
    const accountId = randomUUID()

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: newUserId,
        email,
        name: nombre,
        emailVerified: true, // creado por admin, no necesita verificación
        role:
          rolPortal === 'LIDER_ALIANZA'
            ? 'lider_alianza'
            : rolPortal === 'ADMINISTRATIVO'
              ? 'administrativo'
              : 'asesor',
        tenantId: admin.tenantId,
      })

      await tx.insert(accounts).values({
        id: accountId,
        userId: newUserId,
        accountId: email,
        providerId: 'credential',
        password: hashedPassword,
      })
    })

    // Crear registro en usuariosPortal
    const portal = await service.crearUsuarioPortal(admin.tenantId, {
      userId: newUserId,
      rolPortal,
      liderId: liderId ?? null,
      asesorId: asesorId ?? null,
      activo: true,
    })

    revalidatePath(`/empresa/${empresaId}/comisiones/portal-usuarios`)
    return { ok: true, data: { userId: newUserId, usuarioPortalId: portal.id } }
  } catch (err) {
    return handleError(err)
  }
}

export async function desactivarUsuarioPortalAction(
  empresaId: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireUser()
    if (!admin.tenantId) return { ok: false, error: 'Admin sin tenant' }
    await service.desactivarUsuarioPortal(admin.tenantId, id)
    revalidatePath(`/empresa/${empresaId}/comisiones/portal-usuarios`)
    return { ok: true, data: { id } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Eliminar cuenta portal por completo ─────────────────────────────────────
// Borra usuariosPortal + accounts + users. Solo si admin lo confirma.

export async function eliminarUsuarioPortalAction(
  empresaId: string,
  usuarioPortalId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireUser()
    if (!admin.tenantId) return { ok: false, error: 'Admin sin tenant' }
    const tenantId = admin.tenantId

    // Importar lazy
    const { usuariosPortal } = await import('@/lib/db/schema')

    await db.transaction(async (tx) => {
      // Buscar el userId vinculado para borrar también la cuenta Better Auth
      const [up] = await tx
        .select()
        .from(usuariosPortal)
        .where(and(eq(usuariosPortal.tenantId, tenantId), eq(usuariosPortal.id, usuarioPortalId)))
        .limit(1)
      if (!up) throw new Error('Usuario portal no encontrado')

      const userId = up.userId

      // Borrar registro portal
      await tx
        .delete(usuariosPortal)
        .where(and(eq(usuariosPortal.tenantId, tenantId), eq(usuariosPortal.id, usuarioPortalId)))

      // Borrar accounts (credenciales). CASCADE en users → sesiones se borran al borrar el user
      await tx.delete(accounts).where(eq(accounts.userId, userId))

      // Borrar el user de Better Auth
      await tx.delete(users).where(eq(users.id, userId))
    })

    revalidatePath(`/empresa/${empresaId}/comisiones/portal-usuarios`)
    return { ok: true, data: { id: usuarioPortalId } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Toggle activo ───────────────────────────────────────────────────────────

export async function toggleActivoUsuarioPortalAction(
  empresaId: string,
  id: string,
  activo: boolean,
): Promise<ActionResult<{ id: string; activo: boolean }>> {
  try {
    const admin = await requireUser()
    if (!admin.tenantId) return { ok: false, error: 'Admin sin tenant' }
    await service.actualizarUsuarioPortal(admin.tenantId, id, { activo })
    revalidatePath(`/empresa/${empresaId}/comisiones/portal-usuarios`)
    return { ok: true, data: { id, activo } }
  } catch (err) {
    return handleError(err)
  }
}

// ─── Resetear password ───────────────────────────────────────────────────────

const resetSchema = z.object({
  usuarioPortalId: z.string().uuid(),
  newPassword: z.string().min(8),
})

export async function resetearPasswordPortalAction(
  empresaId: string,
  input: z.input<typeof resetSchema>,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const admin = await requireUser()
    if (!admin.tenantId) return { ok: false, error: 'Admin sin tenant' }
    const parsed = resetSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: 'Password mínimo 8 caracteres' }
    }
    const { usuarioPortalId, newPassword } = parsed.data

    const { usuariosPortal } = await import('@/lib/db/schema')
    const tenantId = admin.tenantId
    const [up] = await db
      .select()
      .from(usuariosPortal)
      .where(and(eq(usuariosPortal.tenantId, tenantId), eq(usuariosPortal.id, usuarioPortalId)))
      .limit(1)
    if (!up) return { ok: false, error: 'Usuario portal no encontrado' }
    const userId = up.userId

    // Hash password con argon2 (mismo que better-auth)
    const { hash } = await import('@node-rs/argon2')
    const hashed = await hash(newPassword, {
      algorithm: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    })

    // Update password en accounts (better-auth guarda hash ahí, providerId='credential')
    await db
      .update(accounts)
      .set({ password: hashed, updatedAt: new Date() })
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential')))

    revalidatePath(`/empresa/${empresaId}/comisiones/portal-usuarios`)
    return { ok: true, data: { userId } }
  } catch (err) {
    return handleError(err)
  }
}
