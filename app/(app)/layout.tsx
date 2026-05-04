import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/helpers'
import { getEmpresasForUser } from '@/lib/services/empresas'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }

  // ── Load empresas for this user ────────────────────────────────────────────
  const empresasData = user.tenantId ? await getEmpresasForUser(user.id, user.tenantId) : []

  const empresaOptions = empresasData.map((e) => ({ id: e.id, name: e.name }))

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      {/* Sidebar — fixed width 256px */}
      <Sidebar empresas={empresaOptions} userName={user.name} userEmail={user.email} />

      {/* Main column: topbar + scrollable content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar — sticky h-16 */}
        <Topbar empresas={empresaOptions} userName={user.name} userEmail={user.email} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
