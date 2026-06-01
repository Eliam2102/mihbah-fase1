import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getLideres, getAfiliados } from '@/lib/services/comisiones/alianzas.service'
import { db } from '@/lib/db'
import { ventasBmcorp } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft, Info, Award, Sparkles, ShieldCheck, Flame, Compass } from 'lucide-react'
import { NivelesView } from '@/components/comisiones/niveles-view'

export const metadata = { title: 'Niveles membresía · Comisiones' }

export default async function NivelesPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const [lideres, afiliados] = await Promise.all([
    getLideres(tenantId, false),
    getAfiliados(tenantId, false),
  ])

  // Ventas del mes actual por alianza — determina si aplica bono este mes.
  // El motor usa la fecha de cada venta; la UI muestra el mes en curso.
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10)

  const ventasPorAfiliado = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select({
        afiliadoId: ventasBmcorp.afiliadoId,
        ventasMes: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}), 0)::text`,
        ventas: sql<number>`COUNT(*)::int`,
      })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          inArray(ventasBmcorp.estadoVenta, ['FINALIZADA', 'FINALIZADO_Y_LIQUIDADO']),
          gte(ventasBmcorp.fecha, inicioMes),
          lte(ventasBmcorp.fecha, finMes),
        ),
      )
      .groupBy(ventasBmcorp.afiliadoId)
  })

  const afiliadoMap = new Map(afiliados.map((a) => [a.id, a.nombre]))
  const ventasMesMap = new Map(ventasPorAfiliado.map((v) => [v.afiliadoId, Number(v.ventasMes)]))

  const data = lideres.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    alianzaNombre: afiliadoMap.get(l.afiliadoId) ?? 'Sin alianza',
    nivelActual: l.nivel,
    promedioMensual: ventasMesMap.get(l.afiliadoId) ?? 0,
  }))

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      {/* Botón de regreso premium */}
      <Link
        href={`/empresa/${empresaId}/comisiones/alianzas`}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
        <span>Volver a Alianzas</span>
      </Link>

      {/* Encabezado Principal */}
      <div className="from-background via-muted/30 to-background relative overflow-hidden rounded-2xl border bg-gradient-to-r p-6 shadow-sm md:p-8">
        <div className="bg-primary/5 absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full blur-3xl" />
        <div className="relative space-y-2">
          <div className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            <span>Módulo de Reconocimiento</span>
          </div>
          <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
            Niveles de membresía
          </h1>
          <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed md:text-base">
            Administración del nivel de incentivos para los líderes de alianza. El nivel define el{' '}
            <span className="text-foreground font-semibold">bono de comisión adicional</span> al
            alcanzar las metas comerciales. El sistema evalúa las ventas del mes en curso para
            recomendar un nivel; usted puede verificar y autorizar el cambio manualmente.
          </p>
        </div>
      </div>

      {/* Umbrales de Membresías - YESYUCAN v5 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tarjeta Terrenos */}
        <div className="bg-card group relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300 hover:border-emerald-500/30 hover:shadow-md">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/5 blur-xl transition-colors group-hover:bg-emerald-500/10" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-foreground font-bold">Terrenos</h3>
              <p className="text-muted-foreground text-xs font-medium">Aliados del Universo</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* JADE */}
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-3 transition-colors hover:bg-emerald-500/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-foreground text-xs font-bold">Jade</p>
                  <p className="text-muted-foreground text-[10px]">≥ $5.0 MDP / mes</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                +3.0% bono
              </span>
            </div>

            {/* TURQUESA */}
            <div className="flex items-center justify-between rounded-lg border border-cyan-500/10 bg-cyan-500/[0.03] p-3 transition-colors hover:bg-cyan-500/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-foreground text-xs font-bold">Turquesa</p>
                  <p className="text-muted-foreground text-[10px]">$3.5 – $4.9 MDP / mes</p>
                </div>
              </div>
              <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                +2.0% bono
              </span>
            </div>

            {/* ONIX */}
            <div className="flex items-center justify-between rounded-lg border border-slate-500/10 bg-slate-500/[0.03] p-3 transition-colors hover:bg-slate-500/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-500/20 text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-foreground text-xs font-bold">Ónix Negro</p>
                  <p className="text-muted-foreground text-[10px]">$2.0 – $3.5 MDP / mes</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                +1.0% bono
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta YCD */}
        <div className="bg-card group relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-300 hover:border-violet-500/30 hover:shadow-md">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-violet-500/5 blur-xl transition-colors group-hover:bg-violet-500/10" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-foreground font-bold">YCD</h3>
              <p className="text-muted-foreground text-xs font-medium">Partners Yucandoit</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* JADE */}
            <div className="flex items-center justify-between rounded-lg border border-violet-500/10 bg-violet-500/[0.03] p-3 transition-colors hover:bg-violet-500/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-foreground text-xs font-bold">Jade</p>
                  <p className="text-muted-foreground text-[10px]">≥ $3.0 MDP / mes</p>
                </div>
              </div>
              <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                +1.5% bono
              </span>
            </div>

            {/* TURQUESA */}
            <div className="flex items-center justify-between rounded-lg border border-indigo-500/10 bg-indigo-500/[0.03] p-3 transition-colors hover:bg-indigo-500/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-foreground text-xs font-bold">Turquesa</p>
                  <p className="text-muted-foreground text-[10px]">$2.0 – $3.0 MDP / mes</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                +1.0% bono
              </span>
            </div>

            {/* ONIX */}
            <div className="flex items-center justify-between rounded-lg border border-slate-500/10 bg-slate-500/[0.03] p-3 transition-colors hover:bg-slate-500/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-500/20 text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-foreground text-xs font-bold">Ónix Negro</p>
                  <p className="text-muted-foreground text-[10px]">$1.0 – $2.0 MDP / mes</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                +0.5% bono
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Vista de Tabla e Interacción */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Info className="text-primary h-4.5 w-4.5" />
          <h2 className="text-foreground text-lg font-bold">Asignación y Sugerencias de Nivel</h2>
        </div>
        <NivelesView empresaId={empresaId} lideres={data} />
      </div>
    </section>
  )
}
