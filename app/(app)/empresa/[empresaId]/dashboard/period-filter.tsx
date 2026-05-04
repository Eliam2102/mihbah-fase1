'use client'

import { useQueryState } from 'nuqs'
// useRouter removed — not needed here

const AÑOS = [2023, 2024, 2025, 2026, 2027]
const MESES = [
  { value: '', label: 'Acumulado' },
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

export function PeriodFilter() {
  const [anio, setAnio] = useQueryState('anio', {
    defaultValue: String(new Date().getFullYear()),
    shallow: false,
  })
  const [mes, setMes] = useQueryState('mes', { defaultValue: '', shallow: false })

  return (
    <div className="flex items-center gap-2">
      <select
        value={anio}
        onChange={(e) => setAnio(e.target.value)}
        className="border-border bg-background text-foreground focus:ring-primary/40 rounded-lg border px-3 py-2 text-sm font-medium focus:ring-2 focus:outline-none"
        aria-label="Año"
      >
        {AÑOS.map((a) => (
          <option key={a} value={String(a)}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={mes}
        onChange={(e) => setMes(e.target.value || null)}
        className="border-border bg-background text-foreground focus:ring-primary/40 rounded-lg border px-3 py-2 text-sm font-medium focus:ring-2 focus:outline-none"
        aria-label="Mes"
      >
        {MESES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  )
}
