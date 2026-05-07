import { redirect } from 'next/navigation'
import { requireUser, isSuperAdminOrAbove } from '@/lib/auth/helpers'
import { listUsersForTenant } from '@/lib/services/admin/user.service'
import { listEmpresasForAdmin } from '@/lib/services/admin/empresa.service'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { NuevoUsuarioForm } from './nuevo-usuario-form'

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

export default async function UsuariosPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }
  if (!isSuperAdminOrAbove(user.role)) redirect('/dashboard')
  if (!user.tenantId) redirect('/dashboard')

  const [usuarios, empresas] = await Promise.all([
    listUsersForTenant(user.tenantId),
    listEmpresasForAdmin(user.tenantId),
  ])

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div>
        <Link
          href="/configuracion"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Administración
        </Link>
        <h1 className="text-foreground text-2xl font-bold">Gestión de usuarios</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Crea usuarios y gestiona sus permisos por empresa y módulo.
        </p>
      </div>

      <NuevoUsuarioForm empresas={empresas.map((e) => ({ id: e.id, name: e.name }))} />

      <div className="border-border bg-card rounded-xl border">
        <div className="border-border border-b px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">Usuarios ({usuarios.length})</h2>
        </div>

        {usuarios.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">Sin usuarios.</p>
        ) : (
          <ul className="divide-border divide-y">
            {usuarios.map((u) => {
              const role = u.role ?? 'user'
              const isSelf = u.id === user.id
              return (
                <li key={u.id}>
                  <Link
                    href={`/configuracion/usuarios/${u.id}`}
                    className="hover:bg-muted/40 flex items-center gap-4 px-5 py-4 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-foreground truncate text-sm font-medium">{u.name}</p>
                        {isSelf && (
                          <span className="text-muted-foreground rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">
                            Tú
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                    </div>

                    {/* Role badge */}
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${ROL_BADGE[role] ?? ROL_BADGE.user}`}
                    >
                      {ROL_LABEL[role] ?? role}
                    </span>

                    {/* Empresa count */}
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {u.accesos.length} empresa{u.accesos.length !== 1 ? 's' : ''}
                    </span>

                    <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
