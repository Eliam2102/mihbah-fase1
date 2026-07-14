'use client'

import { Users, GitBranch, AlertTriangle, ChevronRight } from 'lucide-react'
import type { AlianzaConRelaciones } from './alianzas-view'

export function AlianzaCardRail({
  alianza,
  selected,
  onClick,
}: {
  alianza: AlianzaConRelaciones
  selected: boolean
  onClick: () => void
}) {
  const sinConfigTerreno = !alianza.matrizTerreno || alianza.matrizTerreno.requiereConfig
  const sinConfigAccion = !alianza.matrizAccion || alianza.matrizAccion.requiereConfig
  const tieneAlerta = sinConfigTerreno || sinConfigAccion
  const sinLider = alianza.lideres.length === 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-lg border p-3 text-left transition-all ${
        selected
          ? 'bg-primary/5 border-primary/40 ring-primary/20 ring-1'
          : 'bg-card hover:bg-muted/30 hover:border-border'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-foreground truncate text-sm font-semibold">
              {alianza.afiliado.nombre}
            </p>
            {tieneAlerta && (
              <span
                className="bg-warning h-1.5 w-1.5 shrink-0 rounded-full"
                title="Matriz pendiente de configurar"
              />
            )}
          </div>
          {alianza.afiliado.mondayLabel ? (
            <p className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]">
              {alianza.afiliado.mondayLabel}
            </p>
          ) : (
            <p className="text-warning/80 mt-0.5 text-[10px] italic">Sin Monday label</p>
          )}
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            selected
              ? 'text-primary translate-x-0.5'
              : 'text-muted-foreground/50 group-hover:translate-x-0.5'
          }`}
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
          <GitBranch className="h-3 w-3" />
          <span className="tabular-nums">{alianza.lideres.length}</span>
        </span>
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
          <Users className="h-3 w-3" />
          <span className="tabular-nums">{alianza.asesores.length}</span>
        </span>
        {sinLider && alianza.asesores.length > 0 && (
          <span className="text-warning ml-auto inline-flex items-center gap-1 text-[10px]">
            <AlertTriangle className="h-2.5 w-2.5" />
            Sin líder
          </span>
        )}
      </div>
    </button>
  )
}
