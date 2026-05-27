import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function clean() {
  console.log('🧹 Cleaning transactional data from database...')

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined in environment.')
    process.exit(1)
  }

  await sql.begin(async (trx) => {
    // We should delete in order of dependencies (leaves first)

    // 1. Pagos aportación (depends on acuerdos_aportacion)
    const d1 = await trx`DELETE FROM pagos_aportacion`
    console.log(`  Deleted ${d1.count} rows from pagos_aportacion`)

    // 2. Acuerdos de aportación (depends on accionistas and proyectos)
    const d2 = await trx`DELETE FROM acuerdos_aportacion`
    console.log(`  Deleted ${d2.count} rows from acuerdos_aportacion`)

    // 3. Accionistas
    const d3 = await trx`DELETE FROM accionistas`
    console.log(`  Deleted ${d3.count} rows from accionistas`)

    // 4. Movimientos (transactions)
    const d4 = await trx`DELETE FROM movimientos`
    console.log(`  Deleted ${d4.count} rows from movimientos`)

    // 5. Cuentas pendientes (bills/invoices)
    const d5 = await trx`DELETE FROM cuentas_pendientes`
    console.log(`  Deleted ${d5.count} rows from cuentas_pendientes`)

    // 6. Bonos Líder
    const d10 = await trx`DELETE FROM bonos_lider`
    console.log(`  Deleted ${d10.count} rows from bonos_lider`)

    // 7. Dispersiones (references comisiones_calculadas, ventas_pago_corte, cortes_dispersion)
    const d9 = await trx`DELETE FROM dispersiones`
    console.log(`  Deleted ${d9.count} rows from dispersiones`)

    // 8. Comisiones Calculadas (references ventas_bmcorp)
    const d8 = await trx`DELETE FROM comisiones_calculadas`
    console.log(`  Deleted ${d8.count} rows from comisiones_calculadas`)

    // 9. Repartos BM Corp (references ventas_bmcorp)
    const d7 = await trx`DELETE FROM repartos_bmcorp`
    console.log(`  Deleted ${d7.count} rows from repartos_bmcorp`)

    // 10. Ventas Pago Corte (references ventas_bmcorp, cortes_dispersion)
    const d19 = await trx`DELETE FROM ventas_pago_corte`
    console.log(`  Deleted ${d19.count} rows from ventas_pago_corte`)

    // 11. Ventas BM Corp
    const d6 = await trx`DELETE FROM ventas_bmcorp`
    console.log(`  Deleted ${d6.count} rows from ventas_bmcorp`)

    // 12. Cortes Dispersión
    const d20 = await trx`DELETE FROM cortes_dispersion`
    console.log(`  Deleted ${d20.count} rows from cortes_dispersion`)

    // 13. Pautas Digitales
    const d11 = await trx`DELETE FROM pautas_digitales`
    console.log(`  Deleted ${d11.count} rows from pautas_digitales`)

    // 14. Comprobantes de pago
    const d12 = await trx`DELETE FROM comprobantes_pago`
    console.log(`  Deleted ${d12.count} rows from comprobantes_pago`)

    // 15. NPS Registros
    const d13 = await trx`DELETE FROM nps_registros`
    console.log(`  Deleted ${d13.count} rows from nps_registros`)

    // 16. Excel uploads
    const d14 = await trx`DELETE FROM excel_uploads`
    console.log(`  Deleted ${d14.count} rows from excel_uploads`)

    const d15 = await trx`DELETE FROM excel_upload_summaries`
    console.log(`  Deleted ${d15.count} rows from excel_upload_summaries`)

    // 17. Sincronizaciones Monday
    const d16 = await trx`DELETE FROM sincronizaciones_monday`
    console.log(`  Deleted ${d16.count} rows from sincronizaciones_monday`)

    // 18. Audit Logs
    const d17 = await trx`DELETE FROM audit_logs`
    console.log(`  Deleted ${d17.count} rows from audit_logs`)

    // 19. Notifications
    const d18 = await trx`DELETE FROM notifications`
    console.log(`  Deleted ${d18.count} rows from notifications`)

    // 20. Usuarios Portal
    const d21 = await trx`DELETE FROM usuarios_portal`
    console.log(`  Deleted ${d21.count} rows from usuarios_portal`)

    console.log(
      '✅ Cleanup complete. All transactional and seed tables cleared, catalog and auth configurations preserved.',
    )
  })

  await sql.end()
}

clean().catch((err) => {
  console.error('❌ Cleanup failed:', err)
  process.exit(1)
})
