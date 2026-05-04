import { requireUser } from '@/lib/auth/helpers'
import { UploadWizard } from '@/components/excel/upload-wizard'

export default async function NuevaCargaPage({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  await requireUser()

  return (
    <section className="p-6">
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-bold">Nueva carga Excel</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Importa movimientos desde un archivo Excel en 4 pasos.
        </p>
      </div>
      <UploadWizard />
    </section>
  )
}
