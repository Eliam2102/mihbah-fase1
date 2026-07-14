'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { recalcularVentaAction } from '@/app/actions/comisiones/dispersiones'

export function RecalcularBoton({ empresaId, ventaId }: { empresaId: string; ventaId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function recalcular() {
    setError(null)
    startTransition(async () => {
      const result = await recalcularVentaAction(empresaId, ventaId)
      if (!result.ok) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={recalcular}
        disabled={pending}
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />
        {pending ? 'Recalculando...' : 'Recalcular comisión'}
      </button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
