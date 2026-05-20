/**
 * Aislamiento multi-tenant del módulo de Comisiones.
 *
 * Verifica que los SERVICIOS filtran por tenantId explícitamente en sus queries.
 * Esta es la primera línea de defensa. RLS es defense-in-depth pero requiere
 * un role no-superuser en producción (ver bloqueante DEPLOY Día 14).
 *
 * Setup: tenant 1 = universo-jade (seed), tenant 2 = fantasma para cross-check.
 */

import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getAfiliados, getEsquemas, getLideres, crearAfiliado } from '@/lib/services/comisiones'

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://mihbah:mihbah_dev_password@localhost:5432/mihbah_dev'

let sql: ReturnType<typeof postgres>
let tenant1Id: string
let tenant2Id: string

beforeAll(async () => {
  sql = postgres(DB_URL, { max: 1 })

  const [t1] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  if (!t1) throw new Error('Corre npm run db:seed y db:seed-comisiones primero')
  tenant1Id = t1.id as string

  const [t2] = await sql`
    INSERT INTO tenants (name, slug)
    VALUES ('Comisiones Aislado Test', 'comisiones-aislado-test')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `
  tenant2Id = t2!.id as string
})

afterAll(async () => {
  await sql`DELETE FROM tenants WHERE slug = 'comisiones-aislado-test'`
  await sql.end()
})

// ─── Tests de aislamiento por filtro explícito en servicios ─────────────────

describe('Servicios comisiones — filtros por tenantId', () => {
  it('getAfiliados(tenant1) NO incluye datos del tenant2', async () => {
    // Crear afiliado en tenant2 directo en DB (bypass servicios)
    await sql`
      INSERT INTO afiliados (tenant_id, nombre, activo)
      VALUES (${tenant2Id}, 'ALIANZA_T2_FANTASMA', true)
      ON CONFLICT DO NOTHING
    `
    const afiliados1 = await getAfiliados(tenant1Id, false)
    const nombres = afiliados1.map((a) => a.nombre)
    expect(nombres).not.toContain('ALIANZA_T2_FANTASMA')
    expect(nombres.length).toBeGreaterThan(0)
  })

  it('getAfiliados(tenant2) solo retorna su alianza fantasma', async () => {
    const afiliados2 = await getAfiliados(tenant2Id, false)
    const nombres = afiliados2.map((a) => a.nombre)
    expect(nombres).toContain('ALIANZA_T2_FANTASMA')
    expect(nombres).not.toContain('LGI')
    expect(nombres).not.toContain('FLAMINGO')
  })

  it('getEsquemas(tenant2) retorna vacío — no tiene esquemas configurados', async () => {
    const esq = await getEsquemas(tenant2Id)
    expect(esq.length).toBe(0)
  })

  it('getEsquemas(tenant1) retorna 2 esquemas (TERRENO + ACCION)', async () => {
    const esq = await getEsquemas(tenant1Id)
    expect(esq.length).toBeGreaterThanOrEqual(2)
    const tipos = esq.map((e) => e.tipoProducto)
    expect(tipos).toContain('TERRENO')
    expect(tipos).toContain('ACCION')
  })

  it('getLideres(tenant2) retorna vacío', async () => {
    const lideres = await getLideres(tenant2Id)
    expect(lideres.length).toBe(0)
  })

  it('crearAfiliado en tenant2 NO mezcla con tenant1', async () => {
    const creado = await crearAfiliado(tenant2Id, {
      nombre: 'ALIANZA_T2_VIA_SERVICIO',
    })
    expect(creado.tenantId).toBe(tenant2Id)

    // Verificar que tenant1 NO la ve
    const afiliados1 = await getAfiliados(tenant1Id, false)
    const nombres = afiliados1.map((a) => a.nombre)
    expect(nombres).not.toContain('ALIANZA_T2_VIA_SERVICIO')
  })
})
