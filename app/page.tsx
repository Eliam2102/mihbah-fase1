import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/helpers'
import { getEmpresasForUser } from '@/lib/services/empresas'

export default async function RootPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }

  // Redirección si es usuario de portal
  const ROLES_PORTAL = ['lider_alianza', 'asesor']
  if (user.role && ROLES_PORTAL.includes(user.role)) {
    redirect('/portal/dashboard')
  }

  // 1. Intentar obtener la empresa de la sesión pasada desde la cookie
  const cookieStore = await cookies()
  const empresaActiva = cookieStore.get('mihbah-empresa-activa')?.value

  let targetRedirect = '/dashboard'

  if (empresaActiva && empresaActiva !== 'TODAS') {
    // Verificar si el usuario todavía tiene acceso o si es super_admin
    if (user.tenantId) {
      try {
        const empresas = await getEmpresasForUser(user.id, user.tenantId, user.role)
        const tieneAcceso = empresas.some((e) => e.id === empresaActiva)
        if (tieneAcceso) {
          targetRedirect = `/empresa/${empresaActiva}/dashboard`
        }
      } catch {
        // Ignorar error y seguir al flujo por defecto
      }
    }
  }

  // 2. Si no hay cookie o era 'TODAS', pero el tenant solo tiene 1 empresa, mandarlo directo
  if (targetRedirect === '/dashboard' && user.tenantId) {
    try {
      const empresas = await getEmpresasForUser(user.id, user.tenantId, user.role)
      if (empresas.length === 1) {
        targetRedirect = `/empresa/${empresas[0]!.id}/dashboard`
      }
    } catch {
      // Ignorar error
    }
  }

  // Ejecutar el redireccionamiento de Next.js fuera del try/catch
  redirect(targetRedirect)
}
