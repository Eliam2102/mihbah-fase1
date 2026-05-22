import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getAfiliados, getEsquemas, getLideres } from '@/lib/services/comisiones'
import { db } from '@/lib/db'
import {
  comisionesCalculadas,
  dispersiones,
  matrizAlianzaProducto,
  usuariosPortal,
} from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import {
  Users,
  Percent,
  Wallet,
  Receipt,
  Calculator,
  ShieldCheck,
  Smile,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Megaphone,
} from 'lucide-react'
// CheckCircle2 ya importado arriba

export const metadata = { title: 'Comisiones · BM CORP' }

async function getEstado(tenantId: string, empresaId: string) {
  const [afiliados, lideres, esquemas] = await Promise.all([
    getAfiliados(tenantId, false),
    getLideres(tenantId, false),
    getEsquemas(tenantId),
  ])

  const stats = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    const [comisiones] = await tx
      .select({
        total: sql<number>`COUNT(*)::int`,
        sinConfig: sql<number>`COUNT(*) FILTER (WHERE ${comisionesCalculadas.sinConfig} = true)::int`,
        bruta: sql<string>`COALESCE(SUM(${comisionesCalculadas.comisionBrutaTotal}), 0)`,
      })
      .from(comisionesCalculadas)
      .where(eq(comisionesCalculadas.tenantId, tenantId))
    const [disp] = await tx
      .select({
        total: sql<number>`COUNT(*)::int`,
        pendientes: sql<number>`COUNT(*) FILTER (WHERE ${dispersiones.estado} IN ('PENDIENTE','PARCIAL','DIFERIDO'))::int`,
        pendientesMonto: sql<string>`COALESCE(SUM(${dispersiones.montoTotal} - ${dispersiones.montoPagado}) FILTER (WHERE ${dispersiones.estado} != 'PAGADO'), 0)`,
        pagado: sql<string>`COALESCE(SUM(${dispersiones.montoPagado}), 0)`,
      })
      .from(dispersiones)
      .where(eq(dispersiones.tenantId, tenantId))
    const [matriz] = await tx
      .select({
        pendientes: sql<number>`COUNT(*) FILTER (WHERE ${matrizAlianzaProducto.requiereConfig} = true)::int`,
      })
      .from(matrizAlianzaProducto)
      .where(eq(matrizAlianzaProducto.tenantId, tenantId))
    const [portal] = await tx
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(usuariosPortal)
      .where(eq(usuariosPortal.tenantId, tenantId))
    return { comisiones, disp, matriz, portal }
  })

  const alianzasSinLider = afiliados.filter(
    (a) => !lideres.some((l) => l.afiliadoId === a.id),
  ).length

  // Próximo paso recomendado
  let proximoPaso: { title: string; href: string; cta: string } | null = null
  if ((esquemas.filter((e) => e.activo).length ?? 0) < 2) {
    proximoPaso = {
      title: 'Faltan esquemas globales',
      href: `/empresa/${empresaId}/comisiones/esquemas`,
      cta: 'Ver esquemas',
    }
  } else if (alianzasSinLider > 0) {
    proximoPaso = {
      title: `${alianzasSinLider} alianza${alianzasSinLider === 1 ? '' : 's'} sin líder`,
      href: `/empresa/${empresaId}/comisiones/alianzas`,
      cta: 'Asignar líderes',
    }
  } else if ((stats.matriz?.pendientes ?? 0) > 0) {
    proximoPaso = {
      title: `${stats.matriz!.pendientes} matri${stats.matriz!.pendientes === 1 ? 'z' : 'ces'} pendientes`,
      href: `/empresa/${empresaId}/comisiones/alianzas`,
      cta: 'Configurar matriz',
    }
  } else if ((stats.comisiones?.total ?? 0) === 0) {
    proximoPaso = {
      title: 'Aún no hay ventas con comisión',
      href: `/empresa/${empresaId}/monday`,
      cta: 'Sincronizar Monday',
    }
  } else if ((stats.disp?.pendientes ?? 0) > 0) {
    proximoPaso = {
      title: `${stats.disp!.pendientes} dispersiones pendientes de pago`,
      href: `/empresa/${empresaId}/comisiones/dispersiones`,
      cta: 'Ver pagos',
    }
  }

  return {
    stats,
    proximoPaso,
    totalAlianzas: afiliados.length,
    totalEsquemas: esquemas.length,
    totalPortal: stats.portal?.total ?? 0,
  }
}

export default async function ComisionesLanding({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const data = await getEstado(tenantId, empresaId)
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const comisionesBruta = Number(data.stats.comisiones?.bruta ?? '0')
  const dispersionesPagado = Number(data.stats.disp?.pagado ?? '0')
  const pendientesMonto = Number(data.stats.disp?.pendientesMonto ?? '0')

  return (
    <section className="3xl:p-12 w-full space-y-4 p-3 sm:space-y-6 sm:p-6 xl:p-10">
      {/* Header — stack on mobile, row on tablet+ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-xl font-bold sm:text-2xl">Comisiones BM CORP</h1>
          <p className="text-muted-foreground mt-1 text-sm">Calcula, dispersa y paga comisiones.</p>
        </div>
        <Link
          href={`/empresa/${empresaId}/comisiones/guia`}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex w-fit shrink-0 items-center gap-1 rounded-md px-3 py-2 text-xs"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>¿Primera vez? Ver guía</span>
        </Link>
      </div>

      {/* Próximo paso — solo si hay algo pendiente */}
      {data.proximoPaso ? (
        <Link
          href={data.proximoPaso.href}
          className="border-primary/40 bg-primary/5 hover:bg-primary/10 flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground shrink-0 rounded-md p-2">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-semibold uppercase">Por hacer</p>
              <p className="text-foreground text-sm font-medium">{data.proximoPaso.title}</p>
            </div>
          </div>
          <span className="text-primary inline-flex shrink-0 items-center gap-1 self-end text-xs font-medium sm:self-auto">
            {data.proximoPaso.cta}
            <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      ) : (
        <div className="border-success/40 bg-success/10 text-success flex items-center gap-3 rounded-lg border p-3 sm:p-4">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Todo al día. Sin pendientes.</p>
        </div>
      )}

      {/* 3 KPIs — 1 col mobile, 3 col tablet+ */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:gap-4">
        <Kpi
          icon={<Calculator className="h-4 w-4" />}
          label="Comisión bruta total"
          value={fmt(comisionesBruta)}
          sub={`${data.stats.comisiones?.total ?? 0} ventas`}
        />
        <Kpi
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Pagado"
          value={fmt(dispersionesPagado)}
          sub={`${(data.stats.disp?.total ?? 0) - (data.stats.disp?.pendientes ?? 0)} dispersiones`}
          accent="success"
        />
        <Kpi
          icon={<Wallet className="h-4 w-4" />}
          label="Pendiente"
          value={fmt(pendientesMonto)}
          sub={`${data.stats.disp?.pendientes ?? 0} dispersiones`}
          accent="warning"
        />
      </div>

      {/* Acciones — 1 col mobile, 2 tablet, 3 desktop, 6 ultra-wide */}
      <div className="3xl:grid-cols-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:gap-4">
        <Action
          href={`/empresa/${empresaId}/monday`}
          icon={<RefreshCw className="h-5 w-5" />}
          title="Sincronizar Monday"
          desc="Traer ventas nuevas y calcular comisiones"
        />
        <Action
          href={`/empresa/${empresaId}/ventas`}
          icon={<Receipt className="h-5 w-5" />}
          title="Ventas con comisión"
          desc={`${data.stats.comisiones?.total ?? 0} ventas calculadas`}
        />
        <Action
          href={`/empresa/${empresaId}/comisiones/dispersiones`}
          icon={<Wallet className="h-5 w-5" />}
          title="Dispersiones a pagar"
          desc={
            (data.stats.disp?.pendientes ?? 0) > 0
              ? `${data.stats.disp!.pendientes} pendientes`
              : 'Todo pagado'
          }
          accent={(data.stats.disp?.pendientes ?? 0) > 0 ? 'warning' : undefined}
        />
        <Action
          href={`/empresa/${empresaId}/comisiones/alianzas`}
          icon={<Users className="h-5 w-5" />}
          title="Alianzas, líderes, asesores"
          desc={`${data.totalAlianzas} alianzas`}
        />
        <Action
          href={`/empresa/${empresaId}/comisiones/portal-usuarios`}
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Usuarios del portal"
          desc={`${data.totalPortal} cuentas creadas`}
        />
        <Action
          href={`/empresa/${empresaId}/comisiones/precalculo`}
          icon={<Calculator className="h-5 w-5" />}
          title="Precálculo"
          desc="Simulador antes de procesar"
        />
      </div>

      {/* Cards secundarias compactas — 1 col mobile, 3 col tablet+ */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <SecondaryLink
          href={`/empresa/${empresaId}/comisiones/esquemas`}
          icon={<Percent className="h-3.5 w-3.5" />}
          label="Esquemas globales"
          count={`${data.totalEsquemas} esquemas`}
        />
        <SecondaryLink
          href={`/empresa/${empresaId}/comisiones/nps`}
          icon={<Smile className="h-3.5 w-3.5" />}
          label="NPS interno"
          count="Captura trimestral"
        />
        <SecondaryLink
          href={`/empresa/${empresaId}/comisiones/niveles`}
          icon={<Percent className="h-3.5 w-3.5" />}
          label="Niveles membresía"
          count="Jade · Turquesa · Ónix"
        />
        <SecondaryLink
          href={`/empresa/${empresaId}/comisiones/pautas`}
          icon={<Megaphone className="h-3.5 w-3.5" />}
          label="Pautas digitales"
          count="Marketing comprometido vs ejecutado"
        />
        <SecondaryLink
          href={`/empresa/${empresaId}/comisiones/validacion`}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Validación cálculos"
          count="Comparar vs Excel manual"
        />
        <SecondaryLink
          href={`/empresa/${empresaId}/comisiones/guia`}
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          label="Guía y flujo"
          count="Aprende el módulo"
        />
      </div>
    </section>
  )
}

function Kpi({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent?: 'success' | 'warning'
}) {
  const color =
    accent === 'success'
      ? 'text-success'
      : accent === 'warning'
        ? 'text-warning'
        : 'text-foreground'
  return (
    <div className="bg-card rounded-lg border p-3 sm:p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase">
        {icon} <span className="truncate">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-bold break-all tabular-nums sm:text-2xl ${color}`}>
        {value}
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
    </div>
  )
}

function Action({
  href,
  icon,
  title,
  desc,
  accent,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
  accent?: 'warning' | undefined
}) {
  return (
    <Link
      href={href}
      className="bg-card hover:border-primary/40 hover:bg-muted/30 flex min-h-[72px] items-start gap-3 rounded-lg border p-3 transition-colors sm:p-4"
    >
      <div
        className={`shrink-0 rounded-md p-2 ${
          accent === 'warning' ? 'bg-warning/20 text-warning' : 'bg-muted text-foreground'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm leading-tight font-semibold">{title}</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-tight">{desc}</p>
      </div>
      <ArrowRight className="text-muted-foreground mt-2 h-3 w-3 shrink-0" />
    </Link>
  )
}

function SecondaryLink({
  href,
  icon,
  label,
  count,
}: {
  href: string
  icon: React.ReactNode
  label: string
  count: string
}) {
  return (
    <Link
      href={href}
      className="bg-card hover:bg-muted/40 text-muted-foreground flex min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-xs"
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        {icon}
        <span className="text-foreground truncate font-medium">{label}</span>
      </span>
      <span className="shrink-0 text-right">{count}</span>
    </Link>
  )
}
