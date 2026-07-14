import { Suspense } from 'react'
import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getAñosConDatos } from '@/lib/services/flujo/flujo.service'
import { getAñosConDatosBmcorp } from '@/lib/services/flujo-bmcorp/flujo-bmcorp.service'
import { PeriodFilter } from './period-filter'
import { DashboardMihbah } from './dashboard-mihbah'
import { DashboardYcdi } from './dashboard-ycdi'
import { DashboardBmcorp } from './dashboard-bmcorp'

interface PageProps {
  params: Promise<{ empresaId: string }>
  searchParams: Promise<{ anio?: string; mes?: string }>
}

export default async function DashboardEmpresaPage({ params, searchParams }: PageProps) {
  const { empresaId } = await params
  const sp = await searchParams

  const user = await requireUser()
  const empresa = await requireEmpresaAccess(user, empresaId, 'dashboard')
  const tenantId = user.tenantId!

  const tipo = empresa.tipo

  const añosRaw =
    tipo === 'COMERCIAL'
      ? await getAñosConDatosBmcorp(empresaId, tenantId)
      : await getAñosConDatos(empresaId, tenantId)

  const currentYear = new Date().getFullYear()
  const años = añosRaw.length > 0 ? añosRaw : [currentYear]
  const defaultAnio = años[0]!

  const anioRaw = sp.anio ? Number(sp.anio) : defaultAnio
  const anio = años.includes(anioRaw) ? anioRaw : defaultAnio
  const mes = sp.mes ? Number(sp.mes) : undefined

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Dashboard — {empresa.name}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {mes
              ? `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mes - 1]} ${anio}`
              : `Año ${anio} — Acumulado`}
          </p>
        </div>
        <Suspense>
          <PeriodFilter años={años} defaultAnio={defaultAnio} />
        </Suspense>
      </div>

      {tipo === 'CAPITAL' ? (
        <DashboardYcdi
          empresaId={empresaId}
          tenantId={tenantId}
          anio={anio}
          {...(mes ? { mes } : {})}
        />
      ) : tipo === 'COMERCIAL' ? (
        <DashboardBmcorp
          empresaId={empresaId}
          tenantId={tenantId}
          anio={anio}
          {...(mes ? { mes } : {})}
        />
      ) : (
        <DashboardMihbah
          empresaId={empresaId}
          tenantId={tenantId}
          anio={anio}
          {...(mes ? { mes } : {})}
        />
      )}
    </section>
  )
}
