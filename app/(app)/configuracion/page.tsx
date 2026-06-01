import { redirect } from 'next/navigation'
import {
  requireUser,
  isAdminOrAbove,
  isSuperAdminDev,
  isSuperAdminOrAbove,
} from '@/lib/auth/helpers'
import { listEmpresasForAdmin } from '@/lib/services/admin/empresa.service'
import { listUsersForTenant } from '@/lib/services/admin/user.service'
import Link from 'next/link'
import { Building2, Users, Shield, Plus, ChevronRight, AlertCircle, KeyRound } from 'lucide-react'

const TIPO_LABEL: Record<string, string> = {
  CONSTRUCTORA: 'Constructora',
  CAPITAL: 'Capital',
  COMERCIAL: 'Comercial',
}

const FUENTE_LABEL: Record<string, string> = {
  EXCEL: 'Excel',
  MONDAY: 'Monday.com',
  MANUAL: 'Manual',
}

const ROL_LABEL: Record<string, string> = {
  super_admin_dev: 'Super Admin',
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'Viewer',
}

export default async function ConfiguracionPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }

  if (!isAdminOrAbove(user.role)) redirect('/dashboard')
  if (!user.tenantId) redirect('/dashboard')

  const [empresas, usuarios] = await Promise.all([
    listEmpresasForAdmin(user.tenantId),
    listUsersForTenant(user.tenantId),
  ])

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Administración</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona empresas, usuarios y accesos de tu tenant.
          </p>
        </div>
        {isAdminOrAbove(user.role) && (
          <Link
            href="/configuracion/incidencias"
            className="border-border bg-card hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Incidencias
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </Link>
        )}
        {isSuperAdminOrAbove(user.role) && (
          <Link
            href="/configuracion/auditoria"
            className="border-border bg-card hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            <Shield className="h-4 w-4 text-amber-600" />
            Bitácora de auditoría
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </Link>
        )}
        {isSuperAdminDev(user.role) && (
          <Link
            href="/super-admin"
            className="border-border bg-card hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            <Shield className="h-4 w-4 text-purple-600" />
            Panel SaaS
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Mi cuenta */}
      <div className="border-border bg-card rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="text-jade-600 h-4 w-4" />
              <h2 className="text-foreground text-sm font-semibold">Mi cuenta</h2>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Cambia tu contraseña de acceso.</p>
          </div>
          <Link
            href="/configuracion/mi-cuenta"
            className="border-border bg-card hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            Cambiar contraseña
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Empresas */}
      <div className="border-border bg-card rounded-xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="text-jade-600 h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold">Empresas</h2>
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              {empresas.length}
            </span>
          </div>
          {isSuperAdminDev(user.role) && (
            <Link
              href="/configuracion/empresas/nueva"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva empresa
            </Link>
          )}
        </div>

        {empresas.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Sin empresas registradas. Crea la primera.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  {['Empresa', 'Tipo', 'Fuente de datos', 'RFC', 'Accesos'].map((h) => (
                    <th
                      key={h}
                      className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => (
                  <tr key={e.id} className="border-border border-b last:border-0">
                    <td className="text-foreground px-3 py-2.5 font-medium">{e.name}</td>
                    <td className="text-muted-foreground px-3 py-2.5">
                      {TIPO_LABEL[e.tipo] ?? e.tipo}
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5">
                      {FUENTE_LABEL[e.fuenteDatos] ?? e.fuenteDatos}
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5">{e.rfc ?? '—'}</td>
                    <td className="text-muted-foreground px-3 py-2.5">{e.totalAccesos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usuarios */}
      <div className="border-border bg-card rounded-xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-jade-600 h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold">Usuarios</h2>
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              {usuarios.length}
            </span>
          </div>
          <Link
            href="/configuracion/usuarios"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Gestionar usuarios
          </Link>
        </div>

        {usuarios.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">Sin usuarios.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  {['Nombre', 'Email', 'Rol', 'Acceso a empresas'].map((h) => (
                    <th
                      key={h}
                      className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold tracking-wide uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-border border-b last:border-0">
                    <td className="text-foreground px-3 py-2.5 font-medium">{u.name}</td>
                    <td className="text-muted-foreground px-3 py-2.5">{u.email}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.role === 'super_admin_dev'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : u.role === 'super_admin'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : u.role === 'admin'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {ROL_LABEL[u.role ?? 'user'] ?? u.role}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-3 py-2.5">
                      {u.accesos.length === 0
                        ? '—'
                        : u.accesos.map((a) => a.empresaNombre).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
