'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Save } from 'lucide-react'
import { actualizarLiderAction } from '@/app/actions/comisiones/alianzas'

export interface LiderNivelRow {
  id: string
  nombre: string
  alianzaNombre: string
  nivelActual: 'JADE' | 'TURQUESA' | 'ONIX_NEGRO' | null
  promedioMensual: number
  presupuestoPautasMensual: number
}

// Doc YESYUCAN v5 §1 — umbrales terrenos (en pesos)
function sugerirNivel(promedio: number): 'JADE' | 'TURQUESA' | 'ONIX_NEGRO' | null {
  if (promedio >= 5_000_000) return 'JADE'
  if (promedio >= 3_500_000) return 'TURQUESA'
  if (promedio >= 2_000_000) return 'ONIX_NEGRO'
  return null
}

const NIVEL_COLOR: Record<string, string> = {
  JADE: 'bg-jade-100 text-jade-800',
  TURQUESA: 'bg-cyan-100 text-cyan-800',
  ONIX_NEGRO: 'bg-slate-200 text-slate-800',
}

const PAUTA_POR_NIVEL: Record<string, number> = {
  JADE: 15000,
  TURQUESA: 10000,
  ONIX_NEGRO: 5000,
}

export function NivelesView({
  empresaId,
  lideres,
}: {
  empresaId: string
  lideres: LiderNivelRow[]
}) {
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const sorted = [...lideres].sort((a, b) =>
    `${a.alianzaNombre} ${a.nombre}`.localeCompare(`${b.alianzaNombre} ${b.nombre}`),
  )

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Líder</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Alianza</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase">
                Promedio mes (últ. 3)
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase">Sugerencia</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase">
                Nivel asignado
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase">
                Pauta mensual
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-3 py-8 text-center">
                  Sin líderes registrados aún.
                </td>
              </tr>
            ) : (
              sorted.map((l) => <FilaNivel key={l.id} empresaId={empresaId} lider={l} fmt={fmt} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilaNivel({
  empresaId,
  lider,
  fmt,
}: {
  empresaId: string
  lider: LiderNivelRow
  fmt: (n: number) => string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [nivel, setNivel] = useState<'' | 'JADE' | 'TURQUESA' | 'ONIX_NEGRO'>(
    lider.nivelActual ?? '',
  )
  const [pauta, setPauta] = useState<number>(lider.presupuestoPautasMensual)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const sugerencia = sugerirNivel(lider.promedioMensual)
  const dirty =
    (nivel || null) !== (lider.nivelActual ?? null) || pauta !== lider.presupuestoPautasMensual

  function aplicarSugerencia() {
    if (sugerencia) {
      setNivel(sugerencia)
      setPauta(PAUTA_POR_NIVEL[sugerencia] ?? 0)
    }
  }

  function aplicarPautaSegunNivel() {
    if (nivel) setPauta(PAUTA_POR_NIVEL[nivel] ?? 0)
  }

  function guardar() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await actualizarLiderAction(empresaId, lider.id, {
        nivel: nivel || null,
        presupuestoPautasMensual: pauta,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <tr className="hover:bg-muted/20">
      <td className="px-3 py-2 font-medium">{lider.nombre}</td>
      <td className="text-muted-foreground px-3 py-2 text-xs">{lider.alianzaNombre}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {fmt(lider.promedioMensual)}
        <p className="text-muted-foreground text-[10px]">3 meses ÷ 3</p>
      </td>
      <td className="px-3 py-2 text-center">
        {sugerencia ? (
          <button
            onClick={aplicarSugerencia}
            disabled={pending || nivel === sugerencia}
            title="Click para aplicar"
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${NIVEL_COLOR[sugerencia]} hover:opacity-80 disabled:opacity-40`}
          >
            {sugerencia.replace('_', ' ')}
          </button>
        ) : (
          <span className="text-muted-foreground text-xs">Sin nivel</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <select
          value={nivel}
          onChange={(e) => setNivel(e.target.value as typeof nivel)}
          className="input w-auto"
        >
          <option value="">Sin asignar</option>
          <option value="JADE">Jade</option>
          <option value="TURQUESA">Turquesa</option>
          <option value="ONIX_NEGRO">Ónix Negro</option>
        </select>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <input
            type="number"
            min={0}
            step={1000}
            value={pauta}
            onChange={(e) => setPauta(Number(e.target.value))}
            className="input w-28 text-right tabular-nums"
          />
          <button
            onClick={aplicarPautaSegunNivel}
            disabled={!nivel}
            title="Aplicar pauta sugerida por nivel"
            className="text-muted-foreground hover:text-foreground text-[10px] disabled:opacity-30"
          >
            auto
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        {error ? (
          <span className="text-destructive inline-flex items-center gap-1 text-xs">
            <AlertCircle className="h-3 w-3" /> {error}
          </span>
        ) : saved ? (
          <span className="text-success inline-flex items-center gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3" /> Guardado
          </span>
        ) : (
          <button
            onClick={guardar}
            disabled={!dirty || pending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded px-2 py-1 text-xs disabled:opacity-40"
          >
            <Save className="h-3 w-3" /> Guardar
          </button>
        )}
      </td>
    </tr>
  )
}
