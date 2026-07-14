'use client'

import { useEffect } from 'react'
import { useSyncStatusStore } from '@/stores/sync-status-store'

interface Props {
  fecha: string | null
  stale: boolean
  empresaId: string
}

export function BmcorpSyncProvider({ fecha, stale, empresaId }: Props) {
  const setStatus = useSyncStatusStore((s) => s.setStatus)

  useEffect(() => {
    setStatus({ fecha, stale, empresaId })
    return () => setStatus(null)
  }, [fecha, stale, empresaId, setStatus])

  return null
}
