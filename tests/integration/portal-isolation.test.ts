/**
 * Aislamiento del portal externo.
 *
 * Verifica que getComisionesPortalAsesor / getComisionesPortalLider /
 * verificarPertenenciaDispersion respetan el aislamiento por userId.
 *
 * Test setup: crea 2 usuarios portal (1 asesor, 1 líder) en distinta alianza
 * que la del seed, asocia dispersiones de prueba, verifica que cada uno solo
 * ve lo suyo.
 */

import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  getComisionesPortalAsesor,
  getComisionesPortalLider,
  verificarPertenenciaDispersion,
  getPerfilPortal,
} from '@/lib/services/comisiones/portal.service'

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://mihbah:mihbah_dev_password@localhost:5432/mihbah_dev'

let sql: ReturnType<typeof postgres>
let tenantId: string
let user1Id: string // asesor1 user
let user2Id: string // asesor2 user (otra alianza)
let liderUserId: string // líder de alianza1

beforeAll(async () => {
  sql = postgres(DB_URL, { max: 1 })

  const [t] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  if (!t) throw new Error('Corre seeds primero')
  tenantId = t.id as string

  // Crear 2 alianzas + sus líderes + asesores + dispersiones de prueba
  await sql.begin(async (trx) => {
    await trx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`

    // Alianza A
    const [aliA] = await trx`
      INSERT INTO afiliados (tenant_id, nombre, activo)
      VALUES (${tenantId}, 'PORTAL_TEST_A', true)
      RETURNING id
    `
    const aliAId = aliA!.id as string
    const [lidA] = await trx`
      INSERT INTO lideres_alianza (tenant_id, afiliado_id, nombre, activo)
      VALUES (${tenantId}, ${aliAId}, 'Líder A', true)
      RETURNING id
    `
    const lidAId = lidA!.id as string
    const [asesA] = await trx`
      INSERT INTO asesores (tenant_id, afiliado_id, lider_id, nombre, activo)
      VALUES (${tenantId}, ${aliAId}, ${lidAId}, 'Asesor A', true)
      RETURNING id
    `
    const asesAId = asesA!.id as string

    // Alianza B
    const [aliB] = await trx`
      INSERT INTO afiliados (tenant_id, nombre, activo)
      VALUES (${tenantId}, 'PORTAL_TEST_B', true)
      RETURNING id
    `
    const aliBId = aliB!.id as string
    const [lidB] = await trx`
      INSERT INTO lideres_alianza (tenant_id, afiliado_id, nombre, activo)
      VALUES (${tenantId}, ${aliBId}, 'Líder B', true)
      RETURNING id
    `
    const lidBId = lidB!.id as string
    const [asesB] = await trx`
      INSERT INTO asesores (tenant_id, afiliado_id, lider_id, nombre, activo)
      VALUES (${tenantId}, ${aliBId}, ${lidBId}, 'Asesor B', true)
      RETURNING id
    `
    const asesBId = asesB!.id as string

    // Better Auth users (id = text)
    user1Id = 'test-portal-user-asesor-a'
    user2Id = 'test-portal-user-asesor-b'
    liderUserId = 'test-portal-user-lider-a'
    for (const uid of [user1Id, user2Id, liderUserId]) {
      await trx`
        INSERT INTO users (id, name, email, email_verified, role, tenant_id)
        VALUES (${uid}, ${uid}, ${uid + '@test.local'}, true, 'asesor', ${tenantId})
        ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
      `
    }

    // usuarios_portal
    await trx`
      INSERT INTO usuarios_portal (tenant_id, user_id, rol_portal, asesor_id, activo)
      VALUES (${tenantId}, ${user1Id}, 'ASESOR', ${asesAId}, true)
      ON CONFLICT DO NOTHING
    `
    await trx`
      INSERT INTO usuarios_portal (tenant_id, user_id, rol_portal, asesor_id, activo)
      VALUES (${tenantId}, ${user2Id}, 'ASESOR', ${asesBId}, true)
      ON CONFLICT DO NOTHING
    `
    await trx`
      INSERT INTO usuarios_portal (tenant_id, user_id, rol_portal, lider_id, activo)
      VALUES (${tenantId}, ${liderUserId}, 'LIDER_ALIANZA', ${lidAId}, true)
      ON CONFLICT DO NOTHING
    `

    // Ventas + comisiones + dispersiones de prueba para cada asesor
    // Reuso una empresa BM CORP del seed
    const [emp] = await trx`SELECT id FROM empresas WHERE tipo = 'COMERCIAL' LIMIT 1`
    const empId = emp!.id as string
    const fecha = '2026-05-15'

    for (const [aliId, lidId, asesId, asesNombre, ventaCli] of [
      [aliAId, lidAId, asesAId, 'Asesor A', 'CLIENTE_PORTAL_A'],
      [aliBId, lidBId, asesBId, 'Asesor B', 'CLIENTE_PORTAL_B'],
    ] as const) {
      const [v] = await trx`
        INSERT INTO ventas_bmcorp (tenant_id, empresa_id, cliente, afiliado_id, asesor, monto, enganche, fecha)
        VALUES (${tenantId}, ${empId}, ${ventaCli}, ${aliId}, ${asesNombre}, 1000000, 120000, ${fecha})
        RETURNING id
      `
      const ventaId = v!.id as string
      const [c] = await trx`
        INSERT INTO comisiones_calculadas (
          tenant_id, venta_id, monto_venta, tipo_producto, porcentaje_total_aplicado,
          comision_bruta_total, monto_op_bmcorp, monto_op_yesyucan, monto_socio_fijo_jorge,
          monto_socio_fijo_kass, monto_bolsa_comercial, monto_asesor, monto_lider_saldo,
          monto_socio_bolsa_jorge, monto_socio_bolsa_kass, monto_socio_bolsa_diana,
          enganche_pagado, porcentaje_enganche, monto_liberable, monto_diferido
        ) VALUES (
          ${tenantId}, ${ventaId}, 1000000, 'TERRENO', 20,
          200000, 10000, 10000, 15000,
          15000, 150000, 80000, 70000,
          0, 0, 0,
          120000, 12, 120000, 80000
        )
        RETURNING id
      `
      const cId = c!.id as string
      // Dispersión ASESOR (asociada al asesor)
      await trx`
        INSERT INTO dispersiones (
          tenant_id, comision_id, lider_id, asesor_id, tipo_beneficiario,
          beneficiario_nombre, monto_total, estado
        ) VALUES (
          ${tenantId}, ${cId}, ${lidId}, ${asesId}, 'ASESOR',
          ${asesNombre}, 80000, 'AUTORIZADA'
        )
        ON CONFLICT DO NOTHING
      `
      // Dispersión LIDER_SALDO (asociada al líder)
      await trx`
        INSERT INTO dispersiones (
          tenant_id, comision_id, lider_id, tipo_beneficiario,
          beneficiario_nombre, monto_total, estado
        ) VALUES (
          ${tenantId}, ${cId}, ${lidId}, 'LIDER_SALDO',
          ${'Líder ' + (aliId === aliAId ? 'A' : 'B')}, 70000, 'AUTORIZADA'
        )
        ON CONFLICT DO NOTHING
      `
    }
  })
})

afterAll(async () => {
  await sql.begin(async (trx) => {
    await trx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    // CASCADE limpia dispersiones+comisiones via FK restrict — borrar manual
    await trx`DELETE FROM dispersiones WHERE beneficiario_nombre IN ('Asesor A', 'Asesor B', 'Líder A', 'Líder B')`
    await trx`DELETE FROM comisiones_calculadas WHERE venta_id IN (SELECT id FROM ventas_bmcorp WHERE cliente IN ('CLIENTE_PORTAL_A', 'CLIENTE_PORTAL_B'))`
    await trx`DELETE FROM ventas_bmcorp WHERE cliente IN ('CLIENTE_PORTAL_A', 'CLIENTE_PORTAL_B')`
    await trx`DELETE FROM usuarios_portal WHERE user_id IN (${user1Id}, ${user2Id}, ${liderUserId})`
    await trx`DELETE FROM asesores WHERE nombre IN ('Asesor A', 'Asesor B')`
    await trx`DELETE FROM lideres_alianza WHERE nombre IN ('Líder A', 'Líder B')`
    await trx`DELETE FROM afiliados WHERE nombre IN ('PORTAL_TEST_A', 'PORTAL_TEST_B')`
  })
  await sql`DELETE FROM users WHERE id IN (${user1Id}, ${user2Id}, ${liderUserId})`
  await sql.end()
})

describe('Aislamiento Portal — asesor vs asesor', () => {
  it('getPerfilPortal retorna perfil correcto para asesor A', async () => {
    const perfil = await getPerfilPortal(user1Id)
    expect(perfil).not.toBeNull()
    expect(perfil!.rolPortal).toBe('ASESOR')
    expect(perfil!.asesorNombre).toBe('Asesor A')
  })

  it('Asesor A NO ve la dispersión de Asesor B', async () => {
    const disp = await getComisionesPortalAsesor(user1Id)
    const clientes = disp.map((d) => d.ventaCliente)
    expect(clientes).toContain('CLIENTE_PORTAL_A')
    expect(clientes).not.toContain('CLIENTE_PORTAL_B')
  })

  it('Asesor B NO ve la dispersión de Asesor A', async () => {
    const disp = await getComisionesPortalAsesor(user2Id)
    const clientes = disp.map((d) => d.ventaCliente)
    expect(clientes).toContain('CLIENTE_PORTAL_B')
    expect(clientes).not.toContain('CLIENTE_PORTAL_A')
  })

  it('verificarPertenenciaDispersion: asesor A no puede acceder a dispersión de asesor B', async () => {
    const dispB = await getComisionesPortalAsesor(user2Id)
    if (dispB.length === 0) throw new Error('Test fixture incompleto')
    const idAjeno = dispB[0]!.id
    const ok = await verificarPertenenciaDispersion(user1Id, idAjeno)
    expect(ok).toBe(false)
  })

  it('verificarPertenenciaDispersion: asesor A SÍ accede a su propia dispersión', async () => {
    const dispA = await getComisionesPortalAsesor(user1Id)
    if (dispA.length === 0) throw new Error('Test fixture incompleto')
    const idPropio = dispA[0]!.id
    const ok = await verificarPertenenciaDispersion(user1Id, idPropio)
    expect(ok).toBe(true)
  })
})

describe('Aislamiento Portal — líder vs líder', () => {
  it('Líder A ve dispersiones de su alianza (incluye su asesor)', async () => {
    const disp = await getComisionesPortalLider(liderUserId)
    expect(disp.length).toBeGreaterThan(0)
    // Tiene tanto LIDER_SALDO como ASESOR de la alianza A
    const clientes = disp.map((d) => d.ventaCliente)
    expect(clientes).toContain('CLIENTE_PORTAL_A')
    expect(clientes).not.toContain('CLIENTE_PORTAL_B')
  })
})
