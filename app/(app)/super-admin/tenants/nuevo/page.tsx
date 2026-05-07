'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actionCreateTenant } from '@/app/actions/admin-tenant'
import { ArrowLeft, Shield } from 'lucide-react'
import Link from 'next/link'

type Step = 1 | 2 | 3

export default function NuevoTenantPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    tenantName: '',
    slug: '',
    orgName: '',
    empresaNombre: '',
    empresaTipo: 'CONSTRUCTORA' as 'CONSTRUCTORA' | 'CAPITAL' | 'COMERCIAL',
    empresaFuente: 'EXCEL' as 'EXCEL' | 'MONDAY' | 'MANUAL',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  }

  function handleTenantName(value: string) {
    setForm((f) => ({
      ...f,
      tenantName: value,
      slug: autoSlug(value),
      orgName: f.orgName || `Grupo ${value}`,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step < 3) {
      setStep((s) => (s + 1) as Step)
      return
    }

    setLoading(true)
    setError(null)
    const result = await actionCreateTenant(form)
    setLoading(false)

    if (result.ok) {
      router.push('/super-admin')
    } else {
      setError(result.error ?? 'Error desconocido')
    }
  }

  const inputClass =
    'border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600'

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div>
        <Link
          href="/super-admin"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Panel SaaS
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-600" />
          <h1 className="text-foreground text-2xl font-bold">Nuevo tenant</h1>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {(['1. Tenant', '2. Empresa', '3. Admin'] as const).map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === i + 1
                  ? 'bg-primary text-primary-foreground'
                  : step > i + 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span
              className={`text-sm font-medium ${
                step === i + 1 ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {label.split('. ')[1]}
            </span>
            {i < 2 && <div className="bg-border h-px w-8" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="border-border bg-card max-w-lg rounded-xl border p-6">
          {/* Step 1 — Tenant + Org */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-foreground text-sm font-semibold">Información del tenant</h2>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Nombre del cliente (tenant)
                </label>
                <input
                  type="text"
                  required
                  value={form.tenantName}
                  onChange={(e) => handleTenantName(e.target.value)}
                  placeholder="Ej. Universo Jade"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Slug</label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="universo-jade"
                  className={`${inputClass} font-mono`}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Solo minúsculas, números y guiones
                </p>
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Nombre del grupo / organización
                </label>
                <input
                  type="text"
                  required
                  value={form.orgName}
                  onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
                  placeholder="Ej. Grupo Universo Jade"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Primera empresa */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-foreground text-sm font-semibold">Primera empresa del tenant</h2>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Nombre de la empresa
                </label>
                <input
                  type="text"
                  required
                  value={form.empresaNombre}
                  onChange={(e) => setForm((f) => ({ ...f, empresaNombre: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Tipo</label>
                <select
                  value={form.empresaTipo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      empresaTipo: e.target.value as typeof form.empresaTipo,
                    }))
                  }
                  className={inputClass}
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
                  value={form.empresaFuente}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      empresaFuente: e.target.value as typeof form.empresaFuente,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="EXCEL">Excel</option>
                  <option value="MONDAY">Monday.com</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3 — Admin user */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-foreground text-sm font-semibold">
                Usuario administrador inicial
              </h2>
              <p className="text-muted-foreground text-xs">
                Se creará con rol <strong>Super Admin</strong> del nuevo tenant.
              </p>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.adminName}
                  onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-sm font-medium">
                  Contraseña temporal
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.adminPassword}
                  onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="border-border hover:bg-muted flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
              >
                Atrás
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {step < 3 ? 'Siguiente' : loading ? 'Creando...' : 'Crear tenant'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
