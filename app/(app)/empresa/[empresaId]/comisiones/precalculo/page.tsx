import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getAfiliados } from '@/lib/services/comisiones/alianzas.service'
import { PrecalculoForm } from '@/components/comisiones/precalculo-form'

export const metadata = { title: 'Precálculo · Comisiones' }

export default async function PrecalculoPage({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const afiliados = await getAfiliados(tenantId)

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Precálculo</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Simulador antes del reporte oficial. Resultado inline, no persiste en DB.
        </p>
      </div>
      <PrecalculoForm afiliados={afiliados.map((a) => ({ id: a.id, nombre: a.nombre }))} />
    </section>
  )
}
