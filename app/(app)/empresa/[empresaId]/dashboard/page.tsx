import { Suspense } from 'react'
import { requireUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { empresas } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { PeriodFilter } from './period-filter'
import { DashboardMihbah } from './dashboard-mihbah'
import { DashboardYcdi } from './dashboard-ycdi'

// ─── 💡 Next.js Concept: searchParams ────────────────────────────────────────
// En Next.js App Router, los parámetros de URL (?anio=2026&mes=5) llegan como
// `searchParams` props al Server Component. No necesitas useState ni useEffect.
// El servidor re-renderiza la página automáticamente cuando cambia la URL.
// ─────────────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ empresaId: string }>
  searchParams: Promise<{ anio?: string; mes?: string }>
}

export default async function DashboardEmpresaPage({ params, searchParams }: PageProps) {
  const { empresaId } = await params
  const sp = await searchParams

  // 💡 Next.js: requireUser() corre en el SERVIDOR — sin exponer datos al cliente
  const user = await requireUser()
  const tenantId = user.tenantId!

  const anio = Number(sp.anio ?? new Date().getFullYear())
  const mes = sp.mes ? Number(sp.mes) : undefined

  // Detectar tipo de empresa — necesita RLS configurado primero
  // 💡 Si no se configura el tenant_id, RLS bloquea la query y devuelve vacío
  const [empresa] = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
    return tx
      .select({ tipo: empresas.tipo, name: empresas.name })
      .from(empresas)
      .where(eq(empresas.id, empresaId))
      .limit(1)
  })

  const tipo = empresa?.tipo ?? 'CONSTRUCTORA'

  return (
    <section className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Dashboard — {empresa?.name ?? ''}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {mes
              ? `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mes - 1]} ${anio}`
              : `Año ${anio} — Acumulado`}
          </p>
        </div>
        {/* 💡 Suspense envuelve componentes Client con async data — evita bloquear SSR */}
        <Suspense>
          <PeriodFilter />
        </Suspense>
      </div>

      {/* 💡 Renderizado condicional según tipo de empresa */}
      {tipo === 'CAPITAL' ? (
        <DashboardYcdi empresaId={empresaId} tenantId={tenantId} />
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
