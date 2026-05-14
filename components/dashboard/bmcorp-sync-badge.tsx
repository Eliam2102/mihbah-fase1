'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSyncStatusStore } from '@/stores/sync-status-store'
import { triggerSync } from '@/app/actions/monday-sync'

type SyncState = 'idle' | 'loading' | 'error'

function fmtSyncDate(iso: string | null): string {
  if (!iso) return 'Nunca sincronizado'
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  )
}

export function BmcorpSyncBadge() {
  const syncStatus = useSyncStatusStore((s) => s.status)
  const router = useRouter()
  const [state, setState] = useState<SyncState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!syncStatus) return null

  async function handleSync(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (state === 'loading') return

    setState('loading')
    setErrorMsg(null)

    const result = await triggerSync(syncStatus!.empresaId)

    if (result.ok) {
      router.refresh()
      setState('idle')
    } else {
      setErrorMsg(result.error ?? 'Error al sincronizar')
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const isStale = syncStatus.stale
  const isLoading = state === 'loading'
  const isError = state === 'error'

  return (
    <div
      className={cn(
        'flex items-center gap-0 overflow-hidden rounded-lg border text-xs font-medium',
        isError
          ? 'border-red-200 dark:border-red-800'
          : isStale
            ? 'border-amber-200 dark:border-amber-800'
            : 'border-border',
      )}
    >
      {/* Left: status icon + date → link to history */}
      <Link
        href={`/empresa/${syncStatus.empresaId}/monday`}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 transition-colors',
          isError
            ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
            : isStale
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        title="Ver historial de sincronización"
      >
        {isError ? (
          <XCircle className="h-3.5 w-3.5 shrink-0" />
        ) : isStale ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        )}
        <span className="hidden tabular-nums sm:inline">
          {isError ? errorMsg : fmtSyncDate(syncStatus.fecha)}
        </span>
      </Link>

      {/* Divider */}
      <div
        className={cn(
          'w-px self-stretch',
          isError
            ? 'bg-red-200 dark:bg-red-800'
            : isStale
              ? 'bg-amber-200 dark:bg-amber-800'
              : 'bg-border',
        )}
      />

      {/* Right: sync button */}
      <button
        onClick={handleSync}
        disabled={isLoading}
        title="Sincronizar ahora"
        className={cn(
          'flex items-center justify-center px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed',
          isError
            ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
            : isStale
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}
