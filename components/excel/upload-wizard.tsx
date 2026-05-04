'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Upload,
  FileSpreadsheet,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ColumnMapping, ColumnKey } from '@/lib/services/excel.service'
import type { ValidatedRow } from '@/lib/validations/excel'

type Step = 1 | 2 | 3 | 4

const STEPS = ['Archivo', 'Columnas', 'Pre-vista', 'Confirmar']

const COLUMN_LABELS: Record<ColumnKey, string> = {
  anio: 'AÑO',
  mes: 'MES',
  fecha: 'FECHA',
  tipo: 'TIPO',
  empresa: 'EMPRESA',
  categoria: 'CATEGORÍA',
  grupo: 'GRUPO',
  nombre: 'NOMBRE',
  concepto: 'CONCEPTO',
  monto: 'MONTO',
  cuenta: 'CUENTA',
  proyecto: 'PROYECTO',
  comentarios: 'COMENTARIOS',
}

interface ImportResult {
  uploadId: string
  total: number
  imported: number
  errors: number
  duplicates: number
  omitted: number
  porEmpresa?: Array<{
    empresaNombre: string
    empresaId: string
    importadas: number
    errores: number
    omitidas: number
    duplicadas: number
  }>
}

interface WizardState {
  file: File | null
  headers: string[]
  rawRows: (ValidatedRow & { _omit?: boolean; _empresaLabel?: string })[]
  mapping: ColumnMapping
  importResult: ImportResult | null
}

export function UploadWizard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'ALL' | 'ERRORS'>('ALL')
  const [visibleRowsCount, setVisibleRowsCount] = useState(100)
  const [state, setState] = useState<WizardState>({
    file: null,
    headers: [],
    rawRows: [],
    mapping: {},
    importResult: null,
  })

  /* ─── Step 1: file pick ─────────────────────────────────────────────────── */
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Solo se aceptan archivos .xlsx o .xls')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // Service auto-detects 'BASE' sheet
      const res = await fetch('/api/cargas/parse', { method: 'POST', body: formData })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al parsear')
      const data = await res.json()
      setState((prev) => ({
        ...prev,
        file,
        headers: data.headers,
        rawRows: data.rows,
        mapping: data.mapping,
      }))
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files[0]
      if (f) handleFile(f)
    },
    [handleFile],
  )

  /* ─── Step 2: validate with mapping ────────────────────────────────────── */
  const handleValidate = async () => {
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', state.file!)
      formData.append('mapping', JSON.stringify(state.mapping))
      const res = await fetch('/api/cargas/parse', { method: 'POST', body: formData })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al validar')
      const data = await res.json()
      setState((prev) => ({ ...prev, rawRows: data.rows }))
      setStep(3)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  /* ─── Step 3 → 4: import ───────────────────────────────────────────────── */
  const handleImport = async () => {
    if (!state.file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', state.file)
      formData.append('mapping', JSON.stringify(state.mapping))
      const res = await fetch('/api/cargas/import', { method: 'POST', body: formData })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al importar')
      const data = await res.json()
      setState((prev) => ({ ...prev, importResult: data }))
      setStep(4)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Active rows = exclude _omit rows (BM CORP silently skipped)
  const activeRows = state.rawRows.filter((r) => !r._omit)
  const validCount = activeRows.filter((r) => r.errors.length === 0 && !r.isDuplicate).length
  const errorCount = activeRows.filter((r) => r.errors.length > 0).length
  const dupCount = activeRows.filter((r) => r.isDuplicate).length

  return (
    <div className="w-full">
      {/* Stepper */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step
          const active = step === n
          const done = step > n
          return (
            <div key={n} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    done && 'bg-green-600 text-white',
                    active && 'bg-primary text-primary-foreground ring-primary/30 ring-2',
                    !active && !done && 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <CheckCircle className="h-4 w-4" /> : n}
                </div>
                <span
                  className={cn(
                    'hidden text-sm font-medium sm:block',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('bg-border mx-3 h-px flex-1', done && 'bg-green-600')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-center gap-3 rounded-lg border p-3 text-sm">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── STEP 1: Dropzone ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-border bg-surface hover:border-primary hover:bg-primary/5 flex min-h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-colors"
        >
          {loading ? (
            <Loader2 className="text-primary h-10 w-10 animate-spin" />
          ) : (
            <>
              <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-xl">
                <FileSpreadsheet className="text-primary h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="text-foreground text-base font-semibold">
                  Arrastra tu archivo Excel aquí
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  o haz clic para seleccionar (.xlsx, .xls)
                </p>
                <p className="text-muted-foreground/70 mt-2 text-xs">
                  El sistema detecta automáticamente la hoja BASE y rutea por empresa
                </p>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      )}

      {/* ── STEP 2: Column mapping ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-foreground text-lg font-semibold">Mapeo de columnas</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Se detectaron {state.headers.length} columnas en{' '}
              <span className="font-medium">{state.file?.name}</span>. Confirma el mapeo antes de
              importar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
              <div key={key} className="border-border bg-card rounded-lg border p-3">
                <label className="text-muted-foreground mb-1.5 block text-xs font-semibold">
                  {COLUMN_LABELS[key]}
                </label>
                <select
                  value={state.mapping[key] ?? ''}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      mapping: {
                        ...prev.mapping,
                        [key]: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    }))
                  }
                  className="border-input bg-background focus:ring-primary w-full rounded-md border px-2 py-1.5 text-sm focus:ring-1 focus:outline-none"
                >
                  <option value="">— no asignar —</option>
                  {state.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Col ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="border-border hover:bg-muted rounded-lg border px-4 py-2 text-sm"
            >
              Volver
            </button>
            <button
              onClick={handleValidate}
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Validar y continuar <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Preview ──────────────────────────────────────────────────── */}
      {step === 3 &&
        (() => {
          const filteredRows =
            filterMode === 'ERRORS' ? activeRows.filter((r) => r.errors.length > 0) : activeRows

          return (
            <div className="space-y-4">
              {/* Stats bar */}
              <div className="border-border bg-card flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" /> {validCount} válidas
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertCircle className="h-4 w-4" /> {dupCount} duplicadas
                </span>
                <span className="text-destructive flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> {errorCount} errores
                </span>

                <div className="ml-auto flex gap-2">
                  {(['ALL', 'ERRORS'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setFilterMode(mode)
                        setVisibleRowsCount(100)
                      }}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        filterMode === mode
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80',
                      )}
                    >
                      {mode === 'ALL' ? 'Todos' : 'Solo errores'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="border-border max-h-[60vh] overflow-auto rounded-xl border">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-muted/90 sticky top-0 z-10 backdrop-blur">
                    <tr>
                      <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold">
                        #
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold">
                        Estado
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold">
                        Empresa
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold">
                        Fecha
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold">
                        Tipo
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-right text-xs font-semibold">
                        Monto
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold">
                        Concepto
                      </th>
                      <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold">
                        Errores
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.slice(0, visibleRowsCount).map((row) => {
                      const isError = row.errors.length > 0
                      const isDup = row.isDuplicate
                      return (
                        <tr
                          key={row.rowNumber}
                          className={cn(
                            'border-border border-b last:border-0',
                            isError && 'bg-destructive/5',
                            isDup && !isError && 'bg-amber-50 dark:bg-amber-950/20',
                            !isError && !isDup && 'hover:bg-muted/30',
                          )}
                        >
                          <td className="text-muted-foreground px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">
                            {isError ? (
                              <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                                <XCircle className="h-3 w-3" /> Error
                              </span>
                            ) : isDup ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <AlertCircle className="h-3 w-3" /> Duplicado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" /> OK
                              </span>
                            )}
                          </td>
                          <td className="text-muted-foreground px-3 py-2 text-xs">
                            {row._empresaLabel ?? '—'}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {row.data
                              ? new Date(row.data.fecha).toLocaleDateString('es-MX')
                              : String(row.raw.fecha ?? '—')}
                          </td>
                          <td className="px-3 py-2">
                            {row.data ? row.data.tipo : String(row.raw.tipo ?? '—')}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.data
                              ? row.data.monto.toLocaleString('es-MX', {
                                  style: 'currency',
                                  currency: 'MXN',
                                })
                              : String(row.raw.monto ?? '—')}
                          </td>
                          <td className="max-w-xs truncate px-3 py-2">
                            {row.data ? row.data.concepto : String(row.raw.concepto ?? '—')}
                          </td>
                          <td className="text-destructive px-3 py-2 text-xs">
                            {row.errors.join('; ')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredRows.length > visibleRowsCount && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="text-muted-foreground text-sm">
                    Mostrando {visibleRowsCount} de {filteredRows.length} registros
                  </p>
                  <button
                    onClick={() => setVisibleRowsCount((prev) => prev + 500)}
                    className="border-border bg-muted/30 hover:bg-muted rounded-full border px-4 py-1.5 text-sm font-medium"
                  >
                    Cargar 500 más
                  </button>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="border-border hover:bg-muted rounded-lg border px-4 py-2 text-sm"
                >
                  Volver
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || validCount === 0}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Confirmar importación ({validCount} filas)
                </button>
              </div>
            </div>
          )
        })()}

      {/* ── STEP 4: Summary ──────────────────────────────────────────────── */}
      {step === 4 && state.importResult && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-foreground text-xl font-bold">¡Importación completada!</h2>
          </div>

          {/* Global stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: 'Total filas', value: state.importResult.total, color: 'text-foreground' },
              { label: 'Importadas', value: state.importResult.imported, color: 'text-green-600' },
              {
                label: 'Duplicadas',
                value: state.importResult.duplicates,
                color: 'text-amber-500',
              },
              { label: 'Omitidas', value: state.importResult.omitted, color: 'text-blue-500' },
              { label: 'Errores', value: state.importResult.errors, color: 'text-destructive' },
            ].map((s) => (
              <div
                key={s.label}
                className="border-border bg-card rounded-xl border p-4 text-center"
              >
                <p className={cn('text-3xl font-bold tabular-nums', s.color)}>{s.value}</p>
                <p className="text-muted-foreground mt-1 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-empresa breakdown */}
          {state.importResult.porEmpresa && state.importResult.porEmpresa.length > 0 && (
            <div className="border-border bg-card overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border bg-muted/50 border-b">
                    <th className="text-muted-foreground px-4 py-2 text-left text-xs font-semibold">
                      Empresa
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-green-600">
                      Importadas
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-amber-500">
                      Duplicadas
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-blue-500">
                      Omitidas
                    </th>
                    <th className="text-muted-foreground px-4 py-2 text-right text-xs font-semibold">
                      Fuente
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.importResult.porEmpresa.map((emp) => {
                    const isBmCorp = emp.empresaNombre.toUpperCase().includes('BM')
                    return (
                      <tr key={emp.empresaNombre} className="border-border border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{emp.empresaNombre}</td>
                        <td className="px-4 py-3 text-right text-green-600 tabular-nums">
                          {emp.importadas}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-500 tabular-nums">
                          {emp.duplicadas}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-500 tabular-nums">
                          {emp.omitidas}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isBmCorp ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Monday.com
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Excel
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setState({ file: null, headers: [], rawRows: [], mapping: {}, importResult: null })
                setStep(1)
              }}
              className="border-border hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
            >
              Subir otro archivo
            </button>
            <button
              onClick={() => router.push('/cargas')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Ver historial <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
