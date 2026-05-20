import Link from 'next/link'
import { Wallet, ShieldCheck } from 'lucide-react'
import { requireUser } from '@/lib/auth/helpers'
import { getPerfilPortal } from '@/lib/services/comisiones/portal.service'
import { PortalLogoutButton } from '@/components/portal/logout-button'

export const metadata = { title: 'Portal · SIG Jade' }

// El layout NO bloquea. Cada página decide auth via requirePortalUser().
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let perfilData: { userName: string; rol: string; alianza: string | null } | null = null
  try {
    const user = await requireUser()
    const perfil = await getPerfilPortal(user.id)
    if (perfil) {
      perfilData = {
        userName: user.name,
        rol: perfil.rolPortal === 'LIDER_ALIANZA' ? 'Líder de alianza' : 'Asesor',
        alianza: perfil.alianzaNombre,
      }
    }
  } catch {
    // sin sesión válida — layout mínimo
  }

  const initials = perfilData
    ? perfilData.userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('') || 'U'
    : ''

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-card/80 sticky top-0 z-20 border-b backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/portal/dashboard" className="group flex items-center gap-2.5">
            <span className="bg-primary text-primary-foreground inline-flex h-9 w-9 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105">
              <Wallet className="h-4.5 w-4.5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-foreground text-sm font-semibold">SIG Jade</span>
              <span className="text-muted-foreground text-[11px]">Portal de comisiones</span>
            </span>
          </Link>

          <div className="flex-1" />

          {perfilData && (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 sm:flex">
                <div className="text-right leading-tight">
                  <p className="text-foreground text-xs font-semibold">{perfilData.userName}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {perfilData.rol}
                    {perfilData.alianza ? ` · ${perfilData.alianza}` : ''}
                  </p>
                </div>
                <span className="from-primary to-jade-500 ring-background grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ring-2">
                  {initials}
                </span>
              </div>
              <span className="from-primary to-jade-500 ring-background grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white ring-2 sm:hidden">
                {initials}
              </span>
              <PortalLogoutButton />
            </div>
          )}
        </div>

        {perfilData && (
          <nav className="mx-auto flex w-full max-w-7xl items-center gap-1 border-t px-4 py-1.5 text-sm sm:px-6 lg:px-8">
            <Link
              href="/portal/dashboard"
              className="text-foreground hover:bg-muted/60 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium"
            >
              <Wallet className="h-3.5 w-3.5" />
              Mi dashboard
            </Link>
            <div className="flex-1" />
            <div className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <ShieldCheck className="text-success h-3 w-3" />
              Conexión segura
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>

      <footer className="text-muted-foreground border-t py-6 text-center text-xs">
        SIG Jade · Universo Jade · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
