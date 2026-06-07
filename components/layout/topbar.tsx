'use client'

import { useTheme } from 'next-themes'
import { signOut } from '@/lib/auth/client'
import { Sun, Moon, Monitor, Bell, ChevronDown, User, LogOut, Settings, Menu } from 'lucide-react'
import { useState, useRef, useEffect, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { BmcorpSyncBadge } from '@/components/dashboard/bmcorp-sync-badge'

interface TopbarProps {
  userName: string
  userEmail: string
  onMobileMenuClick?: () => void
}

export function Topbar({ userName, userEmail, onMobileMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    await signOut()
    // Hard reload: limpia árbol RSC cacheado y cualquier estado cliente.
    window.location.replace('/login')
  }

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

  return (
    <header className="border-border bg-background/80 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-sm sm:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuClick}
        className="text-muted-foreground hover:bg-muted flex h-9 w-9 items-center justify-center rounded-lg transition-colors lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex items-center gap-1">
        {/* BM Corp sync badge — solo visible en dashboard BM Corp */}
        <BmcorpSyncBadge />
        {/* Theme switcher */}
        {/* <button
          id="topbar-theme-switcher"
          onClick={() => setTheme(nextTheme)}
          title={`Cambiar a modo ${nextTheme}`}
          className="text-muted-foreground hover:bg-surface hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
        >
          <ThemeIcon className="h-4.5 w-4.5" />
        </button> */}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          {/* <button
            id="topbar-notifications-btn"
            onClick={() => setNotifOpen((v) => !v)}
            className="text-muted-foreground hover:bg-surface hover:text-foreground relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            aria-haspopup="true"
            aria-expanded={notifOpen}
          >
            <Bell className="h-4.5 w-4.5" />
          </button> */}

          {notifOpen && (
            <div className="border-border bg-popover absolute top-full right-0 z-50 mt-1 w-80 rounded-xl border shadow-lg">
              <div className="border-border border-b px-4 py-3">
                <p className="text-foreground text-sm font-semibold">Notificaciones</p>
              </div>
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Bell className="text-muted-foreground/40 mb-3 h-8 w-8" />
                <p className="text-foreground text-sm font-medium">Sin notificaciones</p>
                <p className="text-muted-foreground mt-1 text-xs">Estás al día por ahora.</p>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + menu */}
        <div ref={userRef} className="relative ml-1">
          {/* <button
            id="topbar-user-menu-btn"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="text-foreground hover:bg-surface flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
          >
            <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="hidden max-w-[120px] truncate md:inline">{userName}</span>
            <ChevronDown
              className={cn(
                'text-muted-foreground h-3.5 w-3.5 transition-transform',
                userMenuOpen && 'rotate-180',
              )}
            />
          </button> */}

          {userMenuOpen && (
            <div className="border-border bg-popover absolute top-full right-0 z-50 mt-1 w-56 rounded-xl border py-1 shadow-lg">
              <div className="border-border border-b px-3 py-2.5">
                <p className="text-foreground truncate text-sm font-semibold">{userName}</p>
                <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
              </div>
              <button
                id="topbar-profile-btn"
                className="text-foreground hover:bg-accent flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              >
                <Settings className="text-muted-foreground h-4 w-4" />
                Configuración
              </button>
              <div className="border-border my-1 border-t" />
              <button
                id="topbar-logout-btn"
                onClick={handleLogout}
                className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
