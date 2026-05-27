'use client'

import { useState } from 'react'
import { Search, Wallet, X } from 'lucide-react'
import type { Dispersion } from '@/lib/services/comisiones/comisiones.service'
import { DispersionRow } from './dispersion-row'

export interface DispersionTableRow {
  d: Dispersion
  ventaCliente: string
  ventaId: string
  ventaDesarrolloNombre: string | null
  ventaLoteAcciones: string | null
  aprobadoPorNombre: string | null
}

const TIPO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Operativa BM Corp',
  OP_YESYUCAN: 'Operativa YESYUCAN',
  ASESOR: 'Comisión Asesor',
  LIDER_SALDO: 'Saldo Líder',
  SOCIO_BOLSA_JORGE: 'Socio Bolsa — Jorge',
  SOCIO_BOLSA_KASS: 'Socio Bolsa — Kass',
  SOCIO_BOLSA_DIANA: 'Socio Bolsa — Diana',
  SOCIO_FIJO_JORGE: 'Socio Fijo — Jorge (mensual)',
  SOCIO_FIJO_KASS: 'Socio Fijo — Kass (mensual)',
}

const TIPO_ORDER = Object.keys(TIPO_LABELS)

type Estado = 'TODOS' | 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'DIFERIDO'

const ESTADO_FILTROS: { id: Estado; label: string }[] = [
  { id: 'TODOS', label: 'Todas' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'PARCIAL', label: 'Parciales' },
  { id: 'DIFERIDO', label: 'Diferidas' },
  { id: 'PAGADO', label: 'Pagadas' },
]

export function DispersionesTable({
  empresaId,
  rows,
  canModify = false,
}: {
  empresaId: string
  rows: DispersionTableRow[]
  canModify?: boolean
}) {
  const [query, setQuery] = useState('')
  const [estado, setEstado] = useState<Estado>('TODOS')

  const fmt = (n: number) =>
    n.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const q = query.toLowerCase().trim()
  const filtradas = rows.filter((r) => {
    if (estado !== 'TODOS' && r.d.estado !== estado) return false
    if (!q) return true
    return (
      r.ventaCliente.toLowerCase().includes(q) ||
      r.d.beneficiarioNombre.toLowerCase().includes(q) ||
      r.d.estado.toLowerCase().includes(q) ||
      (r.d.fechaPago?.toLowerCase().includes(q) ?? false) ||
      (r.d.fechaEstimadaPago?.toLowerCase().includes(q) ?? false) ||
      (r.aprobadoPorNombre?.toLowerCase().includes(q) ?? false) ||
      (r.ventaDesarrolloNombre?.toLowerCase().includes(q) ?? false) ||
      (r.ventaLoteAcciones?.toLowerCase().includes(q) ?? false) ||
      r.d.tipoBeneficiario.toLowerCase().includes(q)
    )
  })

  const counts: Record<Estado, number> = {
    TODOS: rows.length,
    PENDIENTE: 0,
    PARCIAL: 0,
    PAGADO: 0,
    DIFERIDO: 0,
  }
  for (const r of rows) {
    if (r.d.estado in counts) counts[r.d.estado as Estado] += 1
  }

  const grupos = TIPO_ORDER.map((tipo) => {
    const subset = filtradas.filter((r) => r.d.tipoBeneficiario === tipo)
    return {
      tipo,
      label: TIPO_LABELS[tipo] ?? tipo,
      rows: subset,
      totalMonto: subset.reduce((s, r) => s + Number(r.d.montoTotal), 0),
      totalPagado: subset.reduce((s, r) => s + Number(r.d.montoPagado), 0),
    }
  }).filter((g) => g.rows.length > 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-card rounded-xl border p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente, desarrollo, lote, beneficiario, estado..."
              className="bg-background border-input focus:border-ring focus:ring-ring/20 w-full rounded-md border py-2 pr-8 pl-8 text-xs focus:ring-2 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                aria-label="Limpiar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {ESTADO_FILTROS.map((f) => {
              const active = estado === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setEstado(f.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      active ? 'bg-white/20' : 'bg-muted-foreground/15'
                    }`}
                  >
                    {counts[f.id]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-muted-foreground mt-2 text-[11px]">
          {filtradas.length} de {rows.length} dispersiones
        </p>
      </div>

      {grupos.length === 0 ? (
        <div className="bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm">
          <Wallet className="mx-auto mb-2 h-6 w-6 opacity-40" />
          {query || estado !== 'TODOS'
            ? 'Sin coincidencias. Ajusta búsqueda o filtro.'
            : 'Sin dispersiones que mostrar.'}
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.tipo} className="bg-card overflow-hidden rounded-xl border shadow-sm">
              <div className="bg-muted/30 flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <h3 className="text-sm font-semibold">{g.label}</h3>
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  <span>
                    {g.rows.length} línea{g.rows.length === 1 ? '' : 's'}
                  </span>
                  <span>
                    Pagado <span className="text-success">{fmt(g.totalPagado)}</span> de{' '}
                    <span className="text-foreground">{fmt(g.totalMonto)}</span>
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/10 text-muted-foreground border-t">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium sm:px-3">Beneficiario</th>
                      <th className="hidden px-3 py-1.5 text-left font-medium md:table-cell">
                        Venta
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium sm:px-3">Total</th>
                      <th className="hidden px-3 py-1.5 text-right font-medium sm:table-cell">
                        Pagado
                      </th>
                      <th className="px-2 py-1.5 text-center font-medium sm:px-3">Estado</th>
                      <th className="hidden px-3 py-1.5 text-center font-medium lg:table-cell">
                        Fecha pago
                      </th>
                      <th className="hidden px-3 py-1.5 text-left font-medium lg:table-cell">
                        Aprobado por
                      </th>
                      <th className="px-2 py-1.5 sm:px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {g.rows.map((r) => (
                      <DispersionRow
                        key={r.d.id}
                        empresaId={empresaId}
                        dispersion={r.d}
                        ventaCliente={r.ventaCliente}
                        ventaId={r.ventaId}
                        ventaDesarrolloNombre={r.ventaDesarrolloNombre}
                        ventaLoteAcciones={r.ventaLoteAcciones}
                        aprobadoPorNombre={r.aprobadoPorNombre}
                        canModify={canModify}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
