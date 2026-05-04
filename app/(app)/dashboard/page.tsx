import { requireUser } from '@/lib/auth/helpers'

export default async function DashboardPage() {
  const user = await requireUser()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">Bienvenido, {user.name}</p>
      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
        <p>Email: {user.email}</p>
        <p>Rol: {user.role ?? 'user'}</p>
        <p>Tenant: {user.tenantId ?? 'sin asignar'}</p>
      </div>
      <form action="/api/auth/sign-out" method="POST" className="mt-6">
        <button
          type="submit"
          className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-300"
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  )
}
