import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/helpers'
import { getEmpresasForUser } from '@/lib/services/empresas'
import { getTenantName } from '@/lib/services/empresas'
import { AppShell } from '@/components/layout/app-shell'

// Roles permitidos en el admin shell (NO portal users)
const ROLES_ADMIN = ['user', 'admin', 'super_admin', 'super_admin_dev']
const ROLES_PORTAL = ['lider_alianza', 'asesor']

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }

  // ── Rol guard — portal users NO pueden ver admin shell ────────────────────
  // Si Mafer (asesor) entra por URL al admin → redirige a su portal
  if (user.role && ROLES_PORTAL.includes(user.role)) {
    redirect('/portal/dashboard')
  }
  if (user.role && !ROLES_ADMIN.includes(user.role)) {
    // Rol desconocido — por seguridad, deslogear
    redirect('/login')
  }

  // ── Load empresas for this user ────────────────────────────────────────────
  const [empresasData, tenantName] = await Promise.all([
    user.tenantId ? getEmpresasForUser(user.id, user.tenantId) : Promise.resolve([]),
    user.tenantId ? getTenantName(user.tenantId) : Promise.resolve('SIG Jade'),
  ])

  const empresaOptions = empresasData.map((e) => ({ id: e.id, name: e.name }))

  return (
    <AppShell
      empresas={empresaOptions}
      userName={user.name}
      userEmail={user.email}
      tenantName={tenantName}
      userRole={user.role}
    >
      {children}
    </AppShell>
  )
}
