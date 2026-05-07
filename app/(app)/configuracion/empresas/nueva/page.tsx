'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actionCreateEmpresa } from '@/app/actions/admin-empresa'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function NuevaEmpresaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    tipo: 'CONSTRUCTORA' as 'CONSTRUCTORA' | 'CAPITAL' | 'COMERCIAL',
    fuenteDatos: 'EXCEL' as 'EXCEL' | 'MONDAY' | 'MANUAL',
    rfc: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await actionCreateEmpresa({
      name: form.name,
      tipo: form.tipo,
      fuenteDatos: form.fuenteDatos,
      rfc: form.rfc || undefined,
    })

    setLoading(false)
    if (result.ok) {
      router.push('/configuracion')
    } else {
      setError(result.error ?? 'Error al crear la empresa')
    }
  }

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div>
        <Link
          href="/configuracion"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Administración
        </Link>
        <h1 className="text-foreground text-2xl font-bold">Nueva empresa</h1>
      </div>

      <div className="border-border bg-card max-w-lg rounded-xl border p-6">
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="text-jade-600 h-5 w-5" />
          <h2 className="text-foreground text-sm font-semibold">Datos de la empresa</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Nombre de la empresa
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. MIHBAH"
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Tipo de empresa
            </label>
            <select
              value={form.tipo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tipo: e.target.value as typeof form.tipo,
                }))
              }
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            >
              <option value="CONSTRUCTORA">Constructora</option>
              <option value="CAPITAL">Capital / Inversión</option>
              <option value="COMERCIAL">Comercial / Ventas</option>
            </select>
          </div>

          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              Fuente de datos
            </label>
            <select
              value={form.fuenteDatos}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  fuenteDatos: e.target.value as typeof form.fuenteDatos,
                }))
              }
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
            >
              <option value="EXCEL">Excel (carga manual)</option>
              <option value="MONDAY">Monday.com (sincronización)</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              RFC <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.rfc}
              onChange={(e) => setForm((f) => ({ ...f, rfc: e.target.value }))}
              placeholder="XAXX010101000"
              maxLength={13}
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-green-600 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear empresa'}
          </button>
        </form>
      </div>
    </section>
  )
}
