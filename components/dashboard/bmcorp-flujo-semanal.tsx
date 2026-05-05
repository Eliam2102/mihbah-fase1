'use client'

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { FlujoSemana } from '@/lib/services/dashboard-bmcorp.service'

function formatMXN(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

function formatSemanaLabel(iso: string): string {
  // ISO YYYY-MM-DD → "12 may"
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

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
      <p className="text-foreground mb-2 font-semibold">Semana del {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="mb-1 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="text-foreground font-medium tabular-nums">
            {p.value.toLocaleString('es-MX', {
              style: 'currency',
              currency: 'MXN',
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  data: FlujoSemana[]
}

export function BmcorpFlujoSemanal({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    semanaLabel: formatSemanaLabel(d.semana),
  }))

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Flujo semanal — últimas 12 semanas
        </p>
        <p className="text-muted-foreground text-xs">
          {chartData.length === 0 ? 'Sin datos' : `${chartData.length} semanas`}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          Sin movimientos registrados aún.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="semanaLabel"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatMXN}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              formatter={(v) => (v === 'ingresos' ? 'Ingresos' : 'Egresos')}
            />
            <Bar dataKey="ingresos" name="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos" name="egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
