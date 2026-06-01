import { requireUser } from '@/lib/auth/helpers'
import { CambiarPasswordForm } from './cambiar-password-form'

export const metadata = { title: 'Mi cuenta' }

export default async function MiCuentaPage() {
  const user = await requireUser()
  return (
    <section className="w-full space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Mi cuenta</h1>
        <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
      </div>
      <CambiarPasswordForm currentName={user.name} />
    </section>
  )
}
