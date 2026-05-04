'use client'

import type { AvanceProyecto } from '@/lib/services/dashboard.service'

interface ProyectosCardProps {
  proyectos: AvanceProyecto[]
  loading?: boolean
}

function formatMXN(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
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
        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
          Avance por proyecto
        </p>
        <p className="text-muted-foreground py-6 text-center text-sm">Sin proyectos registrados.</p>
      </div>
    )
  }

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <p className="text-muted-foreground mb-4 text-xs font-semibold tracking-widest uppercase">
        Avance por proyecto
      </p>
      <div className="space-y-3">
        {proyectos.map((p) => (
          <div
            key={p.id}
            className="border-border flex items-center justify-between border-b py-2 last:border-0"
          >
            <span className="text-foreground max-w-[60%] truncate text-sm font-medium">
              {p.nombre}
            </span>
            <span className="text-foreground text-sm font-bold tabular-nums">
              {formatMXN(p.gastado)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
