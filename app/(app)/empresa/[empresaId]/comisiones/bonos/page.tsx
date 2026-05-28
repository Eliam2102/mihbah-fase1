import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getAfiliados } from '@/lib/services/comisiones/alianzas.service'
import {
  listarBonosConfig,
  listarBonosCalculados,
} from '@/lib/services/comisiones/bonos-umbral.service'
import { db } from '@/lib/db'
import { afiliados as afiliadosTable, desarrollos as desarrollosTable } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  BonosUmbralView,
  type BonoCalculadoRow,
  type BonoConfigRow,
  type DesarrolloGrupoRow,
} from '@/components/comisiones/bonos-umbral-view'
import { getCortesBorradorAction } from '@/app/actions/cortes'

export const metadata = { title: 'Bonos umbral · Comisiones' }

export default async function BonosUmbralPage({
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

  const [configs, calculadosRaw, afiliadosList, desarrollosRaw] = await Promise.all([
    listarBonosConfig(tenantId),
    listarBonosCalculados(tenantId, anio, mes),
    getAfiliados(tenantId, true),
    db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      return tx
        .select({
          id: desarrollosTable.id,
          nombre: desarrollosTable.nombre,
          desarrolladora: desarrollosTable.desarrolladora,
          grupoDesarrolladora: desarrollosTable.grupoDesarrolladora,
        })
        .from(desarrollosTable)
        .where(and(eq(desarrollosTable.tenantId, tenantId), eq(desarrollosTable.activo, true)))
        .orderBy(desarrollosTable.nombre)
    }),
  ])

  // Resolver nombres de origen para configs OVERRIDE
  const origenIds = configs.map((c) => c.afiliadoOrigenId).filter((id): id is string => !!id)
  const origenMap = new Map<string, string>()
  if (origenIds.length > 0) {
    const origenRows = await db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      return tx
        .select({ id: afiliadosTable.id, nombre: afiliadosTable.nombre })
        .from(afiliadosTable)
        .where(inArray(afiliadosTable.id, origenIds))
    })
    for (const r of origenRows) origenMap.set(r.id, r.nombre)
  }

  const destinatarioMap = new Map(afiliadosList.map((a) => [a.id, a.nombre]))

  const configRows: BonoConfigRow[] = configs.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    afiliadoDestinatarioId: c.afiliadoDestinatarioId,
    afiliadoDestinatarioNombre: destinatarioMap.get(c.afiliadoDestinatarioId) ?? '—',
    tipoFuente: c.tipoFuente,
    afiliadoOrigenId: c.afiliadoOrigenId,
    afiliadoOrigenNombre: c.afiliadoOrigenId ? (origenMap.get(c.afiliadoOrigenId) ?? null) : null,
    overridePct: c.overridePct != null ? Number(c.overridePct) : null,
    umbralAcumuladoMensual: Number(c.umbralAcumuladoMensual),
    bonoPct: Number(c.bonoPct),
    gruposAcumulan: c.gruposAcumulan as ('YCD' | 'ARKA' | 'RH' | 'OTRO')[],
    gruposAplicaBono: c.gruposAplicaBono as ('YCD' | 'ARKA' | 'RH' | 'OTRO')[],
    formulaCalculo: c.formulaCalculo,
    activo: c.activo,
    vigenteDesde: c.vigenteDesde,
    vigenteHasta: c.vigenteHasta,
    notas: c.notas,
  }))

  const cortesBorradorRes = await getCortesBorradorAction(empresaId)
  const cortesBorrador = cortesBorradorRes.ok ? cortesBorradorRes.data : []

  const calculadosRows: BonoCalculadoRow[] = calculadosRaw.map((r) => ({
    id: r.bono.id,
    configId: r.bono.configId,
    configNombre: r.config.nombre,
    destinatarioNombre: r.destinatario,
    anio: r.bono.anio,
    mes: r.bono.mes,
    ventasYcd: Number(r.bono.ventasYcd),
    ventasArka: Number(r.bono.ventasArka),
    ventasRh: Number(r.bono.ventasRh),
    totalAcumulado: Number(r.bono.totalAcumulado),
    excedente: Number(r.bono.excedente),
    montoOverride: Number(r.bono.montoOverride),
    montoBono: Number(r.bono.montoBono),
    montoTotal: Number(r.bono.montoTotal),
    corteId: r.bono.corteId,
    pagado: r.bono.pagado,
  }))

  return (
    <section className="space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/comisiones`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a Comisiones
      </Link>

      <BonosUmbralView
        empresaId={empresaId}
        configs={configRows}
        calculados={calculadosRows}
        afiliados={afiliadosList.map((a) => ({ id: a.id, nombre: a.nombre }))}
        desarrollos={desarrollosRaw as DesarrolloGrupoRow[]}
        cortesBorrador={cortesBorrador}
        anio={anio}
        mes={mes}
      />
    </section>
  )
}
