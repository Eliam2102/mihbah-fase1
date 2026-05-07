import { redirect } from 'next/navigation'
import { requireSuperAdminDev } from '@/lib/auth/helpers'
import { listAllTenants } from '@/lib/services/admin/tenant.service'
import Link from 'next/link'
import { Building2, Users, Plus, Shield } from 'lucide-react'

export default async function SuperAdminPage() {
  try {
    await requireSuperAdminDev()
  } catch {
    redirect('/configuracion')
  }

  const tenants = await listAllTenants()

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <h1 className="text-foreground text-2xl font-bold">Panel SaaS</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Vista global de todos los tenants. Solo accesible para SaaS Owner.
          </p>
        </div>
        <Link
          href="/super-admin/tenants/nuevo"
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Nuevo tenant
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Total tenants
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tabular-nums">{tenants.length}</p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Total empresas
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tabular-nums">
            {tenants.reduce((s, t) => s + t.totalEmpresas, 0)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Total usuarios
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tabular-nums">
            {tenants.reduce((s, t) => s + t.totalUsers, 0)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Promedio empresas
          </p>
          <p className="text-foreground mt-2 text-3xl font-bold tabular-nums">
            {tenants.length === 0
              ? 0
              : (tenants.reduce((s, t) => s + t.totalEmpresas, 0) / tenants.length).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Tenants list */}
      <div className="border-border bg-card rounded-xl border p-5">
        <h2 className="text-foreground mb-4 text-sm font-semibold">Todos los tenants</h2>

        {tenants.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-muted-foreground text-sm">Sin tenants registrados.</p>
            <Link
              href="/super-admin/tenants/nuevo"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Crear primer tenant
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  {['Tenant', 'Slug', 'Empresas', 'Usuarios', 'Creado'].map((h) => (
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
                {tenants.map((t) => (
                  <tr key={t.id} className="border-border border-b last:border-0">
                    <td className="text-foreground px-3 py-3 font-medium">{t.name}</td>
                    <td className="text-muted-foreground px-3 py-3 font-mono text-xs">{t.slug}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="text-muted-foreground h-3.5 w-3.5" />
                        <span className="text-foreground tabular-nums">{t.totalEmpresas}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="text-muted-foreground h-3.5 w-3.5" />
                        <span className="text-foreground tabular-nums">{t.totalUsers}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-xs">
                      {t.createdAt.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
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
