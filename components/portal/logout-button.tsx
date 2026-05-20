'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth/client'

export function PortalLogoutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await authClient.signOut()
      router.push('/portal/login')
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={pending}
      title="Cerrar sesión"
      className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-60 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-md sm:px-3 sm:py-1.5 sm:text-xs"
    >
      <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      <span className="hidden sm:inline">Salir</span>
    </button>
  )
}
