'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEmpresaStore } from '@/stores/empresa-store'
import { getModulesForEmpresa } from '@/lib/modules'
import { EmpresaSelector, type EmpresaOption } from './empresa-selector'
import { signOut } from '@/lib/auth/client'
import { cn } from '@/lib/utils'
import { LogOut, User, Leaf } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  empresas: EmpresaOption[]
  userName: string
  userEmail: string
}

export function Sidebar({ empresas, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { empresaActiva } = useEmpresaStore()

  // Find the active empresa name for module resolution
  const empresaNombre = empresas.find((e) => e.id === empresaActiva)?.name ?? ''
  const modules = getModulesForEmpresa(empresaActiva, empresaNombre)

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  return (
    <aside className="border-border bg-sidebar flex h-full w-64 flex-col border-r">
      {/* Logo */}
      <div className="border-border flex h-16 shrink-0 items-center gap-2.5 border-b px-5">
        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
          <Leaf className="text-primary-foreground h-4 w-4" />
        </div>
        <span className="text-foreground text-base font-bold tracking-tight">MIHBAH</span>
      </div>

      {/* Empresa selector */}
      <div className="border-border border-b px-3 py-3">
        <p className="text-muted-foreground mb-1.5 px-1 text-[10px] font-semibold tracking-widest uppercase">
          Empresa
        </p>
        <EmpresaSelector empresas={empresas} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Módulos">
        <p className="text-muted-foreground mb-2 px-1 text-[10px] font-semibold tracking-widest uppercase">
          Módulos
        </p>
        <ul className="space-y-0.5">
          {modules.map((mod) => {
            const isActive = pathname.startsWith(mod.href)
            return (
              <li key={mod.href}>
                <Link
                  href={mod.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'border-l-jade-600 bg-sidebar-accent text-sidebar-primary border-l-2 pl-[10px]'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-l-transparent pl-[10px]',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <mod.icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive
                        ? 'text-sidebar-primary'
                        : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
                    )}
                  />
                  {mod.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section at bottom */}
      <div className="border-border border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          {/* Avatar */}
          <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-sm font-medium">{userName}</p>
            <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
          </div>
          <button
            id="sidebar-logout-btn"
            onClick={handleLogout}
            title="Cerrar sesión"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
