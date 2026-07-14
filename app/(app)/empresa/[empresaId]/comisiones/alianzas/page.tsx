import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getAfiliados, getLideres, getAsesores } from '@/lib/services/comisiones/alianzas.service'
import { db } from '@/lib/db'
import { matrizAlianzaProducto } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { eq } from 'drizzle-orm'
import { AlianzasView, type AlianzaConRelaciones } from '@/components/comisiones/alianzas-view'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

  const data: AlianzaConRelaciones[] = afiliados.map((af) => ({
    afiliado: af,
    lideres: lideres.filter((l) => l.afiliadoId === af.id),
    asesores: asesores.filter((a) => a.afiliadoId === af.id),
    matrizTerreno:
      matrices.find((m) => m.afiliadoId === af.id && m.tipoProducto === 'TERRENO') ?? null,
    matrizAccion:
      matrices.find((m) => m.afiliadoId === af.id && m.tipoProducto === 'ACCION') ?? null,
  }))

  return (
    <section className="3xl:p-12 w-full space-y-4 p-4 sm:p-6 xl:p-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/empresa/${empresaId}/comisiones`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          <ArrowLeft className="h-3 w-3" /> Comisiones
        </Link>
        <Link
          href={`/empresa/${empresaId}/comisiones/niveles`}
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
        >
          Niveles Jade · Turquesa · Ónix →
        </Link>
      </div>

      <div>
        <h1 className="text-foreground text-xl font-bold sm:text-2xl">Alianzas y red comercial</h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Catálogo, líderes, asesores y matrices de comisión. Click una fila para abrir detalle.
        </p>
      </div>

      <AlianzasView empresaId={empresaId} alianzas={data} />
    </section>
  )
}
