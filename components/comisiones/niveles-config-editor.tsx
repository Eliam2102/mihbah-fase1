'use client'
import NumberInput from '@/components/ui/number-input'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Check, AlertCircle } from 'lucide-react'
import { actualizarNivelConfigAction } from '@/app/actions/comisiones/niveles'

export interface NivelConfigRow {
  id: string
  nivel: 'JADE' | 'TURQUESA' | 'ONIX_NEGRO'
  tipoProducto: 'TERRENO' | 'ACCION'
  umbralMin: string
  umbralMax: string | null
  porcentajeBono: string
  activo: boolean
}

const NIVEL_LABEL: Record<string, string> = {
  JADE: 'Jade',
  TURQUESA: 'Turquesa',
  ONIX_NEGRO: 'Ónix Negro',
}
const NIVEL_ORDER: Record<string, number> = { JADE: 0, TURQUESA: 1, ONIX_NEGRO: 2 }

export function NivelesConfigEditor({
  empresaId,
  config,
}: {
  empresaId: string
  config: NivelConfigRow[]
}) {
  const productos: Array<{ key: 'TERRENO' | 'ACCION'; label: string }> = [
    { key: 'TERRENO', label: 'Terrenos (Aliados del Universo)' },
    { key: 'ACCION', label: 'YCD (Partners Yucandoit)' },
  ]

  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-foreground mb-1 text-sm font-semibold">Umbrales y bonos por nivel</p>
      <p className="text-muted-foreground mb-4 text-xs">
        Editable. El sistema sugiere el nivel comparando el promedio mensual de ventas contra estos
        rangos. Umbral máximo vacío = nivel tope (sin techo).
      </p>
      <div className="space-y-5">
        {productos.map((p) => (
          <div key={p.key}>
            <p className="text-foreground mb-2 text-xs font-semibold">{p.label}</p>
            <div className="space-y-2">
              {config
                .filter((c) => c.tipoProducto === p.key)
                .sort((a, b) => NIVEL_ORDER[a.nivel]! - NIVEL_ORDER[b.nivel]!)
                .map((row) => (
                  <ConfigRow key={row.id} empresaId={empresaId} row={row} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfigRow({ empresaId, row }: { empresaId: string; row: NivelConfigRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [min, setMin] = useState(Number(row.umbralMin))
  const [max, setMax] = useState<string>(row.umbralMax != null ? String(Number(row.umbralMax)) : '')
  const [bono, setBono] = useState(Number(row.porcentajeBono))
  const [estado, setEstado] = useState<'idle' | 'ok' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  function guardar() {
    setError(null)
    setEstado('idle')
    startTransition(async () => {
      const res = await actualizarNivelConfigAction({
        empresaId,
        id: row.id,
        umbralMin: Number(min) || 0,
        umbralMax: max.trim() === '' ? null : Number(max),
        porcentajeBono: Number(bono) || 0,
      })
      if (!res.ok) {
        setEstado('error')
        setError(res.error)
        return
      }
      setEstado('ok')
      router.refresh()
      setTimeout(() => setEstado('idle'), 1500)
    })
  }

  return (
    <div className="border-border flex flex-wrap items-end gap-2 rounded-md border p-2.5">
      <span className="text-foreground w-20 text-xs font-semibold">{NIVEL_LABEL[row.nivel]}</span>
      <label className="flex flex-col text-[10px]">
        <span className="text-muted-foreground uppercase">Mín (MXN/mes)</span>
        <input
          type="number"
          value={min}
          onChange={(e) => setMin(Number(e.target.value))}
          className="border-border bg-background w-32 rounded border px-2 py-1 text-sm tabular-nums"
        />
      </label>
      <label className="flex flex-col text-[10px]">
        <span className="text-muted-foreground uppercase">Máx (vacío = tope)</span>
        <input
          type="number"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          placeholder="sin techo"
          className="border-border bg-background w-32 rounded border px-2 py-1 text-sm tabular-nums"
        />
      </label>
      <label className="flex flex-col text-[10px]">
        <span className="text-muted-foreground uppercase">Bono %</span>
        <input
          type="number"
          step="0.5"
          value={bono}
          onChange={(e) => setBono(Number(e.target.value))}
          className="border-border bg-background w-20 rounded border px-2 py-1 text-sm tabular-nums"
        />
      </label>
      <button
        onClick={guardar}
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-60"
      >
        {estado === 'ok' ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
        {pending ? 'Guardando…' : estado === 'ok' ? 'Guardado' : 'Guardar'}
      </button>
      {estado === 'error' && (
        <span className="text-destructive inline-flex items-center gap-1 text-[11px]">
          <AlertCircle className="h-3 w-3" /> {error}
        </span>
      )}
    </div>
  )
}
