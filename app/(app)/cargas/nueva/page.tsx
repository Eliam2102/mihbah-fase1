import { requireUser } from '@/lib/auth/helpers'
import { UploadWizard } from '@/components/excel/upload-wizard'

export const metadata = { title: 'Nueva Carga Excel · Universo Jade' }

export default async function NuevaCargaGlobalPage() {
  await requireUser()

  return (
    <section className="p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-foreground text-2xl font-bold">Nueva carga Excel</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Importa el archivo maestro MK1. El sistema ruteará cada fila a su empresa correspondiente
          (MIHBAH y YCDI) automáticamente.
        </p>
      </div>
      <UploadWizard />
    </section>
  )
}
