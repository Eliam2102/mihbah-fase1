import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getEsquemas } from '@/lib/services/comisiones/esquemas.service'
import { EsquemasView } from '@/components/comisiones/esquemas-view'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'

export const metadata = { title: 'Esquemas · Comisiones' }

export default async function EsquemasPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const esquemas = await getEsquemas(tenantId)

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/comisiones`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a Comisiones
      </Link>

      <div>
        <h1 className="text-foreground text-2xl font-bold">Esquemas de comisión</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Plantillas globales definidas por el doc YESYUCAN v5. Aplican a todas las alianzas según
          el tipo de producto (Terreno o Acción YCD). La matriz por alianza vive en{' '}
          <Link
            href={`/empresa/${empresaId}/comisiones/alianzas`}
            className="text-foreground underline"
          >
            Alianzas
          </Link>
          .
        </p>
      </div>

      <div className="bg-muted/30 flex items-start gap-2 rounded-lg border p-3 text-xs">
        <Info className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="text-muted-foreground">
          <p className="text-foreground font-medium">¿Cuándo editar un esquema?</p>
          <ul className="mt-1 ml-4 list-disc space-y-0.5">
            <li>Dirección General actualiza % en el doc YESYUCAN</li>
            <li>Cambia comisión operativa o socios fijos</li>
            <li>Se ajusta tope líder YCD</li>
          </ul>
          <p className="mt-1">
            <strong>Ojo:</strong> los cambios aplican a comisiones NUEVAS. Para recalcular las
            existentes con los nuevos %, usa el botón <strong>Recalcular todas</strong> abajo.
          </p>
        </div>
      </div>

      {esquemas.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-lg border p-8 text-center text-sm">
          No hay esquemas configurados. Corre <code>npm run db:seed-comisiones</code> para crear los
          2 esquemas base (Terrenos y YCD).
        </div>
      ) : (
        <EsquemasView empresaId={empresaId} esquemas={esquemas} />
      )}
    </section>
  )
}
