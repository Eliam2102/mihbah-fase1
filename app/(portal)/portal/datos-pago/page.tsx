import { requireUser } from '@/lib/auth/helpers'
import { getPerfilPortal } from '@/lib/services/comisiones/portal.service'
import { db } from '@/lib/db'
import { lideresAlianza } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { decryptField } from '@/lib/crypto/field-encryption'
import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { DatosPagoForm } from '@/components/portal/datos-pago-form'

export const metadata = { title: 'Datos de pago · Portal' }

export default async function DatosPagoPage() {
  const user = await requireUser()
  const perfil = await getPerfilPortal(user.id)
  if (!perfil || perfil.rolPortal !== 'LIDER_ALIANZA') redirect('/portal/dashboard')

  // Registro primario (todos los registros del líder comparten datos al guardar).
  const liderId = perfil.liderIds[0] ?? perfil.liderId
  if (!liderId) redirect('/portal/dashboard')

  const lider = await db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    const [row] = await tx
      .select({
        metodoPago: lideresAlianza.metodoPago,
        clabe: lideresAlianza.clabe,
        banco: lideresAlianza.banco,
        numeroCuenta: lideresAlianza.numeroCuenta,
      })
      .from(lideresAlianza)
      .where(and(eq(lideresAlianza.tenantId, perfil.tenantId), eq(lideresAlianza.id, liderId)))
      .limit(1)
    return row ?? null
  })

  return (
    <DatosPagoForm
      initial={{
        metodoPago: lider?.metodoPago ?? 'EFECTIVO',
        clabe: lider?.clabe ? (decryptField(lider.clabe) ?? '') : '',
        banco: lider?.banco ?? '',
        numeroCuenta: lider?.numeroCuenta ? (decryptField(lider.numeroCuenta) ?? '') : '',
      }}
      alianzas={perfil.alianzasNombres}
    />
  )
}
