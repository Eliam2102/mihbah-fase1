'use client'

import { useState } from 'react'

const CONCEPTO_LABELS: Record<string, string> = {
  OP_BMCORP: 'Op. BM Corp',
  OP_YESYUCAN: 'Op. Yesyucan',
  ASESOR: 'Asesor',
  LIDER_SALDO: 'Afiliación',
  SOCIO_FIJO_JORGE: 'Fijo Jorge',
  SOCIO_FIJO_KASS: 'Fijo Kass',
  SOCIO_BOLSA_JORGE: 'Bolsa Jorge',
  SOCIO_BOLSA_KASS: 'Bolsa Kass',
  SOCIO_BOLSA_DIANA: 'Bolsa Diana',
}

const ESTADO_STYLES: Record<string, string> = {
  DIFERIDO: 'bg-blue-100 text-blue-800',
  AUTORIZADA: 'bg-emerald-100 text-emerald-800',
  PARCIAL: 'bg-amber-100 text-amber-800',
  PAGADO: 'bg-jade-100 text-jade-800',
}

export interface LineaComision {
  id: string
  tipoBeneficiario: string
  beneficiarioNombre: string | null
  montoTotal: string
  pct: string
  estado: string
}

interface Props {
  comisionBruta: number
  porcentajeTotalAplicado: string
  lines: LineaComision[]
}

export function ComisionDesglose({ comisionBruta, porcentajeTotalAplicado, lines }: Props) {
  const [vistaDetalle, setVistaDetalle] = useState(false)

  const fmt = (n: string | number) =>
    Number(n).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="border-t">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Desglose de comisión
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${!vistaDetalle ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
          >
            General
          </span>
          <button
            type="button"
            onClick={() => setVistaDetalle((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${vistaDetalle ? 'bg-primary' : 'bg-muted'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${vistaDetalle ? 'translate-x-4' : 'translate-x-1'}`}
            />
          </button>
          <span
            className={`text-xs ${vistaDetalle ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
          >
            Detallado
          </span>
        </div>
      </div>

      {!vistaDetalle ? (
        <div className="flex items-center gap-2 border-b px-4 pb-4 text-sm">
          <span className="text-muted-foreground">Comisión total</span>
          <span className="text-foreground font-semibold tabular-nums">{fmt(comisionBruta)}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">% aplicado</span>
          <span className="text-foreground font-semibold tabular-nums">
            {porcentajeTotalAplicado}%
          </span>
        </div>
      ) : (
        lines.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Concepto</th>
                <th className="px-4 py-2 text-left font-medium">Beneficiario</th>
                <th className="px-4 py-2 text-right font-medium">% Matriz</th>
                <th className="px-4 py-2 text-right font-medium tabular-nums">Monto</th>
                <th className="px-4 py-2 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((d) => (
                <tr key={d.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">
                    {CONCEPTO_LABELS[d.tipoBeneficiario] ?? d.tipoBeneficiario}
                  </td>
                  <td className="text-muted-foreground px-4 py-2">{d.beneficiarioNombre ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{d.pct}%</td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {fmt(d.montoTotal)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_STYLES[d.estado] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {d.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-semibold">
                <td className="px-4 py-2" colSpan={2}>
                  Total comisión
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{porcentajeTotalAplicado}%</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmt(comisionBruta)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )
      )}
    </div>
  )
}
