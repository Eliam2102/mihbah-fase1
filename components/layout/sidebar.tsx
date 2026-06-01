'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEmpresaStore } from '@/stores/empresa-store'
import { usePeriodStore } from '@/stores/period-store'
import { getModulesForEmpresa } from '@/lib/modules'
import { EmpresaSelector, type EmpresaOption } from './empresa-selector'
import { signOut } from '@/lib/auth/client'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  Shield,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

interface SidebarProps {
  empresas: EmpresaOption[]
  userName: string
  userEmail: string
  tenantName: string
  userRole?: string | null | undefined
  badgeCortes?: number
  permisosVisibles?: Record<string, string[]> | null
  onMobileClose?: () => void
}

export function Sidebar({
  empresas,
  userName,
  userEmail,
  tenantName,
  userRole,
  badgeCortes = 0,
  permisosVisibles = null,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { empresaActiva } = useEmpresaStore()
  const { anio } = usePeriodStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const nextTheme = mounted
    ? theme === 'dark'
      ? 'light'
      : theme === 'light'
        ? 'system'
        : 'dark'
    : 'system'
  const ThemeIcon = mounted
    ? theme === 'dark'
      ? Moon
      : theme === 'light'
        ? Sun
        : Monitor
    : Monitor

  // Find the active empresa name for module resolution
  const activeEmpresa = empresas.find((e) => e.id === empresaActiva)
  const empresaNombre = activeEmpresa?.name ?? ''
  const empresaId = activeEmpresa?.id
  const allModules = getModulesForEmpresa(empresaActiva, empresaNombre, empresaId)
  // null = admin/super_admin, sin restricción. Record presente = filtrar por puedeVer.
  const empresaPermisos = empresaId && permisosVisibles ? permisosVisibles[empresaId] : null
  const modules = empresaPermisos
    ? allModules.filter((m) => empresaPermisos.includes(m.moduloKey))
    : allModules

  async function handleLogout() {
    await signOut()
    // Hard reload: limpia árbol RSC cacheado y cualquier estado cliente.
    window.location.replace('/login')
  }

  return (
    <aside
      className={cn(
        'border-border bg-sidebar relative flex h-full flex-col border-r transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-900">
            <Image
              src="/logo_jade.png"
              alt="Jade logo"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          {!isCollapsed && (
            <span className="text-foreground truncate text-base font-bold tracking-tight">
              {tenantName}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'text-muted-foreground hover:bg-muted/50 hidden h-6 w-6 items-center justify-center rounded-md transition-colors lg:flex',
            isCollapsed &&
              'border-border bg-background absolute top-5 -right-3 z-20 border shadow-sm',
          )}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="text-muted-foreground hover:bg-muted/50 flex h-6 w-6 items-center justify-center rounded-md transition-colors lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        )}
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
            const modHref = `${mod.href}?anio=${anio}`
            return (
              <li key={mod.href}>
                <Link
                  href={modHref}
                  title={isCollapsed ? mod.label : undefined}
                  className={cn(
                    'relative',
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
                  {!isCollapsed && (
                    <span className="flex flex-1 items-center justify-between">
                      {mod.label}
                      {mod.label === 'Comisiones' && badgeCortes > 0 && (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {badgeCortes}
                        </span>
                      )}
                    </span>
                  )}
                  {isCollapsed && mod.label === 'Comisiones' && badgeCortes > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Admin items — super_admin, admin, tesoreria (no viewer) */}
      {(userRole === 'super_admin_dev' ||
        userRole === 'super_admin' ||
        userRole === 'admin' ||
        userRole === 'tesoreria') && (
        <div className="border-border border-t px-2 py-3">
          {!isCollapsed && (
            <p className="text-muted-foreground mb-2 px-2 text-[10px] font-semibold tracking-widest uppercase">
              Admin
            </p>
          )}
          <ul className="space-y-1">
            <li>
              <Link
                href="/configuracion"
                title={isCollapsed ? 'Administración' : undefined}
                className={cn(
                  'group flex items-center rounded-lg transition-all',
                  isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-sm font-medium',
                  pathname.startsWith('/configuracion')
                    ? isCollapsed
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'border-l-jade-600 bg-sidebar-accent text-sidebar-primary border-l-2 pl-[10px]'
                    : isCollapsed
                      ? 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-l-transparent pl-[10px]',
                )}
                aria-current={pathname.startsWith('/configuracion') ? 'page' : undefined}
              >
                <Settings
                  className={cn(
                    'shrink-0 transition-colors',
                    isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
                    pathname.startsWith('/configuracion')
                      ? 'text-sidebar-primary'
                      : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
                  )}
                />
                {!isCollapsed && 'Administración'}
              </Link>
            </li>
            {userRole === 'super_admin_dev' && (
              <li>
                <Link
                  href="/super-admin"
                  title={isCollapsed ? 'Panel Super A.' : undefined}
                  className={cn(
                    'group flex items-center rounded-lg transition-all',
                    isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2 text-sm font-medium',
                    pathname.startsWith('/super-admin')
                      ? isCollapsed
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'border-l-jade-600 bg-sidebar-accent text-sidebar-primary border-l-2 pl-[10px]'
                      : isCollapsed
                        ? 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-l-transparent pl-[10px]',
                  )}
                  aria-current={pathname.startsWith('/super-admin') ? 'page' : undefined}
                >
                  <Shield
                    className={cn(
                      'shrink-0 text-purple-600 transition-colors',
                      isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
                    )}
                  />
                  {!isCollapsed && 'Panel Super A.'}
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

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
            onClick={() => setTheme(nextTheme)}
            title={`Tema: ${nextTheme}`}
            className={cn(
              'text-muted-foreground hover:bg-muted hover:text-foreground flex shrink-0 items-center justify-center rounded-md transition-colors',
              isCollapsed ? 'h-8 w-8' : 'h-7 w-7',
            )}
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
          <button
            id="sidebar-logout-btn"
            onClick={handleLogout}
            title="Cerrar sesión"
            className={cn(
              'text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex shrink-0 items-center justify-center rounded-md transition-colors',
              isCollapsed ? 'h-8 w-8' : 'h-7 w-7',
            )}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
