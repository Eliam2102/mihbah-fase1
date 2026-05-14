import { notFound, redirect } from 'next/navigation'
import { requireUser, isAdminOrAbove } from '@/lib/auth/helpers'
import { getUserById } from '@/lib/services/admin/user.service'
import { listEmpresasForAdmin } from '@/lib/services/admin/empresa.service'
import { getPermisosUsuario } from '@/lib/services/admin/modulo-access.service'
import Link from 'next/link'
import { ArrowLeft, Mail, Calendar } from 'lucide-react'
import { UsuarioEditor } from './usuario-editor'

const ROL_LABEL: Record<string, string> = {
  super_admin_dev: 'SaaS Owner',
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'Viewer',
}

const ROL_BADGE: Record<string, string> = {
  super_admin_dev: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  super_admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  admin: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  user: 'bg-muted text-muted-foreground',
}

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function UsuarioDetailPage({ params }: PageProps) {
  const { userId } = await params

  let viewer
  try {
    viewer = await requireUser()
  } catch {
    redirect('/login')
  }
  if (!isAdminOrAbove(viewer.role)) redirect('/dashboard')
  if (!viewer.tenantId) redirect('/dashboard')

  const [targetUser, empresas, permisos] = await Promise.all([
    getUserById(userId, viewer.tenantId),
    listEmpresasForAdmin(viewer.tenantId),
    getPermisosUsuario(userId, viewer.tenantId),
  ])

  if (!targetUser) notFound()

  const role = targetUser.role ?? 'user'
  const isSelf = targetUser.id === viewer.id
  const isSaasDev = role === 'super_admin_dev'
  const allEmpresas = empresas.map((e) => ({ id: e.id, name: e.name, tipo: e.tipo }))

  // Only show permisos for empresas the user has access to
  const accesosEmpresaIds = new Set(targetUser.accesos.map((a) => a.empresaId))
  const permisosAccesibles = permisos.filter((p) => accesosEmpresaIds.has(p.empresaId))

  return (
    <section className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/configuracion/usuarios"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a usuarios
        </Link>

        {/* User card header */}
        <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold">
              {targetUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-foreground text-xl font-bold">{targetUser.name}</h1>
                {isSelf && (
                  <span className="text-muted-foreground rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                    Tú
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Mail className="h-3 w-3" />
                  {targetUser.email}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  Creado{' '}
                  {targetUser.createdAt.toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          <span
            className={`shrink-0 self-start rounded-full px-3 py-1 text-sm font-semibold sm:self-auto ${ROL_BADGE[role] ?? ROL_BADGE.user}`}
          >
            {ROL_LABEL[role] ?? role}
          </span>
        </div>
      </div>

      {/* Editor — all interactive parts */}
      <UsuarioEditor
        userId={targetUser.id}
        currentRole={role}
        tenantId={viewer.tenantId}
        isSelf={isSelf}
        isSaasDev={isSaasDev}
        accesos={targetUser.accesos}
        allEmpresas={allEmpresas}
        empresasPermisos={permisosAccesibles}
      />
    </section>
  )
}
