'use client'

import { useQueryState } from 'nuqs'

const AÑOS = [2022, 2023, 2024, 2025, 2026, 2027]

export function FlujoFiltros({ showVista = true }: { showVista?: boolean }) {
  const [anio, setAnio] = useQueryState('anio', {
    defaultValue: String(new Date().getFullYear()),
    shallow: false,
  })
  const [vista, setVista] = useQueryState('vista', { defaultValue: 'mensual', shallow: false })

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

      {showVista && (
        <div className="border-border flex overflow-hidden rounded-lg border">
          {(['mensual', 'trimestral', 'anual'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                vista === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
