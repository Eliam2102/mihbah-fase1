import { requireUser } from '@/lib/auth/helpers'

export default async function FlujoPage({ params }: { params: Promise<{ empresaId: string }> }) {
  await params // empresaId available but unused in this placeholder
  await requireUser()

  return (
    <section className="p-6">
      <h1 className="text-foreground text-2xl font-bold">Flujo de Caja</h1>
      <p className="text-muted-foreground mt-1 text-sm">Módulo en construcción — Épica 6.</p>
    </section>
  )
}
