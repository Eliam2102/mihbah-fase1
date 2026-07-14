/**
 * Audit del cruce Monday ↔ DB:
 * 1. Alianzas del directorio cliente vs alianzas Monday vs DB
 * 2. Asesores en ventas Monday vs entidades asesor en DB
 * 3. Líderes que también aparecen como asesores
 */
import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const [t] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  const tenantId = t!.id as string

  console.log('═══ 1. ALIANZAS — directorio vs DB ═══\n')
  const alianzas = await sql`
    SELECT
      a.nombre AS alianza,
      a.monday_label,
      COALESCE(l.nombre, '⚠ SIN LÍDER') AS lider,
      l.coordina_pago,
      (SELECT COUNT(*) FROM matriz_alianza_producto m WHERE m.afiliado_id = a.id AND m.requiere_config = false)::int AS matrices_ok,
      (SELECT COUNT(*) FROM matriz_alianza_producto m WHERE m.afiliado_id = a.id AND m.requiere_config = true)::int AS matrices_pendientes
    FROM afiliados a
    LEFT JOIN lideres_alianza l ON l.afiliado_id = a.id AND l.activo = true
    WHERE a.tenant_id = ${tenantId} AND a.activo = true
    ORDER BY a.nombre
  `
  console.log(`Total alianzas activas: ${alianzas.length}\n`)
  console.log('Alianza'.padEnd(28), 'Líder'.padEnd(22), 'Coord', '  ', 'Matrices')
  console.log('─'.repeat(80))
  for (const a of alianzas as unknown as Record<string, string | number>[]) {
    console.log(
      String(a.alianza).padEnd(28),
      String(a.lider).padEnd(22),
      String(a.coordina_pago ?? '—').padEnd(12),
      `${a.matrices_ok} ok / ${a.matrices_pendientes} pend`,
    )
  }

  console.log('\n═══ 2. ASESORES MONDAY — cruce ═══\n')
  const cruce = await sql`
    SELECT
      v.asesor AS nombre_monday,
      af.nombre AS alianza_monday,
      COUNT(*)::int AS ventas,
      a.id IS NOT NULL AS tiene_entidad,
      a.nombre AS asesor_db,
      af2.nombre AS alianza_asesor_db
    FROM ventas_bmcorp v
    LEFT JOIN afiliados af ON af.id = v.afiliado_id
    LEFT JOIN asesores a ON a.monday_nombre = v.asesor AND a.tenant_id = v.tenant_id
    LEFT JOIN afiliados af2 ON af2.id = a.afiliado_id
    WHERE v.tenant_id = ${tenantId}
      AND v.asesor IS NOT NULL AND v.asesor != ''
    GROUP BY v.asesor, af.nombre, a.id, a.nombre, af2.nombre
    ORDER BY ventas DESC
  `
  console.log(`Asesores únicos en Monday: ${cruce.length}\n`)
  console.log(
    'Asesor Monday'.padEnd(26),
    'Alianza venta'.padEnd(22),
    'Ventas',
    '  ',
    'En DB',
    '  ',
    'Match alianza',
  )
  console.log('─'.repeat(100))
  let sinEntidad = 0
  let mismatch = 0
  for (const r of cruce as unknown as {
    nombre_monday: string
    alianza_monday: string | null
    ventas: number
    tiene_entidad: boolean
    asesor_db: string | null
    alianza_asesor_db: string | null
  }[]) {
    const status = r.tiene_entidad ? '✓' : '✗ FALTA'
    const matchOk = !r.tiene_entidad
      ? '—'
      : r.alianza_monday === r.alianza_asesor_db
        ? '✓'
        : `⚠ ${r.alianza_asesor_db ?? 'sin'}`
    if (!r.tiene_entidad) sinEntidad++
    if (r.tiene_entidad && r.alianza_monday !== r.alianza_asesor_db) mismatch++
    console.log(
      r.nombre_monday.padEnd(26),
      (r.alianza_monday ?? '—').padEnd(22),
      String(r.ventas).padStart(6),
      '  ',
      status.padEnd(10),
      matchOk,
    )
  }
  console.log('\nResumen:')
  console.log(`  Sin entidad asesor: ${sinEntidad}`)
  console.log(`  Mismatch alianza:   ${mismatch}`)

  console.log('\n═══ 3. LÍDERES QUE TAMBIÉN SON ASESORES ═══\n')
  const dual = await sql`
    SELECT l.nombre, af.nombre AS alianza_lider, af2.nombre AS alianza_asesor
    FROM lideres_alianza l
    JOIN asesores a ON UPPER(a.nombre) = UPPER(l.nombre) AND a.tenant_id = l.tenant_id
    JOIN afiliados af ON af.id = l.afiliado_id
    JOIN afiliados af2 ON af2.id = a.afiliado_id
    WHERE l.tenant_id = ${tenantId}
      AND l.activo = true AND a.activo = true
  `
  console.log(`Personas con doble rol: ${dual.length}\n`)
  for (const d of dual as unknown as Record<string, string>[]) {
    const ok = d.alianza_lider === d.alianza_asesor ? '✓' : '⚠'
    console.log(
      `  ${ok} ${(d.nombre ?? '').padEnd(20)} líder de ${(d.alianza_lider ?? '').padEnd(22)} · asesor de ${d.alianza_asesor ?? ''}`,
    )
  }

  console.log('\n═══ 4. ALIANZAS EN MONDAY (ventas) vs CATÁLOGO ═══\n')
  const usadas = await sql`
    SELECT af.nombre, COUNT(*)::int AS ventas
    FROM ventas_bmcorp v
    JOIN afiliados af ON af.id = v.afiliado_id
    WHERE v.tenant_id = ${tenantId}
    GROUP BY af.nombre
    ORDER BY ventas DESC
  `
  console.log('Alianzas con ventas en Monday:')
  for (const u of usadas as unknown as Record<string, string | number>[]) {
    console.log(`  ${String(u.nombre).padEnd(28)} ${u.ventas} ventas`)
  }

  console.log('\nAlianzas SIN ventas Monday todavía:')
  const sinVentas = await sql`
    SELECT a.nombre FROM afiliados a
    WHERE a.tenant_id = ${tenantId} AND a.activo = true
      AND NOT EXISTS (SELECT 1 FROM ventas_bmcorp v WHERE v.afiliado_id = a.id)
    ORDER BY a.nombre
  `
  for (const s of sinVentas as unknown as { nombre: string }[]) {
    console.log(`  ${s.nombre}`)
  }

  console.log('\n═══ 5. CÁLCULOS RECIENTES ═══\n')
  const calc = await sql`
    SELECT tipo_producto, COUNT(*)::int AS n, COUNT(*) FILTER (WHERE sin_config = true)::int AS sin_config
    FROM comisiones_calculadas
    WHERE tenant_id = ${tenantId}
    GROUP BY tipo_producto
  `
  for (const c of calc as unknown as Record<string, string | number>[]) {
    console.log(`  ${c.tipo_producto}: ${c.n} comisiones (sin_config: ${c.sin_config})`)
  }

  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
