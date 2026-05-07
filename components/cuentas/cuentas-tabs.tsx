'use client'

import { useQueryState } from 'nuqs'

export function CuentasTabs({ totalCxc, totalCxp }: { totalCxc: number; totalCxp: number }) {
  const [tab, setTab] = useQueryState('tab', { defaultValue: 'cxc', shallow: false })

  function fmt(n: number) {
    return n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    })
  }

  return (
    <div className="border-border flex overflow-hidden rounded-xl border">
      <button
        onClick={() => setTab('cxc')}
        className={`flex flex-1 items-center justify-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
          tab === 'cxc'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'text-muted-foreground hover:bg-muted/50'
        }`}
      >
        <span>Por Cobrar (CXC)</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${tab === 'cxc' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}
        >
          {fmt(totalCxc)}
        </span>
      </button>
      <div className="border-border w-px border-l" />
      <button
        onClick={() => setTab('cxp')}
        className={`flex flex-1 items-center justify-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
          tab === 'cxp'
            ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            : 'text-muted-foreground hover:bg-muted/50'
        }`}
      >
        <span>Por Pagar (CXP)</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${tab === 'cxp' ? 'bg-red-100 text-red-700 dark:bg-red-800/50 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}
        >
          {fmt(totalCxp)}
        </span>
      </button>
    </div>
  )
}
