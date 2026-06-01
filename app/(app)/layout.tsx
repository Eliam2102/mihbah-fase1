import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireUser, isAdminOrAbove } from '@/lib/auth/helpers'
import { getEmpresasForUser } from '@/lib/services/empresas'
import { getTenantName } from '@/lib/services/empresas'
import { AppShell } from '@/components/layout/app-shell'
import { db } from '@/lib/db'
import { cortesDispersion } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, sql } from 'drizzle-orm'
import { getPermisosUsuario } from '@/lib/services/admin/modulo-access.service'
import type { ModuloKey } from '@/lib/modulos-config'

// Roles permitidos en el admin shell (NO portal users)
const ROLES_ADMIN = ['viewer', 'user', 'tesoreria', 'admin', 'super_admin', 'super_admin_dev']
const ROLES_PORTAL = ['lider_alianza', 'asesor', 'administrativo']

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

  // ── Load empresas + permisos de módulos ───────────────────────────────────
  const [empresasData, tenantName, permisosRaw] = await Promise.all([
    user.tenantId ? getEmpresasForUser(user.id, user.tenantId) : Promise.resolve([]),
    user.tenantId ? getTenantName(user.tenantId) : Promise.resolve('SIG Jade'),
    // Cargar permisos para todos — admins también respetan restricciones explícitas del panel
    user.tenantId ? getPermisosUsuario(user.id, user.tenantId) : Promise.resolve(null),
  ])

  // Record<empresaId, ModuloKey[]> de módulos visibles. null = sin restricción.
  const permisosVisibles: Record<string, ModuloKey[]> | null = permisosRaw
    ? permisosRaw.reduce<Record<string, ModuloKey[]>>((acc, e) => {
        acc[e.empresaId] = e.modulos.filter((m) => m.puedeVer).map((m) => m.modulo)
        return acc
      }, {})
    : null

  // Badges sidebar — cortes pendientes de revisión/aprobación
  let badgeCortes = 0
  if (user.tenantId) {
    try {
      const [row] = await db.transaction(async (tx) => {
        await setTenant(tx, user.tenantId!)
        return tx
          .select({ n: sql<number>`COUNT(*)::int` })
          .from(cortesDispersion)
          .where(
            and(
              eq(cortesDispersion.tenantId, user.tenantId!),
              eq(cortesDispersion.estado, 'EN_REVISION'),
            ),
          )
      })
      badgeCortes = Number(row?.n ?? 0)
    } catch {
      // No bloquear el render si falla el badge
    }
  }

  const empresaOptions = empresasData.map((e) => ({ id: e.id, name: e.name }))

  // Leer la cookie que escribe el store para que el server render coincida con el cliente.
  // Evita el flash (servidor renderiza 'TODAS', cliente hidrata al UUID guardado).
  const cookieStore = await cookies()
  const initialEmpresaId = cookieStore.get('mihbah-empresa-activa')?.value ?? 'TODAS'

  return (
    <AppShell
      empresas={empresaOptions}
      initialEmpresaId={initialEmpresaId}
      userName={user.name}
      userEmail={user.email}
      tenantName={tenantName}
      userRole={user.role}
      badgeCortes={badgeCortes}
      permisosVisibles={permisosVisibles}
    >
      {children}
    </AppShell>
  )
}
