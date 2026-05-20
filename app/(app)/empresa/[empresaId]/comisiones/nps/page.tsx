import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getRegistrosNps } from '@/app/actions/comisiones/nps'
import { NpsView } from '@/components/comisiones/nps-view'

export const metadata = { title: 'NPS interno · BM CORP' }

export default async function NpsPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!
  const registros = await getRegistrosNps(tenantId)

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <div>
        <h1 className="text-foreground text-2xl font-bold">NPS interno</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Captura trimestral del NPS por empresa. Joana registra desde Typeform/Google Forms.
          Semáforo: Verde &gt; 50 · Amarillo 0–50 · Rojo &lt; 0.
        </p>
      </div>
      <NpsView empresaId={empresaId} registros={registros} />
    </section>
  )
}
