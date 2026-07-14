/**
 * Tenant isolation integration tests (RLS-level).
 *
 * Cada transacción hace `SET LOCAL ROLE mihbah_app` para que las queries corran
 * como usuario NO-SUPERUSER. Sin esto, el role bootstrap `mihbah` bypassa RLS
 * y los tests no validan nada.
 *
 * Setup local: ver docs/comisiones-deploy.md §5 (role mihbah_app ya provisionado).
 * Aislamiento de servicios además se valida en:
 * - tests/integration/comisiones-isolation.test.ts
 * - tests/integration/portal-isolation.test.ts
 */

import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://mihbah:mihbah_dev_password@localhost:5432/mihbah_dev'

let sql: ReturnType<typeof postgres>
let tenant1Id: string
let tenant2Id: string

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
  sql = postgres(DB_URL, { max: 1 })

  // Tenant 1 — from seed (no RLS on tenants table)
  const [t1] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  if (!t1) throw new Error('Seed data missing — run npm run db:seed first')
  tenant1Id = t1.id as string

  // Tenant 2 — for isolation testing (no RLS on tenants)
  const [t2] = await sql`
    INSERT INTO tenants (name, slug)
    VALUES ('Tenant Aislado Test', 'tenant-aislado-test')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `
  tenant2Id = t2!.id as string

  // Org for tenant 2 (no RLS on organizaciones)
  const [org2] = await sql`
    INSERT INTO organizaciones (tenant_id, name)
    VALUES (${tenant2Id}, 'Org Test 2')
    RETURNING id
  `
  const org2Id = org2!.id as string

  // Empresa for tenant 2 — FORCE RLS requires tenant context
  await sql.begin(async (trx) => {
    await trx`SELECT set_config('app.current_tenant_id', ${tenant2Id}, true)`
    await trx`
      INSERT INTO empresas (tenant_id, organizacion_id, name, tipo)
      VALUES (${tenant2Id}, ${org2Id}, 'EMPRESA FANTASMA', 'COMERCIAL')
    `
  })
})

afterAll(async () => {
  // FK CASCADE handles org2 + empresa2 cleanup
  await sql`DELETE FROM tenants WHERE slug = 'tenant-aislado-test'`
  await sql.end()
})

// ─── Helper: run query with tenant context (transaction-local) ────────────────

async function withTenant<T>(
  tenantId: string,
  query: (trx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (trx) => {
    // Bajar privilegios al role app dentro de esta tx — sin esto, mihbah bypassa RLS.
    await trx`SET LOCAL ROLE mihbah_app`
    await trx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    return query(trx)
  }) as Promise<T>
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('tenant isolation — empresas', () => {
  it('tenant1 sees only its 3 empresas', async () => {
    const rows = await withTenant(tenant1Id, (trx) => trx`SELECT name FROM empresas ORDER BY name`)
    const names = rows.map((r) => r.name as string)
    expect(names).toEqual(['BM CORP', 'MIHBAH', 'YCDI'])
    expect(names).not.toContain('EMPRESA FANTASMA')
  })

  it('tenant2 sees only its 1 empresa', async () => {
    const rows = await withTenant(tenant2Id, (trx) => trx`SELECT name FROM empresas ORDER BY name`)
    const names = rows.map((r) => r.name as string)
    expect(names).toEqual(['EMPRESA FANTASMA'])
    expect(names).not.toContain('MIHBAH')
  })

  it('no tenant context → sees no empresas (FORCE RLS)', async () => {
    const rows = await sql.begin(async (trx) => {
      await trx`SET LOCAL ROLE mihbah_app`
      // No SET app.current_tenant_id
      return trx`SELECT name FROM empresas`
    })
    expect(rows).toHaveLength(0)
  })
})

describe('tenant isolation — proyectos', () => {
  it('tenant1 sees proyectos del seed (12+)', async () => {
    const rows = await withTenant(tenant1Id, (trx) => trx`SELECT name FROM proyectos ORDER BY name`)
    expect(rows.length).toBeGreaterThanOrEqual(12)
  })

  it('tenant2 sees 0 proyectos', async () => {
    const rows = await withTenant(tenant2Id, (trx) => trx`SELECT name FROM proyectos`)
    expect(rows).toHaveLength(0)
  })
})

describe('tenant isolation — cross-tenant write blocked', () => {
  it('insert with mismatched tenant_id rejected by WITH CHECK policy', async () => {
    await expect(
      withTenant(tenant1Id, async (trx) => {
        // organizaciones has no RLS — readable without context
        const [org2] = await trx`
          SELECT o.id FROM organizaciones o
          JOIN tenants t ON t.id = o.tenant_id
          WHERE t.slug = 'tenant-aislado-test' LIMIT 1
        `
        if (!org2) throw new Error('tenant2 org not found')
        // Context is tenant1, but row has tenant2Id → WITH CHECK rejects
        return trx`
          INSERT INTO empresas (tenant_id, organizacion_id, name, tipo)
          VALUES (${tenant2Id}, ${org2.id}, 'INFILTRADA', 'COMERCIAL')
        `
      }),
    ).rejects.toThrow(/row-level security/)
  })
})
