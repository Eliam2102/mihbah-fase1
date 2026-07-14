'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Mail,
  Phone,
  Plus,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type { Afiliado, Lider, Asesor } from '@/lib/services/comisiones/alianzas.service'
import type { Matriz } from '@/lib/services/comisiones/esquemas.service'
import { AlianzaPanel } from './alianza-panel'
import { AlianzaForm } from './alianza-form'

export interface AlianzaConRelaciones {
  afiliado: Afiliado
  lideres: Lider[]
  asesores: Asesor[]
  matrizTerreno: Matriz | null
  matrizAccion: Matriz | null
}

type Filtro = 'TODAS' | 'SIN_LIDER' | 'PENDIENTE_MATRIZ' | 'CON_NOTAS'

const METODO_PILL: Record<string, string> = {
  EFECTIVO: 'bg-emerald-100 text-emerald-800',
  DEPOSITO: 'bg-indigo-100 text-indigo-800',
  TRANSFERENCIA: 'bg-blue-100 text-blue-800',
  OTRO: 'bg-muted text-muted-foreground',
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  DEPOSITO: 'Depósito',
  TRANSFERENCIA: 'Transf.',
  OTRO: 'Otro',
}

export function AlianzasView({
  empresaId,
  alianzas,
}: {
  empresaId: string
  alianzas: AlianzaConRelaciones[]
}) {
  const [query, setQuery] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('TODAS')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const filtradas = useMemo(() => {
    const q = query.toLowerCase().trim()
    return alianzas.filter((a) => {
      if (filtro === 'SIN_LIDER' && a.lideres.length > 0) return false
      if (filtro === 'PENDIENTE_MATRIZ') {
        const pendT = !a.matrizTerreno || a.matrizTerreno.requiereConfig
        const pendY = !a.matrizAccion || a.matrizAccion.requiereConfig
        if (!pendT && !pendY) return false
      }
      if (filtro === 'CON_NOTAS') {
        const tN = a.matrizTerreno?.notas?.trim()
        const yN = a.matrizAccion?.notas?.trim()
        if (!tN && !yN) return false
      }
      if (q) {
        const lider = a.lideres[0]
        const haystack =
          `${a.afiliado.nombre} ${a.afiliado.mondayLabel ?? ''} ${lider?.nombre ?? ''} ${lider?.email ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [alianzas, query, filtro])

  const selected = alianzas.find((a) => a.afiliado.id === selectedId) ?? null

  const totalAsesores = alianzas.reduce((s, a) => s + a.asesores.length, 0)
  const sinLider = alianzas.filter((a) => a.lideres.length === 0).length
  const pendMatriz = alianzas.filter(
    (a) =>
      !a.matrizTerreno ||
      a.matrizTerreno.requiereConfig ||
      !a.matrizAccion ||
      a.matrizAccion.requiereConfig,
  ).length

  return (
    <div className="space-y-3">
      {/* Stats inline compact */}
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Stat label="Alianzas" value={alianzas.length} />
          <span className="text-muted-foreground">·</span>
          <Stat label="Asesores" value={totalAsesores} />
          <span className="text-muted-foreground">·</span>
          <Stat label="Sin líder" value={sinLider} accent={sinLider > 0 ? 'warning' : undefined} />
          <span className="text-muted-foreground">·</span>
          <Stat
            label="Matriz pendiente"
            value={pendMatriz}
            accent={pendMatriz > 0 ? 'warning' : undefined}
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva alianza
        </button>
      </div>

      {/* Toolbar: search + filtros */}
      <div className="bg-card flex flex-wrap items-center gap-2 rounded-lg border p-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar alianza, líder o correo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input w-full pr-8 pl-8 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <FiltroChip activo={filtro === 'TODAS'} onClick={() => setFiltro('TODAS')}>
            Todas
          </FiltroChip>
          <FiltroChip activo={filtro === 'SIN_LIDER'} onClick={() => setFiltro('SIN_LIDER')}>
            Sin líder
          </FiltroChip>
          <FiltroChip
            activo={filtro === 'PENDIENTE_MATRIZ'}
            onClick={() => setFiltro('PENDIENTE_MATRIZ')}
          >
            Matriz pendiente
          </FiltroChip>
          <FiltroChip activo={filtro === 'CON_NOTAS'} onClick={() => setFiltro('CON_NOTAS')}>
            Con notas
          </FiltroChip>
        </div>
        <span className="text-muted-foreground ml-auto text-xs">
          {filtradas.length} de {alianzas.length}
        </span>
      </div>

      {/* Form crear alianza (inline arriba si activo) */}
      {creating && (
        <div className="bg-card rounded-lg border p-4">
          <AlianzaForm
            empresaId={empresaId}
            variant="inline"
            onDone={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {/* Tabla CRM densa */}
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Alianza</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Líder</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">Correo</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase">
                  Teléfono
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase">
                  Coordina
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase">
                  Método
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase">
                  Asesores
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase">Terr.</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase">YCD</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-muted-foreground px-3 py-10 text-center text-xs">
                    Sin resultados con esos filtros.
                  </td>
                </tr>
              ) : (
                filtradas.map((a) => {
                  const lider = a.lideres[0]
                  const matrizT = a.matrizTerreno
                  const matrizY = a.matrizAccion
                  const okT = matrizT && !matrizT.requiereConfig
                  const okY = matrizY && !matrizY.requiereConfig
                  const tieneNotaT = matrizT?.notas?.trim()
                  const tieneNotaY = matrizY?.notas?.trim()

                  return (
                    <tr
                      key={a.afiliado.id}
                      onClick={() => setSelectedId(a.afiliado.id)}
                      className="hover:bg-muted/30 cursor-pointer"
                    >
                      <td className="px-3 py-2.5">
                        <p className="text-foreground font-medium">{a.afiliado.nombre}</p>
                        {a.afiliado.mondayLabel && (
                          <p className="text-muted-foreground/70 font-mono text-[10px]">
                            {a.afiliado.mondayLabel}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {lider ? (
                          <p className="text-foreground">{lider.nombre}</p>
                        ) : (
                          <span className="text-warning inline-flex items-center gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            Sin líder
                          </span>
                        )}
                        {a.lideres.length > 1 && (
                          <p className="text-muted-foreground text-[10px]">
                            +{a.lideres.length - 1} más
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {lider?.email ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Mail className="text-muted-foreground h-3 w-3 shrink-0" />
                            <a
                              href={`mailto:${lider.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-foreground max-w-[180px] truncate hover:underline"
                              title={lider.email}
                            >
                              {lider.email}
                            </a>
                            {lider.emailAlterno && (
                              <span
                                className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                title={`Alterno: ${lider.emailAlterno}`}
                              >
                                +1
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/70 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {lider?.telefono ? (
                          <a
                            href={`tel:${lider.telefono.replace(/\s/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-foreground inline-flex items-center gap-1.5 text-xs tabular-nums hover:underline"
                          >
                            <Phone className="text-muted-foreground h-3 w-3 shrink-0" />
                            {lider.telefono}
                          </a>
                        ) : (
                          <span className="text-muted-foreground/70 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {lider?.coordinaPago ? (
                          <span className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
                            <Wallet className="h-2.5 w-2.5" />
                            {lider.coordinaPago}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {lider?.metodoPago ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              METODO_PILL[lider.metodoPago] ?? 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {METODO_LABEL[lider.metodoPago] ?? lider.metodoPago}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/70 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums">
                          <Users className="h-2.5 w-2.5" />
                          {a.asesores.length}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <MatrizPill
                          ok={!!okT}
                          pct={matrizT?.porcentajeAfiliacion ?? null}
                          nota={!!tieneNotaT}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <MatrizPill
                          ok={!!okY}
                          pct={matrizY?.porcentajeAfiliacion ?? null}
                          nota={!!tieneNotaY}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <ChevronRight className="text-muted-foreground/40 h-4 w-4" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer lateral con AlianzaPanel */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/40"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-background relative h-full w-full max-w-3xl overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Detalle alianza
                </p>
                <p className="text-foreground text-lg font-bold">{selected.afiliado.nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-9 w-9 items-center justify-center rounded-md"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <AlianzaPanel
                empresaId={empresaId}
                alianza={selected}
                onBack={() => setSelectedId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'warning' | undefined
}) {
  const color = accent === 'warning' ? 'text-warning' : 'text-foreground'
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <span className={`text-base font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

function FiltroChip({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11px] font-medium ${
        activo
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/70'
      }`}
    >
      {children}
    </button>
  )
}

function MatrizPill({
  ok,
  pct,
  nota,
}: {
  ok: boolean
  pct?: string | number | null
  nota: boolean
}) {
  if (ok) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
          nota ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
        }`}
        title={nota ? 'Configurada con nota por validar' : 'Configurada'}
      >
        {nota ? <AlertCircle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
        {pct}%
      </span>
    )
  }
  return (
    <span className="bg-warning/15 text-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
      <AlertCircle className="h-2.5 w-2.5" />
      Pendiente
    </span>
  )
}
