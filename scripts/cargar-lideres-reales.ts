/**
 * Carga 16 líderes reales desde directorio del cliente.
 * Borra líderes viejos (Eliam Cauich BM CDMX + cualquier placeholder) y crea limpio.
 * Asocia matrices alianza × producto al líder correspondiente.
 *
 * Después: asesores quedan SIN líder (Joana asigna desde UI).
 */
import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

interface LiderInput {
  alianza: string // nombre como aparece en DB (mondayLabel o nombre)
  nombre: string
  telefono: string
  coordinaPago: string
  comentario: string
}

// 16 líderes del directorio (Excel)
const LIDERES: LiderInput[] = [
  {
    alianza: 'LGI',
    nombre: 'KASS BRAMBILA',
    telefono: '+52 999 802 4257',
    coordinaPago: 'OTTY',
    comentario: 'Grupo pagos LGI',
  },
  {
    alianza: 'FLAMINGO',
    nombre: 'ALBERTO LOPEZ',
    telefono: '+1 562 266 7820',
    coordinaPago: 'DIRECTO',
    comentario: 'A Diana se le paga el % correspondiente',
  },
  {
    alianza: 'Hackers Inmobiliarios',
    nombre: 'DIANA JIMENEZ',
    telefono: '+52 221 333 4933',
    coordinaPago: 'DIRECTO',
    comentario: 'Venta directa',
  },
  {
    alianza: 'YUCCALI',
    nombre: 'MAYRA ALVAREZ',
    telefono: '+52 951 533 3802',
    coordinaPago: 'DIRECTO',
    comentario: 'Se hace el resguardo del % de Jorge y se paga lo de Kass',
  },
  {
    alianza: 'DREAM BIG MEXICO',
    nombre: 'OFELIA ZIESSE',
    telefono: '+52 999 802 4257',
    coordinaPago: 'OTTY',
    comentario: 'Grupo pagos LGI',
  },
  {
    alianza: 'SOMOS LA DIFERENCIA',
    nombre: 'JORGE JUAREZ',
    telefono: '+52 449 113 9037',
    coordinaPago: 'MAFF OCADIZ',
    comentario: 'Se aplica el esquema normal y se paga el diferencial a Jorge',
  },
  {
    alianza: 'IXHA',
    nombre: 'JORGE JUAREZ',
    telefono: '+52 449 113 9037',
    coordinaPago: 'MAFF OCADIZ',
    comentario: 'IXCHE en directorio cliente — confirmar si IXHA en Monday es la misma',
  },
  {
    alianza: 'ADARA ARGUELLO',
    nombre: 'JORGE JUAREZ',
    telefono: '+52 449 113 9037',
    coordinaPago: 'MAFF OCADIZ',
    comentario: 'Se aplica el esquema normal y se paga el diferencial a Jorge',
  },
  {
    alianza: 'BM CDMX',
    nombre: 'ROBERTO CASTRO',
    telefono: '+52 55 2271 9731',
    coordinaPago: 'DIRECTO',
    comentario: 'A Diana se le paga el % correspondiente',
  },
  {
    alianza: 'BM Centro',
    nombre: 'IRVING GOMEZ',
    telefono: '+52 771 189 7501',
    coordinaPago: 'DIRECTO',
    comentario: 'A Jorge se le acumula el % correspondiente',
  },
  {
    alianza: 'KB Asesores',
    nombre: 'KASS BRAMBILA',
    telefono: '+52 999 802 4257',
    coordinaPago: 'OTTY',
    comentario: 'Grupo pagos LGI',
  },
  {
    alianza: 'Estrellas Inmobiliarias',
    nombre: 'PABLO CANTO',
    telefono: '52 999 381 3480',
    coordinaPago: 'DIRECTO',
    comentario: 'A Jorge se le acumula el % correspondiente',
  },
  {
    alianza: 'Conexión',
    nombre: 'DIANA JIMENEZ',
    telefono: '+52 221 333 4933',
    coordinaPago: 'DIRECTO',
    comentario: 'A Diana se le paga el % correspondiente',
  },
  {
    alianza: 'BM Virtual',
    nombre: 'JORGE Y KASS',
    telefono: '+52 999 802 4257',
    coordinaPago: 'OTTY',
    comentario: 'Grupo pagos LGI',
  },
  {
    alianza: 'Reinventemos',
    nombre: 'ROBERTO CASTRO',
    telefono: '+52 55 2271 9731',
    coordinaPago: 'DIRECTO',
    comentario: 'A Diana se le paga el % correspondiente',
  },
  {
    alianza: 'Kuchmots',
    nombre: 'JORGE JUAREZ',
    telefono: '+52 449 113 9037',
    coordinaPago: 'MAFF OCADIZ',
    comentario: 'Se aplica el esquema normal y se paga el diferencial a Jorge',
  },
]

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
}

async function main() {
  const [t] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  if (!t) throw new Error('Tenant no existe')
  const tenantId = t.id as string

  await sql.begin(async (trx) => {
    await trx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`

    // 1. Cargar todas las alianzas activas
    const alianzas =
      await trx`SELECT id, nombre FROM afiliados WHERE tenant_id = ${tenantId} AND activo = true`
    const mapAlianza = new Map<string, string>()
    for (const a of alianzas) {
      mapAlianza.set(norm(a.nombre as string), a.id as string)
    }

    // 2. Borrar líderes existentes (los placeholders + Eliam Cauich)
    // Antes desvincular asesores y matrices
    await trx`UPDATE asesores SET lider_id = NULL WHERE tenant_id = ${tenantId}`
    await trx`UPDATE matriz_alianza_producto SET lider_id = NULL WHERE tenant_id = ${tenantId}`
    // Borrar cuentas usuariosPortal de líderes existentes
    await trx`DELETE FROM usuarios_portal WHERE tenant_id = ${tenantId} AND lider_id IS NOT NULL`
    const deleted =
      await trx`DELETE FROM lideres_alianza WHERE tenant_id = ${tenantId} RETURNING id`
    console.log(`Líderes anteriores borrados: ${deleted.length}`)

    // 3. Insertar 16 líderes reales
    let creados = 0
    let skip = 0
    for (const L of LIDERES) {
      const afiliadoId = mapAlianza.get(norm(L.alianza))
      if (!afiliadoId) {
        console.warn(`  skip: alianza "${L.alianza}" no encontrada en DB`)
        skip++
        continue
      }
      const [row] = await trx`
        INSERT INTO lideres_alianza (
          tenant_id, afiliado_id, nombre, telefono, coordina_pago
        ) VALUES (
          ${tenantId}, ${afiliadoId}, ${L.nombre}, ${L.telefono}, ${L.coordinaPago}
        )
        RETURNING id
      `
      if (!row) throw new Error(`Insert no retornó id para ${L.alianza}`)
      // Vincular líder a la matriz de la alianza (Terrenos + YCD)
      await trx`
        UPDATE matriz_alianza_producto
        SET lider_id = ${row.id}
        WHERE tenant_id = ${tenantId} AND afiliado_id = ${afiliadoId}
      `
      creados++
    }
    console.log(`Líderes creados: ${creados} (skip: ${skip})`)

    // 4. Vincular asesores a sus líderes via afiliadoId
    const linked = await trx`
      UPDATE asesores ase
      SET lider_id = l.id
      FROM lideres_alianza l
      WHERE ase.tenant_id = ${tenantId}
        AND ase.lider_id IS NULL
        AND ase.afiliado_id = l.afiliado_id
      RETURNING ase.id
    `
    console.log(`Asesores re-vinculados a líder real: ${linked.length}`)

    // 5. Si ADARA o IXHA no tienen matriz configurada, configurarla como Jorge (15% / 12%)
    for (const nombre of ['ADARA ARGUELLO']) {
      const afId = mapAlianza.get(norm(nombre))
      if (!afId) continue
      for (const tipo of ['TERRENO', 'ACCION'] as const) {
        const total = tipo === 'TERRENO' ? 15 : 12
        await trx`
          UPDATE matriz_alianza_producto
          SET porcentaje_afiliacion = ${total},
              porcentaje_jorge_bolsa = 0,
              porcentaje_kass_bolsa = 0,
              porcentaje_diana_bolsa = 0,
              regla_especial = 'NINGUNA',
              requiere_config = false,
              updated_at = NOW()
          WHERE tenant_id = ${tenantId} AND afiliado_id = ${afId} AND tipo_producto = ${tipo}
        `
      }
      console.log(`  ✓ Matriz ${nombre} configurada como alianza de Jorge`)
    }

    // IXHA queda en requiereConfig=true (cliente confirma si es IXCHE)
  })

  // Verificar resultado
  const r = await sql`
    SELECT a.nombre AS alianza, l.nombre AS lider, l.telefono, l.coordina_pago
    FROM lideres_alianza l
    JOIN afiliados a ON a.id = l.afiliado_id
    WHERE l.tenant_id = ${(await sql`SELECT id FROM tenants WHERE slug='universo-jade'`)[0]!.id}
      AND l.activo = true
    ORDER BY a.nombre
  `
  console.log('\nLíderes finales:')
  for (const x of r as unknown as {
    alianza: string
    lider: string
    telefono: string
    coordina_pago: string
  }[]) {
    console.log(
      `  ${x.alianza.padEnd(28)} | ${x.lider.padEnd(20)} | ${x.coordina_pago.padEnd(12)} | ${x.telefono}`,
    )
  }

  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
