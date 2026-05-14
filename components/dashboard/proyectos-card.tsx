'use client'

import type { AvanceProyecto } from '@/lib/services/dashboard.service'
import { formatMXN } from '@/lib/utils'

interface ProyectosCardProps {
  proyectos: AvanceProyecto[]
  loading?: boolean
}

export function ProyectosCard({ proyectos, loading = false }: ProyectosCardProps) {
  if (loading) {
    return (
      <div className="border-border bg-card animate-pulse space-y-3 rounded-xl border p-5">
        <div className="bg-muted h-3 w-28 rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-12 rounded" />
        ))}
      </div>
    )
  }

  if (proyectos.length === 0) {
    return (
      <div className="border-border bg-card rounded-xl border p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Avance por proyecto
          </p>
          <p className="text-muted-foreground text-[10px]">medido por gasto acumulado</p>
        </div>
        <p className="text-muted-foreground py-6 text-center text-sm">Sin proyectos registrados.</p>
      </div>
    )
  }

  const maxGastado = Math.max(...proyectos.map((p) => p.gastado), 1)

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Avance por proyecto
        </p>
        <p className="text-muted-foreground text-[10px]">medido por gasto acumulado</p>
      </div>
      <div className="space-y-4">
        {proyectos.map((p) => {
          const pct = Math.round((p.gastado / maxGastado) * 100)
          return (
            <div key={p.id}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-foreground max-w-[60%] truncate text-sm font-medium">
                  {p.nombre}
                </span>
                <span className="text-foreground text-sm font-bold tabular-nums">
                  {formatMXN(p.gastado)}
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary/70 h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                Gasto registrado (egresos + salidas)
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
