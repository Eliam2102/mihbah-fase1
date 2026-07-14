'use client'

import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from 'recharts'
import type { FlujoMensual } from '@/lib/services/dashboard.service'
import { formatMXN, formatMXNCompact } from '@/lib/utils'

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="border-border bg-popover rounded-xl border px-4 py-3 text-sm shadow-lg">
      <p className="text-foreground mb-2 font-semibold">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="mb-1 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="text-foreground font-medium tabular-nums">
            {p.value.toLocaleString('es-MX', {
              style: 'currency',
              currency: 'MXN',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      ))}
    </div>
  )
}

interface FlowChartProps {
  data: FlujoMensual[]
  loading?: boolean
}

export function FlowChart({ data, loading = false }: FlowChartProps) {
  if (loading) {
    return (
      <div className="border-border bg-card animate-pulse rounded-xl border p-5">
        <div className="bg-muted mb-4 h-4 w-32 rounded" />
        <div className="bg-muted h-48 w-full rounded" />
      </div>
    )
  }

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <p className="text-muted-foreground mb-4 text-xs font-semibold tracking-widest uppercase">
        Flujo mensual
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="mesLabel"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatMXNCompact}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            formatter={(value) =>
              value === 'ingresos' ? 'Ingresos' : value === 'egresos' ? 'Egresos' : 'Neto'
            }
          />
          {/* Stacked area: ingresos */}
          <Area
            type="monotone"
            dataKey="ingresos"
            name="ingresos"
            stackId="stack"
            stroke="#10b981"
            fill="#10b98120"
            strokeWidth={2}
          />
          {/* Stacked area: egresos */}
          <Area
            type="monotone"
            dataKey="egresos"
            name="egresos"
            stackId="stack"
            stroke="#f43f5e"
            fill="#f43f5e18"
            strokeWidth={2}
          />
          {/* Neto line on top */}
          <Line
            type="monotone"
            dataKey="neto"
            name="neto"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#6366f1' }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
