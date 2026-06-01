'use client'
import NumberInput from '@/components/ui/number-input'
import { useConfirm } from '@/components/ui/confirm-dialog'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  getNivelOverridesAction,
  upsertNivelOverrideAction,
  eliminarNivelOverrideAction,
} from '@/app/actions/comisiones/esquemas'
import type { NivelOverride } from '@/lib/services/comisiones/esquemas.service'

type NivelStr = 'ONIX_NEGRO' | 'TURQUESA' | 'JADE'

const NIVELES: { key: NivelStr; label: string; desc: string }[] = [
  { key: 'JADE', label: 'Jade', desc: '≥ umbral alto' },
  { key: 'TURQUESA', label: 'Turquesa', desc: 'umbral medio' },
  { key: 'ONIX_NEGRO', label: 'Ónix Negro', desc: 'umbral bajo' },
]

interface NivelRow {
  nivel: NivelStr
  label: string
  desc: string
  override: NivelOverride | null
  // campos editables en UI
  afiliacion: string
  jorge: string
  kass: string
  diana: string
}

export function NivelOverrideDialog({
  empresaId,
  matrizId,
  matrizNombre,
  onClose,
}: {
  empresaId: string
  matrizId: string
  matrizNombre: string
  onClose: () => void
}) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [rows, setRows] = useState<NivelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    getNivelOverridesAction(matrizId).then((res) => {
      if (cancelled) return
      const overrideMap = new Map<NivelStr, NivelOverride>()
      if (res.ok) {
        for (const o of res.data) overrideMap.set(o.nivel as NivelStr, o)
      }
      setRows(
        NIVELES.map(({ key, label, desc }) => {
          const ov = overrideMap.get(key) ?? null
          return {
            nivel: key,
            label,
            desc,
            override: ov,
            afiliacion: ov ? String(ov.porcentajeAfiliacion) : '',
            jorge: ov ? String(ov.porcentajeJorgeBolsa) : '',
            kass: ov ? String(ov.porcentajeKassBolsa) : '',
            diana: ov ? String(ov.porcentajeDianaBolsa) : '',
          }
        }),
      )
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [matrizId])

  const update = (
    nivel: NivelStr,
    field: 'afiliacion' | 'jorge' | 'kass' | 'diana',
    val: string,
  ) => {
    setRows((prev) => prev.map((r) => (r.nivel === nivel ? { ...r, [field]: val } : r)))
  }

  const guardar = (nivel: NivelStr) => {
    const row = rows.find((r) => r.nivel === nivel)
    if (!row) return
    startTransition(async () => {
      const res = await upsertNivelOverrideAction(empresaId, matrizId, nivel, {
        porcentajeAfiliacion: Number(row.afiliacion),
        porcentajeJorgeBolsa: Number(row.jorge),
        porcentajeKassBolsa: Number(row.kass),
        porcentajeDianaBolsa: Number(row.diana),
      })
      if (!res.ok) toast.error(res.error)
      else {
        toast.success(`Nivel ${row.label} guardado`)
        router.refresh()
        // Recargar overrides
        const fresh = await getNivelOverridesAction(matrizId)
        if (fresh.ok) {
          const m = new Map<NivelStr, NivelOverride>()
          for (const o of fresh.data) m.set(o.nivel as NivelStr, o)
          setRows((prev) =>
            prev.map((r) => ({
              ...r,
              override: m.get(r.nivel) ?? null,
            })),
          )
        }
      }
    })
  }

  const eliminar = async (row: NivelRow) => {
    if (!row.override) return
    const ok = await confirm({
      title: `¿Eliminar bono nivel ${row.label}?`,
      confirmText: 'Eliminar',
    })
    if (!ok) return
    startTransition(async () => {
      const res = await eliminarNivelOverrideAction(empresaId, row.override!.id)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success('Eliminado')
        setRows((prev) =>
          prev.map((r) =>
            r.nivel === row.nivel
              ? { ...r, override: null, afiliacion: '', jorge: '', kass: '', diana: '' }
              : r,
          ),
        )
        router.refresh()
      }
    })
  }

  const suma = (row: NivelRow) =>
    [row.afiliacion, row.jorge, row.kass, row.diana].map(Number).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-foreground text-lg font-bold">Bonos por nivel — {matrizNombre}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-muted-foreground mb-5 text-sm">
          Configura los % alternativos por nivel de membresía. Deben sumar 15% (bolsa comercial). El
          bono = aumento en % afiliación, descontado de Jorge + Kass bolsa por igual.
        </p>

        {loading ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Cargando…</p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const s = suma(row)
              const ok = Math.abs(s - 15) < 0.01
              const hasData = row.afiliacion !== '' || row.jorge !== '' || row.kass !== ''
              return (
                <div
                  key={row.nivel}
                  className={`rounded-xl border p-4 ${
                    row.override ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-foreground font-semibold">{row.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{row.desc}</span>
                      {row.override && (
                        <span className="bg-primary/10 text-primary ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium">
                          Configurado
                        </span>
                      )}
                    </div>
                    {row.override && (
                      <button
                        type="button"
                        onClick={() => eliminar(row)}
                        disabled={pending}
                        className="text-muted-foreground rounded p-1 hover:bg-rose-50 hover:text-rose-600"
                        title="Eliminar este nivel"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <PctField
                      label="Afiliación %"
                      value={row.afiliacion}
                      onChange={(v) => update(row.nivel, 'afiliacion', v)}
                    />
                    <PctField
                      label="Jorge bolsa %"
                      value={row.jorge}
                      onChange={(v) => update(row.nivel, 'jorge', v)}
                    />
                    <PctField
                      label="Kass bolsa %"
                      value={row.kass}
                      onChange={(v) => update(row.nivel, 'kass', v)}
                    />
                    <PctField
                      label="Diana bolsa %"
                      value={row.diana}
                      onChange={(v) => update(row.nivel, 'diana', v)}
                    />
                  </div>

                  {hasData && (
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`text-xs font-medium ${
                          ok ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        Suma: {s.toFixed(2)}% {ok ? 'OK' : '≠ 15%'}
                      </span>
                      <button
                        type="button"
                        disabled={pending || !ok}
                        onClick={() => guardar(row.nivel)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        <Save className="h-3 w-3" /> Guardar {row.label}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Regla Dream Big:</strong> el bono sale de Kass + Jorge por igual. Si el nivel Ónix
          da +1% al asesor, resta 0.5% de Jorge y 0.5% de Kass vs la base.
        </div>
      </div>
    </div>
  )
}

function PctField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1 block text-[10px] font-medium uppercase">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-background w-full rounded-md border px-2 py-1.5 text-sm tabular-nums"
          placeholder="0"
        />
        <span className="text-muted-foreground text-xs">%</span>
      </div>
    </div>
  )
}
