import 'dotenv/config'
import postgres from 'postgres'
import { randomUUID } from 'crypto'
import { hash } from '@node-rs/argon2'

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
      { name: 'MIHBAH', tipo: 'CONSTRUCTORA', fuenteDatos: 'EXCEL' },
      { name: 'YCDI', tipo: 'CAPITAL', fuenteDatos: 'EXCEL' },
      { name: 'BM CORP', tipo: 'COMERCIAL', fuenteDatos: 'MONDAY' },
    ] as const

    const empresaIds: Record<string, string> = {}
    for (const e of empresasInput) {
      const [row] = await trx`
        INSERT INTO empresas (tenant_id, organizacion_id, name, tipo, fuente_datos)
        VALUES (${tenantId}, ${orgId}, ${e.name}, ${e.tipo}, ${e.fuenteDatos})
        RETURNING id, name
      `
      empresaIds[e.name] = row!.id as string
    }
    console.log(`  empresas: ${Object.keys(empresaIds).join(', ')}`)

    // ── Proyectos MIHBAH ──────────────────────────────────────────────────────
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
    const proyectoIds: Record<string, string> = {}
    for (const name of proyectosInput) {
      const [row] = await trx`
        INSERT INTO proyectos (tenant_id, empresa_id, name)
        VALUES (${tenantId}, ${mihbahId}, ${name})
        RETURNING id, name
      `
      proyectoIds[name] = row!.id as string
    }
    console.log(`  proyectos MIHBAH: ${proyectosInput.length}`)

    // ── Proyectos YCDI ────────────────────────────────────────────────────────
    const ycdiId = empresaIds['YCDI']!
    const ycdiProyectosInput = ['KOOBEN CAPITAL', 'HUUNAL CAPITAL', 'OTOCH CAPITAL']
    const ycdiProyectoIds: Record<string, string> = {}
    for (const name of ycdiProyectosInput) {
      const [row] = await trx`
        INSERT INTO proyectos (tenant_id, empresa_id, name)
        VALUES (${tenantId}, ${ycdiId}, ${name})
        RETURNING id, name
      `
      ycdiProyectoIds[name] = row!.id as string
    }
    console.log(`  proyectos YCDI: ${ycdiProyectosInput.length}`)

    // ── Cuentas Bancarias ─────────────────────────────────────────────────────
    await trx`
      INSERT INTO cuentas_bancarias (tenant_id, empresa_id, nombre, banco)
      VALUES
        (${tenantId}, ${mihbahId}, 'BBVA Mihbah', 'BBVA'),
        (${tenantId}, ${mihbahId}, 'EFECTIVO', null),
        (${tenantId}, ${ycdiId}, 'BBVA YCDI', 'BBVA')
    `
    console.log('  cuentas_bancarias: 3')

    // ── Grupos ───────────────────────────────────────────────────────────────
    const gruposInput = [
      { nombre: 'INGRESOS PROYECTOS', orden: 1 },
      { nombre: 'INGRESOS RENTAS', orden: 2 },
      { nombre: 'INGRESOS VARIOS', orden: 3 },
      { nombre: 'APORTACIONES DE CAPITAL', orden: 4 },
      { nombre: 'MATERIALES', orden: 5 },
      { nombre: 'MANO DE OBRA', orden: 6 },
      { nombre: 'SUBCONTRATISTAS', orden: 7 },
      { nombre: 'HONORARIOS', orden: 8 },
      { nombre: 'GASTOS ADMINISTRATIVOS', orden: 9 },
      { nombre: 'GASTOS OPERATIVOS', orden: 10 },
      { nombre: 'PUBLICIDAD', orden: 11 },
      { nombre: 'SERVICIOS EXTERNOS', orden: 12 },
      { nombre: 'IMPUESTOS', orden: 13 },
      { nombre: 'NÓMINA', orden: 14 },
      { nombre: 'EQUIPO Y MAQUINARIA', orden: 15 },
      { nombre: 'MANTENIMIENTO', orden: 16 },
      { nombre: 'FINANCIAMIENTO', orden: 17 },
      { nombre: 'INVERSIONES', orden: 18 },
      { nombre: 'ANTICIPOS', orden: 19 },
      { nombre: 'INTERCOMPANY', orden: 20 },
      { nombre: 'VARIOS', orden: 21 },
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
      { nombre: 'Aportación de Capital', tipo: 'INGRESO', grupo: 'APORTACIONES DE CAPITAL' },
      { nombre: 'Enganche Accionista', tipo: 'INGRESO', grupo: 'APORTACIONES DE CAPITAL' },
      { nombre: 'Mensualidad Accionista', tipo: 'INGRESO', grupo: 'APORTACIONES DE CAPITAL' },
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

    // ── YCDI: Accionistas ─────────────────────────────────────────────────────
    const accionistasInput = [
      {
        codigo: 'AC-001',
        nombre: 'Carlos Mendoza Torres',
        asesor: 'Luis Ríos',
        tipoAccionista: 'INDIVIDUAL',
      },
      {
        codigo: 'AC-002',
        nombre: 'María González Pérez',
        asesor: 'Luis Ríos',
        tipoAccionista: 'INDIVIDUAL',
      },
      {
        codigo: 'AC-003',
        nombre: 'Inversiones Familia López S.A.',
        asesor: 'Ana Castillo',
        tipoAccionista: 'EMPRESA',
      },
      {
        codigo: 'AC-004',
        nombre: 'Roberto Hernández Vega',
        asesor: 'Ana Castillo',
        tipoAccionista: 'INDIVIDUAL',
      },
      {
        codigo: 'AC-005',
        nombre: 'Patricia Ruiz Morales',
        asesor: 'Luis Ríos',
        tipoAccionista: 'INDIVIDUAL',
      },
    ]

    const accionistaIds: string[] = []
    for (const a of accionistasInput) {
      const [row] = await trx`
        INSERT INTO accionistas (tenant_id, codigo, nombre, asesor, tipo_accionista)
        VALUES (${tenantId}, ${a.codigo}, ${a.nombre}, ${a.asesor}, ${a.tipoAccionista})
        RETURNING id
      `
      accionistaIds.push(row!.id as string)
    }
    console.log(`  accionistas: ${accionistasInput.length}`)

    // ── YCDI: Acuerdos de Aportación ──────────────────────────────────────────
    // Each accionista gets 1 acuerdo tied to a YCDI project
    const ycdiProyIds = Object.values(ycdiProyectoIds)
    const acuerdosInput = [
      {
        accionistaIdx: 0,
        proyectoIdx: 0,
        paquete: 'PAQUETE A',
        numeroAcciones: 10,
        precioPorAccion: 50000,
        enganche: 100000,
        numeroMensualidades: 9,
        fechaInicio: '2025-08-01',
      },
      {
        accionistaIdx: 1,
        proyectoIdx: 0,
        paquete: 'PAQUETE B',
        numeroAcciones: 5,
        precioPorAccion: 50000,
        enganche: 50000,
        numeroMensualidades: 9,
        fechaInicio: '2025-09-01',
      },
      {
        accionistaIdx: 2,
        proyectoIdx: 1,
        paquete: 'PAQUETE A',
        numeroAcciones: 20,
        precioPorAccion: 50000,
        enganche: 200000,
        numeroMensualidades: 9,
        fechaInicio: '2025-07-01',
      },
      {
        accionistaIdx: 3,
        proyectoIdx: 2,
        paquete: 'PAQUETE C',
        numeroAcciones: 8,
        precioPorAccion: 50000,
        enganche: 80000,
        numeroMensualidades: 9,
        fechaInicio: '2025-10-01',
      },
      {
        accionistaIdx: 4,
        proyectoIdx: 1,
        paquete: 'PAQUETE B',
        numeroAcciones: 6,
        precioPorAccion: 50000,
        enganche: 60000,
        numeroMensualidades: 9,
        fechaInicio: '2025-09-01',
      },
    ]

    const acuerdoIds: string[] = []
    for (const a of acuerdosInput) {
      const montoTotal = a.numeroAcciones * a.precioPorAccion
      const mensualidad = (montoTotal - a.enganche) / a.numeroMensualidades
      const [row] = await trx`
        INSERT INTO acuerdos_aportacion (
          tenant_id, accionista_id, proyecto_id, paquete,
          numero_acciones, precio_por_accion, monto_total,
          enganche, numero_mensualidades, mensualidad,
          fecha_inicio, estado
        ) VALUES (
          ${tenantId}, ${accionistaIds[a.accionistaIdx]!},
          ${ycdiProyIds[a.proyectoIdx]!}, ${a.paquete},
          ${a.numeroAcciones}, ${a.precioPorAccion}, ${montoTotal},
          ${a.enganche}, ${a.numeroMensualidades}, ${mensualidad.toFixed(2)},
          ${a.fechaInicio}, 'EN_PROCESO'
        ) RETURNING id
      `
      acuerdoIds.push(row!.id as string)
    }
    console.log(`  acuerdos_aportacion: ${acuerdosInput.length}`)

    // ── YCDI: Pagos de Aportación (30 pagos: 9 por acuerdo x 5 acuerdos) ─────
    let totalPagos = 0
    for (let acuerdoIdx = 0; acuerdoIdx < acuerdosInput.length; acuerdoIdx++) {
      const acuerdo = acuerdosInput[acuerdoIdx]!
      const acuerdoId = acuerdoIds[acuerdoIdx]!
      const montoTotal = acuerdo.numeroAcciones * acuerdo.precioPorAccion
      const mensualidad = (montoTotal - acuerdo.enganche) / acuerdo.numeroMensualidades
      const startDate = new Date(acuerdo.fechaInicio)

      for (let n = 1; n <= acuerdo.numeroMensualidades; n++) {
        const fechaProg = new Date(startDate)
        fechaProg.setMonth(fechaProg.getMonth() + n)
        const fechaProgramada = fechaProg.toISOString().slice(0, 10)

        // First 4 payments are PAGADA, rest PROXIMA o VENCIDA
        const esPagado = n <= 4
        const fechaPago = esPagado ? fechaProgramada : null
        const montoPagado = esPagado ? mensualidad.toFixed(2) : '0'
        const estado = esPagado ? 'PAGADA' : n === 5 ? 'VENCIDA' : 'PROXIMA'

        if (fechaPago) {
          await trx`
            INSERT INTO pagos_aportacion (
              tenant_id, acuerdo_id, numero_pago,
              fecha_programada, fecha_pago,
              monto_esperado, monto_pagado, estado
            ) VALUES (
              ${tenantId}, ${acuerdoId}, ${n},
              ${fechaProgramada}, ${fechaPago},
              ${mensualidad.toFixed(2)}, ${montoPagado}, ${estado}
            )
          `
        } else {
          await trx`
            INSERT INTO pagos_aportacion (
              tenant_id, acuerdo_id, numero_pago,
              fecha_programada,
              monto_esperado, monto_pagado, estado
            ) VALUES (
              ${tenantId}, ${acuerdoId}, ${n},
              ${fechaProgramada},
              ${mensualidad.toFixed(2)}, ${montoPagado}, ${estado}
            )
          `
        }
        totalPagos++
      }
    }
    console.log(`  pagos_aportacion: ${totalPagos}`)

    // ── Admin User ────────────────────────────────────────────────────────────
    const adminId = randomUUID()
    const adminEmail = 'admin@universojade.com'
    const adminPassword = 'Admin12345!'
    const passwordHash = await hash(adminPassword, {
      algorithm: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    })

    await trx`
      INSERT INTO users (id, name, email, email_verified, role, tenant_id)
      VALUES (
        ${adminId}, 'Administrador', ${adminEmail},
        true, 'super_admin', ${tenantId}
      )
    `

    const accountId = randomUUID()
    await trx`
      INSERT INTO accounts (id, user_id, account_id, provider_id, password)
      VALUES (${accountId}, ${adminId}, ${adminId}, 'credential', ${passwordHash})
    `

    for (const eid of Object.values(empresaIds)) {
      await trx`
        INSERT INTO user_empresa_access (tenant_id, user_id, empresa_id, rol)
        VALUES (${tenantId}, ${adminId}, ${eid}, 'ADMIN')
      `
    }

    console.log(`  admin user: ${adminEmail}`)
    console.log('✅ Seed complete.')
  })

  await sql.end()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message ?? err)
  process.exit(1)
})
