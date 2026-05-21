import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getPautasDelMes } from '@/lib/services/comisiones/pautas.service'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PautasView } from '@/components/comisiones/pautas-view'

export const metadata = { title: 'Pautas digitales · Comisiones' }

export default async function PautasPage({
  params,
  searchParams,
}: {
  params: Promise<{ empresaId: string }>
  searchParams: Promise<{ anio?: string; mes?: string }>
}) {
  const { empresaId } = await params
  const sp = await searchParams
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const hoy = new Date()
  const anio = sp.anio ? Number(sp.anio) : hoy.getFullYear()
  const mes = sp.mes ? Number(sp.mes) : hoy.getMonth() + 1

  const pautas = await getPautasDelMes(tenantId, anio, mes)

  return (
    <section className="3xl:p-12 w-full space-y-4 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/comisiones`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Comisiones
      </Link>

      <div>
        <h1 className="text-foreground text-xl font-bold sm:text-2xl">Pautas digitales</h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Captura ejecutado mensual · histórico 6 meses · gap informativo
        </p>
      </div>

      <PautasView empresaId={empresaId} anio={anio} mes={mes} pautas={pautas} />
    </section>
  )
}
