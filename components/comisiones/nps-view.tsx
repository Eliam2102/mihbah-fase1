'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Smile, Meh, Frown } from 'lucide-react'
import { capturarNpsAction } from '@/app/actions/comisiones/nps'
import type { npsRegistros } from '@/lib/db/schema'

type Registro = typeof npsRegistros.$inferSelect

const EMPRESAS = ['YCDI', 'MIHBAH', 'BM CORP', 'XORX'] as const

export function NpsView({ empresaId, registros }: { empresaId: string; registros: Registro[] }) {
  const [dialog, setDialog] = useState(false)

  // Último por empresa
  const ultimoPorEmpresa = new Map<string, Registro>()
  for (const r of registros) {
    if (!ultimoPorEmpresa.has(r.empresaEncuestada)) {
      ultimoPorEmpresa.set(r.empresaEncuestada, r)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setDialog(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Capturar trimestre
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {EMPRESAS.map((emp) => {
          const r = ultimoPorEmpresa.get(emp)
          return <SemaforoCard key={emp} empresa={emp} registro={r ?? null} />
        })}
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <h2 className="border-b px-4 py-2 text-sm font-semibold">Historial ({registros.length})</h2>
        {registros.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            Sin registros NPS. Captura el primero arriba.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Empresa</th>
                <th className="px-3 py-2 text-left font-medium">Periodo</th>
                <th className="px-3 py-2 text-center font-medium">Puntuación</th>
                <th className="px-3 py-2 text-center font-medium">Respondientes</th>
                <th className="px-3 py-2 text-center font-medium">Promotores</th>
                <th className="px-3 py-2 text-center font-medium">Detractores</th>
                <th className="px-3 py-2 text-left font-medium">Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {registros.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{r.empresaEncuestada}</td>
                  <td className="text-muted-foreground px-3 py-2 text-xs">
                    Q{r.trimestre} {r.anio}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`font-bold tabular-nums ${semaforoColor(r.puntuacion)}`}>
                      {r.puntuacion}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.respondientes}</td>
                  <td className="text-success px-3 py-2 text-center tabular-nums">
                    {r.promotores}
                  </td>
                  <td className="text-destructive px-3 py-2 text-center tabular-nums">
                    {r.detractores}
                  </td>
                  <td className="text-muted-foreground px-3 py-2 text-xs">
                    {r.comentarios ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialog && <CapturarDialog empresaId={empresaId} onClose={() => setDialog(false)} />}
    </div>
  )
}

function SemaforoCard({ empresa, registro }: { empresa: string; registro: Registro | null }) {
  if (!registro) {
    return (
      <div className="bg-card text-muted-foreground rounded-lg border p-4 text-center text-xs">
        <p className="text-foreground text-sm font-semibold">{empresa}</p>
        <Meh className="mx-auto mt-2 h-5 w-5 opacity-40" />
        <p className="mt-1">Sin captura</p>
      </div>
    )
  }
  const p = registro.puntuacion
  const isVerde = p > 50
  const isAmarillo = p >= 0 && p <= 50
  const Icon = isVerde ? Smile : isAmarillo ? Meh : Frown
  const colorBg = isVerde
    ? 'border-success/40 bg-success/10'
    : isAmarillo
      ? 'border-warning/40 bg-warning/10'
      : 'border-destructive/40 bg-destructive/10'
  return (
    <div className={`rounded-lg border p-4 ${colorBg}`}>
      <p className="text-foreground text-sm font-semibold">{empresa}</p>
      <p className="text-muted-foreground text-xs">
        Q{registro.trimestre} {registro.anio}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Icon className={`h-6 w-6 ${semaforoColor(p)}`} />
        <p className={`text-2xl font-bold tabular-nums ${semaforoColor(p)}`}>{p}</p>
      </div>
    </div>
  )
}

function semaforoColor(p: number): string {
  if (p > 50) return 'text-success'
  if (p >= 0) return 'text-warning'
  return 'text-destructive'
}

function CapturarDialog({ empresaId, onClose }: { empresaId: string; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const now = new Date()
  const [form, setForm] = useState({
    empresaEncuestada: 'BM CORP' as 'YCDI' | 'MIHBAH' | 'BM CORP' | 'XORX',
    anio: now.getFullYear(),
    trimestre: Math.ceil((now.getMonth() + 1) / 3),
    puntuacion: 0,
    respondientes: 0,
    promotores: 0,
    detractores: 0,
    comentarios: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await capturarNpsAction(empresaId, {
        ...form,
        comentarios: form.comentarios || null,
      })
      if (!result.ok) setError(result.error)
      else {
        router.refresh()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card relative w-full max-w-md rounded-lg border p-6 shadow-lg">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold">Captura NPS trimestral</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Si ya hay registro del mismo trimestre+empresa, se actualizará.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Field label="Empresa encuestada">
            <select
              value={form.empresaEncuestada}
              onChange={(e) =>
                setForm({
                  ...form,
                  empresaEncuestada: e.target.value as typeof form.empresaEncuestada,
                })
              }
              className="input"
            >
              {EMPRESAS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Año">
              <input
                type="number"
                min={2020}
                max={2100}
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: Number(e.target.value) })}
                className="input tabular-nums"
              />
            </Field>
            <Field label="Trimestre">
              <select
                value={form.trimestre}
                onChange={(e) => setForm({ ...form, trimestre: Number(e.target.value) })}
                className="input"
              >
                <option value={1}>Q1 (Ene-Mar)</option>
                <option value={2}>Q2 (Abr-Jun)</option>
                <option value={3}>Q3 (Jul-Sep)</option>
                <option value={4}>Q4 (Oct-Dic)</option>
              </select>
            </Field>
          </div>
          <Field label="Puntuación NPS (-100 a 100)">
            <input
              type="number"
              min={-100}
              max={100}
              required
              value={form.puntuacion}
              onChange={(e) => setForm({ ...form, puntuacion: Number(e.target.value) })}
              className="input tabular-nums"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Respondientes">
              <input
                type="number"
                min={0}
                value={form.respondientes}
                onChange={(e) => setForm({ ...form, respondientes: Number(e.target.value) })}
                className="input tabular-nums"
              />
            </Field>
            <Field label="Promotores">
              <input
                type="number"
                min={0}
                value={form.promotores}
                onChange={(e) => setForm({ ...form, promotores: Number(e.target.value) })}
                className="input tabular-nums"
              />
            </Field>
            <Field label="Detractores">
              <input
                type="number"
                min={0}
                value={form.detractores}
                onChange={(e) => setForm({ ...form, detractores: Number(e.target.value) })}
                className="input tabular-nums"
              />
            </Field>
          </div>
          <Field label="Comentarios">
            <textarea
              rows={2}
              value={form.comentarios}
              onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
              className="input"
            />
          </Field>

          {error && <p className="text-destructive text-xs">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
            >
              {pending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-muted-foreground mb-1 block text-xs font-medium uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}
