import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function seed() {
  console.log('🌱 Seeding database...')

  // Check idempotency — skip if already seeded
  const existing = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  if (existing.length > 0) {
    console.log('  already seeded (tenant universo-jade exists). Run with --force to re-seed.')
    await sql.end()
    return
  }

  await sql.begin(async (trx) => {
    // ── Tenant ──────────────────────────────────────────────────────────────
    const [tenant] = await trx`
      INSERT INTO tenants (name, slug)
      VALUES ('Universo Jade', 'universo-jade')
      RETURNING id
    `
    const tenantId = tenant!.id as string
    console.log(`  tenant id: ${tenantId}`)

    // Set tenant context for RLS (transaction-local)
    await trx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`

    // ── Organización ─────────────────────────────────────────────────────────
    const [org] = await trx`
      INSERT INTO organizaciones (tenant_id, name)
      VALUES (${tenantId}, 'Grupo Universo Jade')
      RETURNING id
    `
    const orgId = org!.id as string
    console.log(`  org id: ${orgId}`)

    // ── Empresas ─────────────────────────────────────────────────────────────
    const empresasInput = [
      { name: 'MIHBAH', tipo: 'CONSTRUCTORA' },
      { name: 'YCDI', tipo: 'CAPITAL' },
      { name: 'BM CORP', tipo: 'COMERCIAL' },
    ] as const

    const empresaIds: Record<string, string> = {}
    for (const e of empresasInput) {
      const [row] = await trx`
        INSERT INTO empresas (tenant_id, organizacion_id, name, tipo)
        VALUES (${tenantId}, ${orgId}, ${e.name}, ${e.tipo})
        RETURNING id, name
      `
      empresaIds[e.name] = row!.id as string
    }
    console.log(`  empresas: ${Object.keys(empresaIds).join(', ')}`)

    // ── Proyectos ─────────────────────────────────────────────────────────────
    const proyectosInput = [
      'KOOBEN',
      'HUUNAL',
      'OTOCH',
      'KASA BONITA',
      'MIHBAH',
      'OBSERVATORIO',
      'GLORIETA CENTRAL',
      'ESCUELA',
      'CABAÑAS',
      'ACTIVACIONES CP',
      'LIMPIEZA',
      'MIHBAH-ACTIVOS',
    ]

    const mihbahId = empresaIds['MIHBAH']!
    for (const name of proyectosInput) {
      await trx`
        INSERT INTO proyectos (tenant_id, empresa_id, name)
        VALUES (${tenantId}, ${mihbahId}, ${name})
      `
    }
    console.log(`  proyectos: ${proyectosInput.length}`)

    // ── Cuentas Bancarias ─────────────────────────────────────────────────────
    await trx`
      INSERT INTO cuentas_bancarias (tenant_id, empresa_id, nombre, banco)
      VALUES
        (${tenantId}, ${mihbahId}, 'BBVA Mihbah', 'BBVA'),
        (${tenantId}, ${mihbahId}, 'EFECTIVO', null)
    `
    console.log('  cuentas_bancarias: 2')

    // ── Grupos ───────────────────────────────────────────────────────────────
    const gruposInput = [
      { nombre: 'INGRESOS PROYECTOS', orden: 1 },
      { nombre: 'INGRESOS RENTAS', orden: 2 },
      { nombre: 'INGRESOS VARIOS', orden: 3 },
      { nombre: 'MATERIALES', orden: 4 },
      { nombre: 'MANO DE OBRA', orden: 5 },
      { nombre: 'SUBCONTRATISTAS', orden: 6 },
      { nombre: 'HONORARIOS', orden: 7 },
      { nombre: 'GASTOS ADMINISTRATIVOS', orden: 8 },
      { nombre: 'GASTOS OPERATIVOS', orden: 9 },
      { nombre: 'PUBLICIDAD', orden: 10 },
      { nombre: 'SERVICIOS EXTERNOS', orden: 11 },
      { nombre: 'IMPUESTOS', orden: 12 },
      { nombre: 'NÓMINA', orden: 13 },
      { nombre: 'EQUIPO Y MAQUINARIA', orden: 14 },
      { nombre: 'MANTENIMIENTO', orden: 15 },
      { nombre: 'FINANCIAMIENTO', orden: 16 },
      { nombre: 'INVERSIONES', orden: 17 },
      { nombre: 'ANTICIPOS', orden: 18 },
      { nombre: 'INTERCOMPANY', orden: 19 },
      { nombre: 'VARIOS', orden: 20 },
    ]

    const grupoIds: Record<string, string> = {}
    for (const g of gruposInput) {
      const [row] = await trx`
        INSERT INTO grupos (tenant_id, nombre, orden)
        VALUES (${tenantId}, ${g.nombre}, ${g.orden})
        RETURNING id, nombre
      `
      grupoIds[g.nombre] = row!.id as string
    }
    console.log(`  grupos: ${gruposInput.length}`)

    // ── Categorías ───────────────────────────────────────────────────────────
    const categoriasInput = [
      { nombre: 'Venta de Casa', tipo: 'INGRESO', grupo: 'INGRESOS PROYECTOS' },
      { nombre: 'Venta de Terreno', tipo: 'INGRESO', grupo: 'INGRESOS PROYECTOS' },
      { nombre: 'Arrendamiento', tipo: 'INGRESO', grupo: 'INGRESOS RENTAS' },
      { nombre: 'Anticipo Cliente', tipo: 'INGRESO', grupo: 'ANTICIPOS' },
      { nombre: 'Otros Ingresos', tipo: 'INGRESO', grupo: 'INGRESOS VARIOS' },
      { nombre: 'Cemento y Block', tipo: 'EGRESO', grupo: 'MATERIALES' },
      { nombre: 'Varilla y Acero', tipo: 'EGRESO', grupo: 'MATERIALES' },
      { nombre: 'Instalaciones Eléctricas', tipo: 'EGRESO', grupo: 'SUBCONTRATISTAS' },
      { nombre: 'Instalaciones Hidráulicas', tipo: 'EGRESO', grupo: 'SUBCONTRATISTAS' },
      { nombre: 'Albañilería', tipo: 'EGRESO', grupo: 'MANO DE OBRA' },
      { nombre: 'Carpintería', tipo: 'EGRESO', grupo: 'MANO DE OBRA' },
      { nombre: 'Sueldos Administrativos', tipo: 'EGRESO', grupo: 'NÓMINA' },
      { nombre: 'Honorarios Profesionales', tipo: 'EGRESO', grupo: 'HONORARIOS' },
      { nombre: 'Publicidad y Redes', tipo: 'EGRESO', grupo: 'PUBLICIDAD' },
      { nombre: 'Renta de Oficina', tipo: 'EGRESO', grupo: 'GASTOS ADMINISTRATIVOS' },
      { nombre: 'Servicios (Agua/Luz/Internet)', tipo: 'EGRESO', grupo: 'SERVICIOS EXTERNOS' },
      { nombre: 'Combustible', tipo: 'EGRESO', grupo: 'GASTOS OPERATIVOS' },
      { nombre: 'Mantenimiento Vehículos', tipo: 'EGRESO', grupo: 'MANTENIMIENTO' },
      { nombre: 'ISR / IVA Pagado', tipo: 'EGRESO', grupo: 'IMPUESTOS' },
      { nombre: 'Préstamo Bancario', tipo: 'EGRESO', grupo: 'FINANCIAMIENTO' },
    ] as const

    for (const c of categoriasInput) {
      const grupoId = grupoIds[c.grupo]
      if (!grupoId) throw new Error(`grupo not found: ${c.grupo}`)
      await trx`
        INSERT INTO categorias (tenant_id, grupo_id, nombre, tipo)
        VALUES (${tenantId}, ${grupoId}, ${c.nombre}, ${c.tipo})
      `
    }
    console.log(`  categorias: ${categoriasInput.length}`)

    console.log('✅ Seed complete.')
  })

  await sql.end()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message ?? err)
  process.exit(1)
})
