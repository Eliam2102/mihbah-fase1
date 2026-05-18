import { getMovimientosMes } from '@/lib/services/flujo.service'
import { X } from 'lucide-react'
import Link from 'next/link'
import { formatMXN } from '@/lib/utils'

interface Props {
  empresaId: string
  tenantId: string
  anio: number
  mes: number
  closeHref: string
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const TIPO_COLOR: Record<string, string> = {
  INGRESO: 'text-emerald-600 dark:text-emerald-400',
  EGRESO: 'text-red-600 dark:text-red-400',
  SALIDA: 'text-red-600 dark:text-red-400',
  PRESTAMO: 'text-amber-600 dark:text-amber-400',
  INTERNO: 'text-muted-foreground',
}

export async function MovimientosMesPanel({ empresaId, tenantId, anio, mes, closeHref }: Props) {
  const movimientos = await getMovimientosMes(empresaId, tenantId, anio, mes)
  const mesLabel = MESES[mes - 1] ?? `Mes ${mes}`
  const totalIngresos = movimientos
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((s, m) => s + m.monto, 0)
  const totalEgresos = movimientos
    .filter((m) => ['EGRESO', 'SALIDA', 'PRESTAMO'].includes(m.tipo))
    .reduce((s, m) => s + m.monto, 0)

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-xl">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 className="text-foreground font-semibold">
            {mesLabel} {anio} — {movimientos.length} movimientos
          </h3>
          <p className="text-muted-foreground text-xs">
            Ingresos:{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatMXN(totalIngresos)}
            </span>
            {' · '}
            Egresos:{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">
              {formatMXN(totalEgresos)}
            </span>
          </p>
        </div>
        <Link
          href={closeHref}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </Link>
      </div>

      {movimientos.length === 0 ? (
        <p className="text-muted-foreground p-6 text-sm">
          Sin movimientos registrados en este mes.
        </p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-border bg-muted/80 border-b backdrop-blur-sm">
                {[
                  { label: 'Fecha', align: 'text-left' },
                  { label: 'Tipo', align: 'text-left' },
                  { label: 'Concepto / Nombre', align: 'text-left' },
                  { label: 'Monto', align: 'text-right' },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`text-muted-foreground px-4 py-2 ${h.align} text-xs font-semibold tracking-wider whitespace-nowrap uppercase`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} className="border-border hover:bg-muted/20 border-b last:border-0">
                  <td className="text-muted-foreground px-4 py-2.5 whitespace-nowrap tabular-nums">
                    {m.fecha}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-bold uppercase ${TIPO_COLOR[m.tipo] ?? 'text-muted-foreground'}`}
                    >
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {m.concepto && <p className="text-foreground">{m.concepto}</p>}
                    {m.nombre && <p className="text-muted-foreground text-xs">{m.nombre}</p>}
                    {!m.concepto && !m.nombre && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums ${TIPO_COLOR[m.tipo] ?? 'text-foreground'}`}
                  >
                    {formatMXN(m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
