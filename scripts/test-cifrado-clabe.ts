/**
 * Test funcional: verifica que CLABE se guarda cifrada en DB y se descifra al leer.
 */
import 'dotenv/config'
import postgres from 'postgres'
import {
  crearLider,
  getLiderById,
  desactivarLider,
} from '@/lib/services/comisiones/alianzas.service'

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
  const [t] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  const tenantId = t!.id as string
  const [af] =
    await sql`SELECT id FROM afiliados WHERE tenant_id = ${tenantId} AND nombre = 'LGI' LIMIT 1`
  const afiliadoId = af!.id as string

  const CLABE_PLAIN = '002180123456789012'
  const CUENTA_PLAIN = '12345678'

  // Crear líder de prueba con datos sensibles
  const lider = await crearLider(tenantId, {
    afiliadoId,
    nombre: '[TEST CIFRADO] Líder Prueba',
    clabe: CLABE_PLAIN,
    numeroCuenta: CUENTA_PLAIN,
    banco: 'BBVA',
  })
  console.log('Líder creado, id:', lider.id)
  console.log('  CLABE retornada por servicio (descifrada):', lider.clabe)
  console.log('  Cuenta retornada por servicio (descifrada):', lider.numeroCuenta)

  // Leer crudo de DB
  const [raw] = await sql`SELECT clabe, numero_cuenta FROM lideres_alianza WHERE id = ${lider.id}`
  console.log('\nCrudo en DB:')
  console.log('  clabe:', raw!.clabe)
  console.log('  numero_cuenta:', raw!.numero_cuenta)

  // Releer via servicio
  const releido = await getLiderById(tenantId, lider.id)
  console.log('\nReleído via getLiderById:')
  console.log('  clabe:', releido!.clabe)
  console.log('  numero_cuenta:', releido!.numeroCuenta)

  // Verificación
  const okEnDb = String(raw!.clabe).startsWith('enc:v1:')
  const okDescifra = releido!.clabe === CLABE_PLAIN
  console.log('\n═══ VERIFICACIÓN ═══')
  console.log('  En DB cifrada (formato enc:v1:):', okEnDb ? '✓' : '✗')
  console.log('  Servicio descifra correctamente:', okDescifra ? '✓' : '✗')

  // Cleanup
  await desactivarLider(tenantId, lider.id)
  await sql`DELETE FROM lideres_alianza WHERE id = ${lider.id}`
  console.log('\nLíder de prueba eliminado.')

  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
