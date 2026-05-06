import Link from 'next/link'
import type { EmpresaResumen } from '@/lib/services/dashboard-general.service'
import { ArrowRight, Building2, Banknote, ShoppingBag, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  empresa: EmpresaResumen
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })
}

const TIPO_META = {
  CONSTRUCTORA: {
    icon: Building2,
    color: 'border-jade-200 dark:border-jade-800 bg-jade-50/50 dark:bg-jade-900/10',
    accent: 'text-jade-700 dark:text-jade-300',
  },
  CAPITAL: {
    icon: Banknote,
    color: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10',
    accent: 'text-blue-700 dark:text-blue-300',
  },
  COMERCIAL: {
    icon: ShoppingBag,
    color: 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10',
    accent: 'text-purple-700 dark:text-purple-300',
  },
} as const

export function EmpresaResumenCard({ empresa }: Props) {
  const meta = TIPO_META[empresa.tipo]
  const Icon = meta.icon

  return (
    <Link
      href={`/empresa/${empresa.empresaId}/dashboard`}
      className={cn('group block rounded-xl border p-5 transition-all hover:shadow-md', meta.color)}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', meta.accent)} />
          <div>
            <h3 className="text-foreground text-sm font-bold">{empresa.nombre}</h3>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              {empresa.tipo}
            </p>
          </div>
        </div>
        <ArrowRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Ingresos
          </p>
          <p className="text-lg font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
            {formatMXN(empresa.ingresos)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Egresos
          </p>
          <p className="text-lg font-bold text-red-600 tabular-nums dark:text-red-400">
            {formatMXN(empresa.egresos)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Neto
          </p>
          <p
            className={cn(
              'text-lg font-bold tabular-nums',
              empresa.neto >= 0 ? 'text-foreground' : 'text-red-600',
            )}
          >
            {formatMXN(empresa.neto)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            CXC
          </p>
          <p className="text-lg font-bold text-amber-700 tabular-nums dark:text-amber-400">
            {formatMXN(empresa.cxc)}
          </p>
        </div>
      </div>

      {empresa.parcial && (
        <div className="border-border mt-3 flex items-start gap-1.5 border-t pt-2 text-[11px]">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
          <p className="text-muted-foreground">
            Datos parciales — pendiente columnas Monday del cliente.
          </p>
        </div>
      )}
    </Link>
  )
}
