/**
 * Servicio de alianzas, líderes y asesores BM CORP.
 *
 * - afiliados: catálogo de alianzas (las 15 del doc YESYUCAN v5 + extras Monday)
 * - lideresAlianza: líder responsable de una alianza ante BM Corp
 * - asesores: asesor que trabaja bajo un líder
 *
 * Todas las queries pasan por requireTenant() y db.transaction con setTenant.
 */

import { db } from '@/lib/db'
import { afiliados, asesores, lideresAlianza } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { decryptField, encryptField } from '@/lib/crypto/field-encryption'
import { and, asc, eq, isNull } from 'drizzle-orm'

export type Afiliado = typeof afiliados.$inferSelect
export type AfiliadoInsert = typeof afiliados.$inferInsert
export type Lider = typeof lideresAlianza.$inferSelect
export type LiderInsert = typeof lideresAlianza.$inferInsert
export type Asesor = typeof asesores.$inferSelect
export type AsesorInsert = typeof asesores.$inferInsert

// ─── Helpers cifrado de campos sensibles (CLABE, numeroCuenta) ──────────────
// Aplica AES-256-GCM via lib/crypto/field-encryption. Si la key no está
// configurada (dev), guarda en plano con warning.

const SENSIBLES = ['clabe', 'numeroCuenta'] as const

function cifrarSensibles<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data } as Record<string, unknown>
  for (const k of SENSIBLES) {
    if (k in out && typeof out[k] === 'string') {
      out[k] = encryptField(out[k] as string)
    }
  }
  return out as T
}

function descifrarLider(l: Lider): Lider {
  return {
    ...l,
    clabe: l.clabe ? decryptField(l.clabe) : l.clabe,
    numeroCuenta: l.numeroCuenta ? decryptField(l.numeroCuenta) : l.numeroCuenta,
  }
}

// ─── Afiliados (alianzas) ────────────────────────────────────────────────────

export async function getAfiliados(tenantId: string, soloActivos = true): Promise<Afiliado[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const filters = [eq(afiliados.tenantId, tenantId), isNull(afiliados.deletedAt)]
    if (soloActivos) filters.push(eq(afiliados.activo, true))
    return tx
      .select()
      .from(afiliados)
      .where(and(...filters))
      .orderBy(asc(afiliados.nombre))
  })
}

export async function getAfiliadoById(tenantId: string, id: string): Promise<Afiliado | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(afiliados)
      .where(and(eq(afiliados.tenantId, tenantId), eq(afiliados.id, id)))
      .limit(1)
    return row ?? null
  })
}

export async function getAfiliadoByMondayLabel(
  tenantId: string,
  mondayLabel: string,
): Promise<Afiliado | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(afiliados)
      .where(and(eq(afiliados.tenantId, tenantId), eq(afiliados.mondayLabel, mondayLabel)))
      .limit(1)
    return row ?? null
  })
}

export async function crearAfiliado(
  tenantId: string,
  data: Omit<AfiliadoInsert, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
): Promise<Afiliado> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .insert(afiliados)
      .values({ ...data, tenantId })
      .returning()
    if (!row) throw new Error('Insert no retornó fila')
    return row
  })
}

export async function actualizarAfiliado(
  tenantId: string,
  id: string,
  data: Partial<Omit<AfiliadoInsert, 'id' | 'tenantId' | 'createdAt'>>,
): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(afiliados)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(afiliados.tenantId, tenantId), eq(afiliados.id, id)))
  })
}

export async function desactivarAfiliado(tenantId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(afiliados)
      .set({ activo: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(afiliados.tenantId, tenantId), eq(afiliados.id, id)))
  })
}

// ─── Líderes de Alianza ──────────────────────────────────────────────────────

export async function getLideres(tenantId: string, soloActivos = true): Promise<Lider[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const filters = [eq(lideresAlianza.tenantId, tenantId), isNull(lideresAlianza.deletedAt)]
    if (soloActivos) filters.push(eq(lideresAlianza.activo, true))
    const rows = await tx
      .select()
      .from(lideresAlianza)
      .where(and(...filters))
      .orderBy(asc(lideresAlianza.nombre))
    return rows.map(descifrarLider)
  })
}

export async function getLideresByAfiliado(tenantId: string, afiliadoId: string): Promise<Lider[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const rows = await tx
      .select()
      .from(lideresAlianza)
      .where(
        and(
          eq(lideresAlianza.tenantId, tenantId),
          eq(lideresAlianza.afiliadoId, afiliadoId),
          isNull(lideresAlianza.deletedAt),
        ),
      )
      .orderBy(asc(lideresAlianza.nombre))
    return rows.map(descifrarLider)
  })
}

export async function getLiderById(tenantId: string, id: string): Promise<Lider | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(lideresAlianza)
      .where(and(eq(lideresAlianza.tenantId, tenantId), eq(lideresAlianza.id, id)))
      .limit(1)
    return row ? descifrarLider(row) : null
  })
}

export async function crearLider(
  tenantId: string,
  data: Omit<LiderInsert, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
): Promise<Lider> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .insert(lideresAlianza)
      .values({ ...cifrarSensibles(data), tenantId })
      .returning()
    if (!row) throw new Error('Insert no retornó fila')
    return descifrarLider(row)
  })
}

export async function actualizarLider(
  tenantId: string,
  id: string,
  data: Partial<Omit<LiderInsert, 'id' | 'tenantId' | 'createdAt'>>,
): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(lideresAlianza)
      .set({ ...cifrarSensibles(data), updatedAt: new Date() })
      .where(and(eq(lideresAlianza.tenantId, tenantId), eq(lideresAlianza.id, id)))
  })
}

export async function desactivarLider(tenantId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(lideresAlianza)
      .set({ activo: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(lideresAlianza.tenantId, tenantId), eq(lideresAlianza.id, id)))
  })
}

// ─── Asesores ────────────────────────────────────────────────────────────────

export async function getAsesores(tenantId: string, soloActivos = true): Promise<Asesor[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const filters = [eq(asesores.tenantId, tenantId), isNull(asesores.deletedAt)]
    if (soloActivos) filters.push(eq(asesores.activo, true))
    return tx
      .select()
      .from(asesores)
      .where(and(...filters))
      .orderBy(asc(asesores.nombre))
  })
}

export async function getAsesoresByLider(tenantId: string, liderId: string): Promise<Asesor[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(asesores)
      .where(
        and(
          eq(asesores.tenantId, tenantId),
          eq(asesores.liderId, liderId),
          isNull(asesores.deletedAt),
        ),
      )
      .orderBy(asc(asesores.nombre))
  })
}

export async function getAsesoresByAfiliado(
  tenantId: string,
  afiliadoId: string,
): Promise<Asesor[]> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select()
      .from(asesores)
      .where(
        and(
          eq(asesores.tenantId, tenantId),
          eq(asesores.afiliadoId, afiliadoId),
          isNull(asesores.deletedAt),
        ),
      )
      .orderBy(asc(asesores.nombre))
  })
}

export async function getAsesorById(tenantId: string, id: string): Promise<Asesor | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(asesores)
      .where(and(eq(asesores.tenantId, tenantId), eq(asesores.id, id)))
      .limit(1)
    return row ?? null
  })
}

export async function getAsesorByMondayNombre(
  tenantId: string,
  mondayNombre: string,
): Promise<Asesor | null> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .select()
      .from(asesores)
      .where(and(eq(asesores.tenantId, tenantId), eq(asesores.mondayNombre, mondayNombre)))
      .limit(1)
    return row ?? null
  })
}

export async function crearAsesor(
  tenantId: string,
  data: Omit<AsesorInsert, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
): Promise<Asesor> {
  return db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [row] = await tx
      .insert(asesores)
      .values({ ...data, tenantId })
      .returning()
    if (!row) throw new Error('Insert no retornó fila')
    return row
  })
}

export async function actualizarAsesor(
  tenantId: string,
  id: string,
  data: Partial<Omit<AsesorInsert, 'id' | 'tenantId' | 'createdAt'>>,
): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(asesores)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(asesores.tenantId, tenantId), eq(asesores.id, id)))
  })
}

export async function desactivarAsesor(tenantId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    await tx
      .update(asesores)
      .set({ activo: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(asesores.tenantId, tenantId), eq(asesores.id, id)))
  })
}
