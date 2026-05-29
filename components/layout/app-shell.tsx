'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { cn } from '@/lib/utils'
import type { EmpresaOption } from './empresa-selector'

interface AppShellProps {
  empresas: EmpresaOption[]
  userName: string
  userEmail: string
  tenantName: string
  userRole?: string | null | undefined
  badgeCortes?: number
  children: React.ReactNode
}

export function AppShell({
  empresas,
  userName,
  userEmail,
  tenantName,
  userRole,
  badgeCortes = 0,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  // Close mobile sidebar on navigation — use ref to avoid setState-in-effect lint error
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      setMobileOpen(false)
    }
  }, [pathname])

  return (
    <div className="bg-background flex h-screen overflow-hidden" suppressHydrationWarning>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar — fixed on mobile, part of flex on desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300',
          'lg:relative lg:inset-auto lg:z-auto lg:h-full lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar
          empresas={empresas}
          userName={userName}
          userEmail={userEmail}
          tenantName={tenantName}
          userRole={userRole}
          badgeCortes={badgeCortes}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          userName={userName}
          userEmail={userEmail}
          onMobileMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
