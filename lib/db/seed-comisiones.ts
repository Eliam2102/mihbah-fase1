/**
 * Seed específico del módulo de Comisiones BM CORP.
 *
 * - Inserta 2 esquemas globales (TERRENOS y YCD) según doc YESYUCAN v5.
 * - Upserta las 15 alianzas del doc con su mondayLabel.
 * - Marca como requiereConfig=true cualquier alianza ya en DB que NO esté en el doc.
 * - Crea matriz Alianza × Producto para cada una de las 15.
 *
 * Idempotente: se puede correr múltiples veces. Si ya existe, actualiza en lugar de duplicar.
 *
 * Uso: npm run db:seed-comisiones
 */
import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

// ─── Catálogo doc YESYUCAN v5 ────────────────────────────────────────────────

// Mapa: nombre canónico en sistema → label exacto que viene de Monday (mayúsculas)
// 15 alianzas según PDF YESYUCAN v5 (Sección 3.1 y 3.2)
// IXCHE/IXHA — cliente confirmó: PDF dice "Ixceh" pero es error de dedo,
// el nombre real es IXHA. Es alianza de Jorge (igual SOMOS/KUCHMOTS).
const ALIANZAS_DOC = [
  { nombre: 'LGI', mondayLabel: 'LGI' },
  { nombre: 'Flamingo', mondayLabel: 'FLAMINGO' },
  { nombre: 'BM CDMX', mondayLabel: 'BM-CDMX' },
  { nombre: 'Hackers Inmobiliarios', mondayLabel: 'HACKERS INMOBILIARIOS' },
  { nombre: 'Yuccali', mondayLabel: 'YUCCALI' },
  { nombre: 'Centro', mondayLabel: 'BM CENTRO' },
  { nombre: 'Dream Big Mexico', mondayLabel: 'DREAM BIG MEXICO' },
  { nombre: 'KB Asesores', mondayLabel: 'KB ASESORES' },
  { nombre: 'Estrellas Inmobiliarias', mondayLabel: 'ESTRELLAS INMOBILIARIAS' },
  { nombre: 'Conexión', mondayLabel: 'CONEXION' },
  { nombre: 'BM Virtual', mondayLabel: 'BM VIRTUAL' },
  { nombre: 'Somos la Diferencia', mondayLabel: 'SOMOS LA DIFERENCIA' },
  { nombre: 'Reinventemos', mondayLabel: 'REINVENTEMOS' },
  { nombre: 'Kuchmots', mondayLabel: 'KUCHMOTS' },
  { nombre: 'IXHA', mondayLabel: 'IXHA' },
  { nombre: 'Adara Arguello', mondayLabel: 'ADARA ARGUELLO' },
]

// Matriz TERRENOS — doc §3.1 (bolsa 15%)
type MatrizRow = {
  nombre: string
  afiliacion: number
  jorge: number
  kass: number
  diana: number
  reglaEspecial?: 'NINGUNA' | 'FLAMINGO_DIRECTO' | 'LGI_YCD_ACUMULA'
}

// Matriz Terrenos PDF v5 §3.1 — bolsa 15% (afiliación + jorge + kass + diana = 15)
// Cuando alianza es directamente de un socio (LGI, KB, Somos, Kuchmots),
// afiliación = 15% y columnas Jorge/Kass/Diana = "—" (0).
const MATRIZ_TERRENOS: MatrizRow[] = [
  { nombre: 'LGI', afiliacion: 15, jorge: 0, kass: 0, diana: 0 },
  {
    nombre: 'Flamingo',
    afiliacion: 11,
    jorge: 3,
    kass: 0,
    diana: 1,
    reglaEspecial: 'FLAMINGO_DIRECTO',
  },
  { nombre: 'BM CDMX', afiliacion: 12, jorge: 3, kass: 0, diana: 0 },
  { nombre: 'Hackers Inmobiliarios', afiliacion: 12, jorge: 3, kass: 0, diana: 0 },
  { nombre: 'Yuccali', afiliacion: 8, jorge: 3.5, kass: 3.5, diana: 0 },
  { nombre: 'Centro', afiliacion: 10, jorge: 5, kass: 0, diana: 0 },
  { nombre: 'Dream Big Mexico', afiliacion: 8, jorge: 2.5, kass: 4.5, diana: 0 },
  { nombre: 'KB Asesores', afiliacion: 15, jorge: 0, kass: 0, diana: 0 },
  { nombre: 'Estrellas Inmobiliarias', afiliacion: 13, jorge: 2, kass: 0, diana: 0 },
  { nombre: 'Conexión', afiliacion: 12, jorge: 3, kass: 0, diana: 0 },
  { nombre: 'BM Virtual', afiliacion: 8, jorge: 2.5, kass: 4.5, diana: 0 },
  { nombre: 'Somos la Diferencia', afiliacion: 15, jorge: 0, kass: 0, diana: 0 },
  { nombre: 'Reinventemos', afiliacion: 12, jorge: 3, kass: 0, diana: 0 },
  { nombre: 'Kuchmots', afiliacion: 15, jorge: 0, kass: 0, diana: 0 },
  { nombre: 'IXHA', afiliacion: 15, jorge: 0, kass: 0, diana: 0 },
  { nombre: 'Adara Arguello', afiliacion: 15, jorge: 0, kass: 0, diana: 0 },
]

// Matriz YCD — doc §3.2 (bolsa 12%, tope líder 10%)
// Matriz YCD PDF v5 §3.2 — bolsa 12% (afiliación + jorge + kass + diana = 12)
// Líder topado a 10%. Saldo lo recibe Jorge como socio operativo de Yucandoit.
// Cuando alianza es directamente de Jorge (Somos, Kuchmots), afiliación = 12% y Jorge/Kass/Diana = "—".
const MATRIZ_YCD: MatrizRow[] = [
  { nombre: 'LGI', afiliacion: 10, jorge: 2, kass: 0, diana: 0, reglaEspecial: 'LGI_YCD_ACUMULA' },
  {
    nombre: 'Flamingo',
    afiliacion: 9,
    jorge: 2,
    kass: 0,
    diana: 1,
    reglaEspecial: 'FLAMINGO_DIRECTO',
  },
  { nombre: 'BM CDMX', afiliacion: 10, jorge: 2, kass: 0, diana: 0 },
  { nombre: 'Hackers Inmobiliarios', afiliacion: 10, jorge: 2, kass: 0, diana: 0 },
  { nombre: 'Yuccali', afiliacion: 7, jorge: 3.5, kass: 1.5, diana: 0 },
  { nombre: 'Centro', afiliacion: 9, jorge: 3, kass: 0, diana: 0 },
  { nombre: 'Dream Big Mexico', afiliacion: 7, jorge: 2, kass: 3, diana: 0 },
  { nombre: 'KB Asesores', afiliacion: 10, jorge: 2, kass: 0, diana: 0 },
  { nombre: 'Estrellas Inmobiliarias', afiliacion: 10, jorge: 2, kass: 0, diana: 0 },
  { nombre: 'Conexión', afiliacion: 10, jorge: 2, kass: 0, diana: 0 },
  { nombre: 'BM Virtual', afiliacion: 10, jorge: 1, kass: 1, diana: 0 },
  { nombre: 'Somos la Diferencia', afiliacion: 12, jorge: 0, kass: 0, diana: 0 },
  { nombre: 'Reinventemos', afiliacion: 10, jorge: 2, kass: 0, diana: 0 },
  { nombre: 'Kuchmots', afiliacion: 12, jorge: 0, kass: 0, diana: 0 },
  { nombre: 'IXHA', afiliacion: 12, jorge: 0, kass: 0, diana: 0 },
  { nombre: 'Adara Arguello', afiliacion: 12, jorge: 0, kass: 0, diana: 0 },
]

// Líderes por alianza — datos de contacto y coordinación de pago
type LiderRow = {
  alianza: string
  nombre: string
  telefono: string
  email: string
  emailAlterno?: string
  coordinaPago: string
  metodoPago: 'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'OTRO'
}

const LIDERES: LiderRow[] = [
  {
    alianza: 'LGI',
    nombre: 'Kass Brambila',
    telefono: '+52 999 802 4257',
    email: 'kassiebc@gmail.com',
    emailAlterno: 'oml700910@hotmail.com',
    coordinaPago: 'OTTY',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Flamingo',
    nombre: 'Alberto Lopez',
    telefono: '+1 (562) 266-7820',
    email: 'flamingoscapital@gmail.com',
    coordinaPago: 'DIRECTO',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Hackers Inmobiliarios',
    nombre: 'Diana Jimenez',
    telefono: '+52 221 333 4933',
    email: 'dianajimendi@gmail.com',
    coordinaPago: 'DIRECTO',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Yuccali',
    nombre: 'Mayra Alvarez',
    telefono: '+52 951 533 3802',
    email: 'CoachMayraAlvarez@gmail.com',
    coordinaPago: 'DIRECTO',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Dream Big Mexico',
    nombre: 'Ofelia Ziesse',
    telefono: '+52 999 802 4257',
    email: 'kassiebc@gmail.com',
    emailAlterno: 'oml700910@hotmail.com',
    coordinaPago: 'OTTY',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Somos la Diferencia',
    nombre: 'Jorge Juarez',
    telefono: '+52 449 113 9037',
    email: 'mafferocadizg@outlook.es',
    emailAlterno: 'Jorgejuarezgomez26@gmail.com',
    coordinaPago: 'MAFF OCADIZ',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'IXHA',
    nombre: 'Jorge Juarez',
    telefono: '+52 449 113 9037',
    email: 'mafferocadizg@outlook.es',
    emailAlterno: 'Jorgejuarezgomez26@gmail.com',
    coordinaPago: 'MAFF OCADIZ',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Adara Arguello',
    nombre: 'Jorge Juarez',
    telefono: '+52 449 113 9037',
    email: 'mafferocadizg@outlook.es',
    emailAlterno: 'Jorgejuarezgomez26@gmail.com',
    coordinaPago: 'MAFF OCADIZ',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'BM CDMX',
    nombre: 'Roberto Castro',
    telefono: '+52 55 2271 9731',
    email: 'robertoexitoso@gmail.com',
    coordinaPago: 'DIRECTO',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Centro',
    nombre: 'Irving Gomez',
    telefono: '+52 771 189 7501',
    email: 'Irvinggestrada@yahoo.com.mx',
    coordinaPago: 'DIRECTO',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'KB Asesores',
    nombre: 'Kass Brambila',
    telefono: '+52 999 802 4257',
    email: 'kassiebc@gmail.com',
    emailAlterno: 'oml700910@hotmail.com',
    coordinaPago: 'OTTY',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Estrellas Inmobiliarias',
    nombre: 'Pablo Canto',
    telefono: '+52 999 381 3480',
    email: 'pablocantomaldonado@gmail.com',
    coordinaPago: 'DIRECTO',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Conexión',
    nombre: 'Diana Jimenez',
    telefono: '+52 221 333 4933',
    email: 'dianajimendi@gmail.com',
    coordinaPago: 'DIRECTO',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'BM Virtual',
    nombre: 'Jorge y Kass',
    telefono: '+52 999 802 4257',
    email: 'kassiebc@gmail.com',
    emailAlterno: 'oml700910@hotmail.com',
    coordinaPago: 'OTTY',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Reinventemos',
    nombre: 'Roberto Castro',
    telefono: '+52 55 2271 9731',
    email: 'robertoexitoso@gmail.com',
    coordinaPago: 'DIRECTO',
    metodoPago: 'EFECTIVO',
  },
  {
    alianza: 'Kuchmots',
    nombre: 'Jorge Juarez',
    telefono: '+52 449 113 9037',
    email: 'mafferocadizg@outlook.es',
    emailAlterno: 'Jorgejuarezgomez26@gmail.com',
    coordinaPago: 'MAFF OCADIZ',
    metodoPago: 'EFECTIVO',
  },
]

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seed comisiones BM CORP (doc YESYUCAN v5)...')

  // Tenant
  const [tenant] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  if (!tenant) {
    console.error('❌ Tenant "universo-jade" no existe. Corre primero npm run db:seed.')
    await sql.end()
    process.exit(1)
  }
  const tenantId = tenant.id as string

  await sql.begin(async (trx) => {
    await trx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`

    // ── Esquemas ─────────────────────────────────────────────────────────────
    // Idempotente vía check manual: existe esquema activo para (tenant, tipo)?
    async function upsertEsquema(params: {
      nombre: string
      tipoEsquema: 'ALIADOS_DEL_UNIVERSO' | 'YUCAN_PARTNERS'
      tipoProducto: 'TERRENO' | 'ACCION'
      total: number
      opBm: number
      opYc: number
      fijoJorge: number
      fijoKass: number
      bolsa: number
      asesor: number
      tope: number | null
      razon: string
    }) {
      const existing = await trx`
        SELECT id FROM esquemas_comision
        WHERE tenant_id = ${tenantId}
          AND tipo_producto = ${params.tipoProducto}
          AND activo = true
          AND deleted_at IS NULL
        LIMIT 1
      `
      if (existing.length > 0) {
        // Update valores por si el doc cambió
        await trx`
          UPDATE esquemas_comision SET
            nombre = ${params.nombre},
            porcentaje_total_cliente = ${params.total},
            porcentaje_op_bmcorp = ${params.opBm},
            porcentaje_op_yesyucan = ${params.opYc},
            porcentaje_socio_fijo_jorge = ${params.fijoJorge},
            porcentaje_socio_fijo_kass = ${params.fijoKass},
            porcentaje_bolsa_comercial = ${params.bolsa},
            porcentaje_asesor_estandar = ${params.asesor},
            porcentaje_lider_tope = ${params.tope},
            razon_social = ${params.razon},
            updated_at = NOW()
          WHERE id = ${existing[0]!.id}
        `
      } else {
        await trx`
          INSERT INTO esquemas_comision (
            tenant_id, nombre, tipo_esquema, tipo_producto,
            porcentaje_total_cliente, porcentaje_op_bmcorp, porcentaje_op_yesyucan,
            porcentaje_socio_fijo_jorge, porcentaje_socio_fijo_kass,
            porcentaje_bolsa_comercial, porcentaje_asesor_estandar,
            porcentaje_lider_tope, razon_social, fecha_inicio
          ) VALUES (
            ${tenantId}, ${params.nombre}, ${params.tipoEsquema}, ${params.tipoProducto},
            ${params.total}, ${params.opBm}, ${params.opYc},
            ${params.fijoJorge}, ${params.fijoKass}, ${params.bolsa}, ${params.asesor},
            ${params.tope}, ${params.razon}, '2026-01-01'
          )
        `
      }
    }

    await upsertEsquema({
      nombre: 'Terrenos — Aliados del Universo (Universo Jade)',
      tipoEsquema: 'ALIADOS_DEL_UNIVERSO',
      tipoProducto: 'TERRENO',
      total: 20,
      opBm: 1,
      opYc: 1,
      fijoJorge: 1.5,
      fijoKass: 1.5,
      bolsa: 15,
      asesor: 8,
      tope: null,
      razon: 'Nex Bridge (Bridge Makers)',
    })
    await upsertEsquema({
      nombre: 'YCD — Partners YCD (Yucandoit)',
      tipoEsquema: 'YUCAN_PARTNERS',
      tipoProducto: 'ACCION',
      total: 15,
      opBm: 0,
      opYc: 3,
      fijoJorge: 0,
      fijoKass: 0,
      bolsa: 12,
      asesor: 7,
      tope: 10,
      razon: 'Rentabilidad Sólida / Tixkokob Rentabilidad',
    })
    console.log('  ✓ Esquemas TERRENOS y YCD upsertados (idempotente)')

    // ── Alianzas: upsert por nombre normalizado ──────────────────────────────
    const existentes = await trx`SELECT id, nombre FROM afiliados WHERE tenant_id = ${tenantId}`
    const mapaExistentes = new Map<string, string>()
    for (const r of existentes) {
      mapaExistentes.set(normalize(r.nombre as string), r.id as string)
    }

    const idsAlianzas = new Map<string, string>()

    for (const a of ALIANZAS_DOC) {
      const claves = [normalize(a.nombre), normalize(a.mondayLabel)]
      let id: string | undefined
      for (const k of claves) {
        if (mapaExistentes.has(k)) {
          id = mapaExistentes.get(k)
          break
        }
      }
      if (id) {
        // Update mondayLabel + activo
        await trx`
          UPDATE afiliados
          SET monday_label = ${a.mondayLabel}, activo = true, updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND id = ${id}
        `
      } else {
        const [row] = await trx`
          INSERT INTO afiliados (tenant_id, nombre, monday_label, activo)
          VALUES (${tenantId}, ${a.nombre}, ${a.mondayLabel}, true)
          RETURNING id
        `
        id = row!.id as string
        mapaExistentes.set(normalize(a.nombre), id)
        mapaExistentes.set(normalize(a.mondayLabel), id)
      }
      idsAlianzas.set(a.nombre, id)
    }
    console.log(`  ✓ ${ALIANZAS_DOC.length} alianzas upsertadas`)

    // Alianzas en DB que NO están en doc → marcar para requiere config en matriz
    const nombresDoc = new Set<string>()
    for (const a of ALIANZAS_DOC) {
      nombresDoc.add(normalize(a.nombre))
      nombresDoc.add(normalize(a.mondayLabel))
    }
    let extrasMarcadas = 0
    for (const r of existentes) {
      const n = normalize(r.nombre as string)
      if (!nombresDoc.has(n)) {
        // Crear matriz placeholder con requiereConfig=true para terreno y acción
        for (const tipo of ['TERRENO', 'ACCION'] as const) {
          await trx`
            INSERT INTO matriz_alianza_producto (
              tenant_id, afiliado_id, tipo_producto,
              porcentaje_afiliacion, porcentaje_jorge_bolsa, porcentaje_kass_bolsa, porcentaje_diana_bolsa,
              regla_especial, requiere_config, activo
            ) VALUES (
              ${tenantId}, ${r.id}, ${tipo},
              0, 0, 0, 0,
              'NINGUNA', true, true
            )
            ON CONFLICT DO NOTHING
          `
        }
        extrasMarcadas++
      }
    }
    if (extrasMarcadas > 0) {
      console.log(
        `  ⚠️  ${extrasMarcadas} alianzas en Monday no documentadas → requiereConfig=true`,
      )
    }

    // ── Matriz Alianza × Producto ────────────────────────────────────────────
    for (const m of MATRIZ_TERRENOS) {
      const afiliadoId = idsAlianzas.get(m.nombre)
      if (!afiliadoId) {
        console.warn(`  skip matriz TERRENO ${m.nombre} (afiliado no encontrado)`)
        continue
      }
      await trx`
        INSERT INTO matriz_alianza_producto (
          tenant_id, afiliado_id, tipo_producto,
          porcentaje_afiliacion, porcentaje_jorge_bolsa, porcentaje_kass_bolsa, porcentaje_diana_bolsa,
          regla_especial, requiere_config, activo
        ) VALUES (
          ${tenantId}, ${afiliadoId}, 'TERRENO',
          ${m.afiliacion}, ${m.jorge}, ${m.kass}, ${m.diana},
          ${m.reglaEspecial ?? 'NINGUNA'}, false, true
        )
        ON CONFLICT (tenant_id, afiliado_id, tipo_producto) DO UPDATE SET
          porcentaje_afiliacion = EXCLUDED.porcentaje_afiliacion,
          porcentaje_jorge_bolsa = EXCLUDED.porcentaje_jorge_bolsa,
          porcentaje_kass_bolsa = EXCLUDED.porcentaje_kass_bolsa,
          porcentaje_diana_bolsa = EXCLUDED.porcentaje_diana_bolsa,
          regla_especial = EXCLUDED.regla_especial,
          requiere_config = false,
          updated_at = NOW()
      `
    }
    console.log(`  ✓ ${MATRIZ_TERRENOS.length} filas de matriz TERRENO`)

    for (const m of MATRIZ_YCD) {
      const afiliadoId = idsAlianzas.get(m.nombre)
      if (!afiliadoId) {
        console.warn(`  skip matriz YCD ${m.nombre} (afiliado no encontrado)`)
        continue
      }
      await trx`
        INSERT INTO matriz_alianza_producto (
          tenant_id, afiliado_id, tipo_producto,
          porcentaje_afiliacion, porcentaje_jorge_bolsa, porcentaje_kass_bolsa, porcentaje_diana_bolsa,
          regla_especial, requiere_config, activo
        ) VALUES (
          ${tenantId}, ${afiliadoId}, 'ACCION',
          ${m.afiliacion}, ${m.jorge}, ${m.kass}, ${m.diana},
          ${m.reglaEspecial ?? 'NINGUNA'}, false, true
        )
        ON CONFLICT (tenant_id, afiliado_id, tipo_producto) DO UPDATE SET
          porcentaje_afiliacion = EXCLUDED.porcentaje_afiliacion,
          porcentaje_jorge_bolsa = EXCLUDED.porcentaje_jorge_bolsa,
          porcentaje_kass_bolsa = EXCLUDED.porcentaje_kass_bolsa,
          porcentaje_diana_bolsa = EXCLUDED.porcentaje_diana_bolsa,
          regla_especial = EXCLUDED.regla_especial,
          requiere_config = false,
          updated_at = NOW()
      `
    }
    console.log(`  ✓ ${MATRIZ_YCD.length} filas de matriz YCD`)

    // ── Líderes de alianza ───────────────────────────────────────────────────
    let lideresUpsertados = 0
    for (const l of LIDERES) {
      const afiliadoId = idsAlianzas.get(l.alianza)
      if (!afiliadoId) {
        console.warn(`  skip líder ${l.alianza} (afiliado no encontrado)`)
        continue
      }
      const existing = await trx`
        SELECT id FROM lideres_alianza
        WHERE tenant_id = ${tenantId} AND afiliado_id = ${afiliadoId} AND deleted_at IS NULL
        LIMIT 1
      `
      if (existing.length > 0) {
        await trx`
          UPDATE lideres_alianza SET
            nombre = ${l.nombre}, telefono = ${l.telefono},
            email = ${l.email}, email_alterno = ${l.emailAlterno ?? null},
            coordina_pago = ${l.coordinaPago}, metodo_pago = ${l.metodoPago},
            updated_at = NOW()
          WHERE id = ${existing[0]!.id}
        `
      } else {
        await trx`
          INSERT INTO lideres_alianza (tenant_id, afiliado_id, nombre, telefono, email, email_alterno, coordina_pago, metodo_pago)
          VALUES (${tenantId}, ${afiliadoId}, ${l.nombre}, ${l.telefono}, ${l.email}, ${l.emailAlterno ?? null}, ${l.coordinaPago}, ${l.metodoPago})
        `
      }
      lideresUpsertados++
    }
    console.log(`  ✓ ${lideresUpsertados} líderes upsertados`)
  })

  console.log('✅ Seed comisiones completo.')
  await sql.end()
}

seed().catch((err) => {
  console.error('❌ Seed comisiones error:', err)
  process.exit(1)
})
