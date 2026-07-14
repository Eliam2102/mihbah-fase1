import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { listarCortesAction } from '@/app/actions/cortes'
import CortesListView from '@/components/comisiones/cortes-list-view'

export const metadata = { title: 'Cortes de Dispersión · BM CORP' }

export default async function CortesPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')

  const result = await listarCortesAction(empresaId)
  const cortes = result.ok ? result.data : []

  return <CortesListView empresaId={empresaId} cortes={cortes} userRole={user.role ?? 'admin'} />
}
