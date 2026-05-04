import { requireUser } from '@/lib/auth/helpers'

export default async function DashboardPage() {
  const user = await requireUser()

  return (
    <div className="p-8">
      <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-1">Bienvenido, {user.name}</p>
    </div>
  )
}
