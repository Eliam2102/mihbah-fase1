import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { ProyectosBmcorpView } from '@/components/proyectos/proyectos-bmcorp-view'
import { ProyectosExcelView } from '@/components/proyectos/proyectos-excel-view'

export default async function ProyectosPage({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  const user = await requireUser()
  const empresa = await requireEmpresaAccess(user, empresaId, 'proyectos')
  const tenantId = user.tenantId!

  return (
    <section className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Proyectos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {empresa.tipo === 'COMERCIAL'
              ? 'Rendimiento y ventas por cada desarrollo inmobiliario comercializado.'
              : `${empresa.name} · Proyectos y movimientos asociados.`}
          </p>
        </div>
      </div>

      {empresa.tipo === 'COMERCIAL' ? (
        <ProyectosBmcorpView empresaId={empresaId} tenantId={tenantId} />
      ) : (
        <ProyectosExcelView
          empresaId={empresaId}
          tenantId={tenantId}
          empresaNombre={empresa.name}
        />
      )}
    </section>
  )
}
