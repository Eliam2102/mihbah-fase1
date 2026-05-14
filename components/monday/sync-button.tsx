'use client'

/**
 * MondaySyncButton
 * Client component — handles loading state and result display.
 */

import { useState } from 'react'
import { triggerSync, type TriggerSyncResult } from '@/app/actions/monday-sync'
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  empresaId: string
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function MondaySyncButton({ empresaId }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TriggerSyncResult | null>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await triggerSync(empresaId)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        id="btn-monday-sync"
        onClick={handleSync}
        disabled={loading}
        className={cn(
          'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all',
          loading
            ? 'bg-primary/60 text-primary-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
        )}
      >
        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        {loading ? 'Sincronizando…' : 'Sincronizar ahora'}
      </button>

      {result && (
        <div
          className={cn(
            'rounded-xl border p-4 text-sm',
            result.ok
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-destructive/30 bg-destructive/10',
          )}
        >
          {result.ok ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                Sincronización completada — {result.boardName}
              </div>
              <div className="grid grid-cols-4 gap-3 pt-1">
                {[
                  { label: 'Total items', value: result.totalItems ?? 0, color: 'text-foreground' },
                  { label: 'Creados', value: result.creados ?? 0, color: 'text-green-600' },
                  {
                    label: 'Actualizados',
                    value: result.actualizados ?? 0,
                    color: 'text-blue-500',
                  },
                  { label: 'Errores', value: result.errores ?? 0, color: 'text-destructive' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="text-muted-foreground text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              {(result.duration ?? 0) > 0 && (
                <p className="text-muted-foreground text-xs">
                  Duración: {((result.duration ?? 0) / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          ) : (
            <div className="text-destructive flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Error en sincronización</p>
                <p className="mt-0.5 text-xs opacity-80">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
