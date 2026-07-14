'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, TrendingUp, Users, ChevronDown, ChevronRight, Download } from 'lucide-react'
import type { VentaLiderPortal, PerfilPortal } from '@/lib/services/comisiones/portal.service'
import type { Asesor } from '@/lib/services/comisiones/alianzas.service'

const ESTADO_COLORS: Record<string, string> = {
  DIFERIDO: 'bg-slate-100 text-slate-500',
  AUTORIZADA: 'bg-blue-100 text-blue-700',
  PARCIAL: 'bg-amber-100 text-amber-700',
  PAGADO: 'bg-emerald-100 text-emerald-700',
}

const TIPO_LABELS: Record<string, string> = {
  LIDER_SALDO: 'Líder (Afiliación)',
  ASESOR: 'Asesor (directo)',
  SOCIO_BOLSA_JORGE: 'Socio bolsa Jorge',
  SOCIO_BOLSA_KASS: 'Socio bolsa Kass',
  SOCIO_BOLSA_DIANA: 'Socio bolsa Diana',
  SOCIO_FIJO_JORGE: 'Socio fijo Jorge',
  SOCIO_FIJO_KASS: 'Socio fijo Kass',
}

export function DashboardAdministrativo({
  perfil,
  ventas,
  asesores,
  userName,
}: {
  perfil: PerfilPortal
  ventas: VentaLiderPortal[]
  asesores: Asesor[]
  userName: string
}) {
  const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

  const [busqueda, setBusqueda] = useState('')
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpandidas((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const totalComision = ventas.reduce((s, v) => s + v.comisionTotal, 0)
  const totalPagado = ventas.reduce(
    (s, v) => s + v.dispersiones.reduce((sd, d) => sd + d.montoPagado, 0),
    0,
  )

  const ventasFiltradas = busqueda
    ? ventas.filter(
        (v) =>
          v.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
          (v.loteAcciones ?? '').toLowerCase().includes(busqueda.toLowerCase()),
      )
    : ventas

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Hola, {userName}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {perfil.alianzaNombre ?? 'Mi afiliación'} · Administrativo · {ventas.length}{' '}
          {ventas.length === 1 ? 'venta' : 'ventas'} con comisión
        </p>
      </div>

      {/* Descarga */}
      <div className="flex justify-end">
        <a
          href="/portal/reportes"
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
        >
          <Download className="h-3.5 w-3.5" />
          Descargar reporte CSV
        </a>
      </div>

      {/* KPIs — solo consulta, sin acciones */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            <TrendingUp className="h-4 w-4" /> Comisión total
          </div>
          <p className="text-foreground text-xl font-bold tabular-nums">{fmt(totalComision)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            <FileText className="h-4 w-4" /> Ya pagado
          </div>
          <p className="text-xl font-bold text-emerald-600 tabular-nums">{fmt(totalPagado)}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
            <Users className="h-4 w-4" /> Asesores
          </div>
          <p className="text-foreground text-xl font-bold tabular-nums">{asesores.length}</p>
        </div>
      </div>

      {/* Equipo */}
      {asesores.length > 0 && (
        <div className="bg-card overflow-hidden rounded-xl border">
          <div className="border-b px-4 py-3">
            <h2 className="text-foreground text-sm font-semibold">
              Equipo de la afiliación ({asesores.length} asesores)
            </h2>
          </div>
          <div className="divide-y">
            {asesores.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-foreground font-medium">{a.nombre}</span>
                <span className="text-muted-foreground text-xs">
                  {a.email ?? a.telefono ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventas con comisiones — solo lectura */}
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <h2 className="text-foreground flex-1 text-sm font-semibold">
            Estado de comisiones por venta
          </h2>
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-muted/40 rounded-md py-1.5 pr-3 pl-3 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none sm:w-40"
          />
        </div>

        {ventasFiltradas.length === 0 ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">
            Sin ventas con comisiones.
          </p>
        ) : (
          <div className="divide-y">
            {ventasFiltradas.map((v) => {
              const expanded = expandidas.has(v.ventaId)
              const montoPagadoVenta = v.dispersiones.reduce((s, d) => s + d.montoPagado, 0)
              const pct = v.comisionTotal > 0 ? (montoPagadoVenta / v.comisionTotal) * 100 : 0

              return (
                <div key={v.ventaId}>
                  <button
                    type="button"
                    onClick={() => toggle(v.ventaId)}
                    className="hover:bg-muted/20 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                  >
                    <div className="text-muted-foreground shrink-0">
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground text-sm font-semibold">{v.cliente}</span>
                        {v.loteAcciones && (
                          <span className="text-muted-foreground text-xs">
                            Lote {v.loteAcciones}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {pct.toFixed(0)}% pagado
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-foreground text-sm font-bold tabular-nums">
                        {fmt(v.comisionTotal)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {fmt(montoPagadoVenta)} pagado
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="bg-muted/10 border-t px-4 pt-2 pb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b text-left">
                            <th className="pb-1.5 font-medium">Beneficiario</th>
                            <th className="pb-1.5 font-medium">Tipo</th>
                            <th className="pb-1.5 text-right font-medium">Total</th>
                            <th className="pb-1.5 text-right font-medium">Pagado</th>
                            <th className="pb-1.5 text-center font-medium">Estado</th>
                            {/* Administrativo puede ver pero NO descargar comprobante — acceso restringido */}
                          </tr>
                        </thead>
                        <tbody className="divide-muted/30 divide-y">
                          {v.dispersiones.map((d) => (
                            <tr key={d.id} className="hover:bg-muted/10">
                              <td className="py-2 font-medium">{d.beneficiarioNombre}</td>
                              <td className="text-muted-foreground py-2">
                                {TIPO_LABELS[d.tipoBeneficiario] ?? d.tipoBeneficiario}
                              </td>
                              <td className="py-2 text-right tabular-nums">{fmt(d.montoTotal)}</td>
                              <td className="text-success py-2 text-right tabular-nums">
                                {fmt(d.montoPagado)}
                              </td>
                              <td className="py-2 text-center">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_COLORS[d.estado] ?? 'bg-muted'}`}
                                >
                                  {d.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nota de acceso restringido */}
      <p className="text-muted-foreground text-center text-xs">
        Vista de consulta — no puede modificar comisiones, aprobar pagos ni ver otras afiliaciones.
        Para descargar comprobantes o registrar aclaraciones, contacta al líder o a administración.
      </p>
    </div>
  )
}
