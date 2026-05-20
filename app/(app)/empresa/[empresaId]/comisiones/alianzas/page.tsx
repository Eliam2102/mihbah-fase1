import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getAfiliados, getLideres, getAsesores } from '@/lib/services/comisiones/alianzas.service'
import { db } from '@/lib/db'
import { matrizAlianzaProducto } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { eq } from 'drizzle-orm'
import { AlianzasView, type AlianzaConRelaciones } from '@/components/comisiones/alianzas-view'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'

export const metadata = { title: 'Alianzas · Comisiones' }

export default async function AlianzasPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const [afiliados, lideres, asesores, matrices] = await Promise.all([
    getAfiliados(tenantId, false),
    getLideres(tenantId, false),
    getAsesores(tenantId, false),
    db.transaction(async (tx) => {
      await setTenant(tx, tenantId)
      return tx
        .select()
        .from(matrizAlianzaProducto)
        .where(eq(matrizAlianzaProducto.tenantId, tenantId))
    }),
  ])

  // Compose tree per afiliado
  const data: AlianzaConRelaciones[] = afiliados.map((af) => ({
    afiliado: af,
    lideres: lideres.filter((l) => l.afiliadoId === af.id),
    asesores: asesores.filter((a) => a.afiliadoId === af.id),
    matrizTerreno:
      matrices.find((m) => m.afiliadoId === af.id && m.tipoProducto === 'TERRENO') ?? null,
    matrizAccion:
      matrices.find((m) => m.afiliadoId === af.id && m.tipoProducto === 'ACCION') ?? null,
  }))

  const sinLider = data.filter((d) => d.lideres.length === 0).length
  const sinMatrizTerreno = data.filter(
    (d) => !d.matrizTerreno || d.matrizTerreno.requiereConfig,
  ).length
  const sinMatrizAccion = data.filter(
    (d) => !d.matrizAccion || d.matrizAccion.requiereConfig,
  ).length

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/empresa/${empresaId}/comisiones`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="h-3 w-3" /> Volver a Comisiones
        </Link>
        <Link
          href={`/empresa/${empresaId}/comisiones/niveles`}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs"
        >
          Niveles Jade/Turquesa/Ónix →
        </Link>
      </div>

      <div>
        <h1 className="text-foreground text-2xl font-bold">Alianzas y red comercial</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Aquí vive el catálogo de las 15 alianzas del doc YESYUCAN v5. Para cada una: asigna
          líderes, registra asesores y configura cómo se reparte la bolsa comercial (matriz alianza
          × producto).
        </p>
      </div>

      {/* Mini guía contextual */}
      <div className="bg-muted/30 flex items-start gap-2 rounded-lg border p-3 text-xs">
        <Info className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="text-muted-foreground">
          <p className="text-foreground font-medium">Cómo dejar lista una alianza:</p>
          <ol className="mt-1 ml-4 list-decimal space-y-0.5">
            <li>Expande la fila de la alianza (flecha izquierda)</li>
            <li>
              Click <span className="text-foreground font-medium">+ Nuevo líder</span> y captura sus
              datos
            </li>
            <li>
              Click <span className="text-foreground font-medium">+ Nuevo asesor</span> bajo el
              líder
            </li>
            <li>
              En la columna <span className="text-foreground font-medium">Matriz Terrenos</span> o{' '}
              <span className="text-foreground font-medium">Matriz YCD</span> click
              &quot;Configurar&quot; y captura los porcentajes (el sistema valida que sumen exacto)
            </li>
          </ol>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Alianzas" value={data.length} />
        <Stat label="Sin líder" value={sinLider} accent={sinLider > 0 ? 'warning' : 'success'} />
        <Stat
          label="Matriz TERRENO pendiente"
          value={sinMatrizTerreno}
          accent={sinMatrizTerreno > 0 ? 'warning' : 'success'}
        />
        <Stat
          label="Matriz YCD pendiente"
          value={sinMatrizAccion}
          accent={sinMatrizAccion > 0 ? 'warning' : 'success'}
        />
      </div>

      <AlianzasView empresaId={empresaId} alianzas={data} />
    </section>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'warning' | 'success'
}) {
  const color =
    accent === 'warning'
      ? 'text-warning'
      : accent === 'success'
        ? 'text-success'
        : 'text-foreground'
  return (
    <div className="bg-card rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}
