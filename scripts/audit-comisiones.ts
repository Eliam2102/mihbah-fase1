/**
 * Audit + auto-fix de inconsistencias en módulo comisiones.
 *
 * Detecta:
 *   1. Cuentas Better Auth con rol portal sin registro en usuariosPortal
 *   2. Asesores en ventas Monday sin entidad asesor en DB
 *   3. Comisiones huérfanas (sin venta o sin esquema)
 *   4. Cuentas portal con entidad inactiva/eliminada
 *
 * Auto-fix opcional (--fix):
 *   - Crea entidad asesor (sin líder) por cada nombre en Monday no registrado
 *   - Vincula dispersiones ASESOR existentes a asesorId via monday_nombre
 *
 * NO crea líderes placeholder. Joana asigna líder real desde UI después.
 *
 * Uso:
 *   tsx scripts/audit-comisiones.ts          # solo audit
 *   tsx scripts/audit-comisiones.ts --fix    # audit + auto-fix
 */
import 'dotenv/config'
import postgres from 'postgres'

const FIX = process.argv.includes('--fix')
const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const [t] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  if (!t) throw new Error('Tenant universo-jade no existe')
  const tenantId = t.id as string

  console.log('═══ AUDIT comisiones — tenant universo-jade ═══')
  console.log('Modo:', FIX ? 'AUDIT + AUTO-FIX' : 'solo AUDIT')

  // ─── 1. Roles ─────────────────────────────────────────────────────────────
  console.log('\n1. Roles Better Auth vs usuariosPortal')
  const orphan = await sql`
    SELECT u.email, u.role FROM users u
    LEFT JOIN usuarios_portal up ON up.user_id = u.id
    WHERE u.tenant_id = ${tenantId}
      AND u.role IN ('lider_alianza', 'asesor')
      AND up.id IS NULL
  `
  console.log(`  Users con rol portal sin usuariosPortal: ${orphan.length}`)
  for (const x of orphan as unknown as { email: string; role: string }[]) {
    console.log('   -', x.email, x.role)
  }

  // ─── 2. Asesores Monday sin entidad ───────────────────────────────────────
  console.log('\n2. Asesores Monday sin entidad asesor')
  const sinCruce = await sql`
    SELECT DISTINCT v.asesor, v.afiliado_id
    FROM ventas_bmcorp v
    LEFT JOIN asesores a ON a.monday_nombre = v.asesor AND a.tenant_id = ${tenantId}
    WHERE v.asesor IS NOT NULL AND v.asesor != ''
      AND a.id IS NULL
      AND v.afiliado_id IS NOT NULL
  `
  console.log(`  Asesores sin cruce: ${sinCruce.length}`)

  if (FIX && sinCruce.length > 0) {
    console.log('  → Aplicando auto-fix...')
    await sql.begin(async (trx) => {
      await trx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`

      // Crear asesores SIN líder. Joana asigna después.
      let creados = 0
      for (const r of sinCruce) {
        await trx`
          INSERT INTO asesores (tenant_id, afiliado_id, lider_id, nombre, monday_nombre, activo)
          VALUES (${tenantId}, ${r.afiliado_id}, NULL, ${r.asesor}, ${r.asesor}, true)
          ON CONFLICT DO NOTHING
        `
        creados++
      }
      console.log(`     ✓ ${creados} asesores creados (sin líder, Joana asigna en UI)`)

      // Vincular dispersiones ASESOR
      const linked = await trx`
        UPDATE dispersiones d
        SET asesor_id = a.id
        FROM asesores a, comisiones_calculadas c, ventas_bmcorp v
        WHERE d.tipo_beneficiario = 'ASESOR'
          AND d.asesor_id IS NULL
          AND d.comision_id = c.id
          AND c.venta_id = v.id
          AND a.tenant_id = d.tenant_id
          AND a.monday_nombre = v.asesor
        RETURNING d.id
      `
      console.log(`     ✓ ${linked.length} dispersiones vinculadas a asesorId`)
    })
  }

  // ─── 3. Comisiones huérfanas ──────────────────────────────────────────────
  console.log('\n3. Comisiones huérfanas')
  const sinVenta = await sql`
    SELECT COUNT(*) AS n FROM comisiones_calculadas c
    LEFT JOIN ventas_bmcorp v ON v.id = c.venta_id
    WHERE c.tenant_id = ${tenantId} AND v.id IS NULL
  `
  console.log(`  Sin venta: ${sinVenta[0]!.n}`)
  const sinEsquema = await sql`
    SELECT COUNT(*) AS n FROM comisiones_calculadas
    WHERE tenant_id = ${tenantId} AND esquema_id IS NULL
  `
  console.log(`  Sin esquema: ${sinEsquema[0]!.n}`)
  const conSinConfig = await sql`
    SELECT COUNT(*) AS n FROM comisiones_calculadas
    WHERE tenant_id = ${tenantId} AND sin_config = true
  `
  console.log(`  Con sin_config=true (requieren matriz): ${conSinConfig[0]!.n}`)

  // ─── 4. Cuentas portal sin entidad ────────────────────────────────────────
  console.log('\n4. Cuentas portal con entidad inactiva/null')
  const refProblem = await sql`
    SELECT u.email, up.rol_portal,
      CASE
        WHEN up.rol_portal = 'LIDER_ALIANZA' AND up.lider_id IS NULL THEN 'sin liderId'
        WHEN up.rol_portal = 'ASESOR' AND up.asesor_id IS NULL THEN 'sin asesorId'
        WHEN up.lider_id IS NOT NULL AND l.activo = false THEN 'líder inactivo'
        WHEN up.asesor_id IS NOT NULL AND a.activo = false THEN 'asesor inactivo'
        ELSE NULL
      END AS problema
    FROM usuarios_portal up
    JOIN users u ON u.id = up.user_id
    LEFT JOIN lideres_alianza l ON l.id = up.lider_id
    LEFT JOIN asesores a ON a.id = up.asesor_id
    WHERE up.tenant_id = ${tenantId}
      AND up.activo = true
  `
  const conProblema = (
    refProblem as unknown as {
      email: string
      problema: string | null
    }[]
  ).filter((r) => r.problema)
  console.log(`  Cuentas activas con problema: ${conProblema.length}`)
  for (const x of conProblema) {
    console.log(`   - ${x.email}: ${x.problema}`)
  }

  console.log('\n✓ Audit completo')
  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
