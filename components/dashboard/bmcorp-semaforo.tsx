import { ShieldAlert } from 'lucide-react'

/**
 * Semáforo de salud BM CORP — placeholder.
 *
 * Los criterios (umbrales para verde/amarillo/naranja/rojo) los define Carla.
 * Hasta que entregue la lógica, este componente muestra "En configuración".
 *
 * Ver: docs/EPICA_8_DASHBOARD_BMCORP.md sección "Dependencias externas"
 */
export function BmcorpSemaforo() {
  return (
    <div className="border-border bg-card flex flex-col gap-2 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-muted/50 flex h-10 w-10 items-center justify-center rounded-full">
          <ShieldAlert className="text-muted-foreground h-5 w-5" />
        </div>
        <div>
          <p className="text-foreground text-sm font-semibold">Semáforo de salud BM CORP</p>
          <p className="text-muted-foreground text-xs">
            En configuración — pendiente de criterios del cliente
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="h-3 w-3 rounded-full bg-emerald-400 opacity-30" />
        <span className="h-3 w-3 rounded-full bg-amber-400 opacity-30" />
        <span className="h-3 w-3 rounded-full bg-orange-500 opacity-30" />
        <span className="h-3 w-3 rounded-full bg-red-500 opacity-30" />
      </div>
    </div>
  )
}
