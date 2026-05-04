'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEmpresaStore } from '@/stores/empresa-store'
import { getModulesForEmpresa } from '@/lib/modules'
import { EmpresaSelector, type EmpresaOption } from './empresa-selector'
import { signOut } from '@/lib/auth/client'
import { cn } from '@/lib/utils'
import { LogOut, User, Leaf, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Find the active empresa name for module resolution
  const activeEmpresa = empresas.find((e) => e.id === empresaActiva)
  const empresaNombre = activeEmpresa?.name ?? ''
  const empresaId = activeEmpresa?.id
  const modules = getModulesForEmpresa(empresaActiva, empresaNombre, empresaId)

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'border-border bg-sidebar flex h-full flex-col border-r transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <Leaf className="text-primary-foreground h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="text-foreground text-base font-bold tracking-tight">MIHBAH</span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'text-muted-foreground hover:bg-muted/50 flex h-6 w-6 items-center justify-center rounded-md transition-colors',
            isCollapsed &&
              'border-border bg-background absolute top-5 -right-3 z-20 border shadow-sm',
          )}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Empresa selector */}
      <div
        className={cn(
          'border-border border-b',
          isCollapsed ? 'flex justify-center p-2' : 'px-3 py-3',
        )}
      >
        {!isCollapsed ? (
          <>
            <p className="text-muted-foreground mb-1.5 px-1 text-[10px] font-semibold tracking-widest uppercase">
              Empresa
            </p>
            <EmpresaSelector empresas={empresas} />
          </>
        ) : (
          <div
            title={empresaNombre}
            className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
          >
            {empresaNombre.charAt(0).toUpperCase() || 'E'}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Módulos">
        {!isCollapsed && (
          <p className="text-muted-foreground mb-2 px-2 text-[10px] font-semibold tracking-widest uppercase">
            Módulos
          </p>
        )}
        <ul className="space-y-1">
          {modules.map((mod) => {
            const isActive = pathname.startsWith(mod.href)
            return (
              <li key={mod.href}>
                <Link
                  href={mod.href}
                  title={isCollapsed ? mod.label : undefined}
                  className={cn(
                    'group flex items-center rounded-lg transition-all',
                    isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-sm font-medium',
                    isActive
                      ? isCollapsed
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'border-l-jade-600 bg-sidebar-accent text-sidebar-primary border-l-2 pl-[10px]'
                      : isCollapsed
                        ? 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-l-transparent pl-[10px]',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <mod.icon
                    className={cn(
                      'shrink-0 transition-colors',
                      isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
                      isActive
                        ? 'text-sidebar-primary'
                        : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
                    )}
                  />
                  {!isCollapsed && mod.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section at bottom */}
      <div className="border-border border-t p-2">
        <div
          className={cn(
            'flex items-center rounded-lg py-2',
            isCollapsed ? 'flex-col gap-2' : 'gap-3 px-2',
          )}
        >
          {/* Avatar */}
          <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <User className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-medium">{userName}</p>
              <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
            </div>
          )}
          <button
            id="sidebar-logout-btn"
            onClick={handleLogout}
            title="Cerrar sesión"
            className={cn(
              'text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex shrink-0 items-center justify-center rounded-md transition-colors',
              isCollapsed ? 'mt-2 h-8 w-8' : 'h-7 w-7',
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
