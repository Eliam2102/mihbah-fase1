import { requireUser } from '@/lib/auth/helpers'
import { getEmpresaById } from '@/lib/services/empresas'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, FolderOpen, Receipt, BarChart3, ChevronRight, Download } from 'lucide-react'

interface ReportCard {
  tipo: string
  titulo: string
  descripcion: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
}

function getReports(tipo: string): ReportCard[] {
  if (tipo === 'COMERCIAL') {
    return [
      {
        tipo: 'ventas',
        titulo: 'Reporte de Ventas',
        descripcion:
          'Listado completo de ventas sincronizadas desde Monday.com con estado del pipeline.',
        icon: TrendingUp,
        available: true,
      },
      {
        tipo: 'comisiones',
        titulo: 'Reporte de Comisiones',
        descripcion:
          'Comisiones por asesor y reparto por alianza. Conciliación de pagos pendientes.',
        icon: Receipt,
        available: true,
      },
      {
        tipo: 'flujo',
        titulo: 'Flujo Semanal',
        descripcion: 'Histórico de ingresos y egresos agrupado por semana.',
        icon: BarChart3,
        available: true,
      },
    ]
  }
  return [
    {
      tipo: 'flujo',
      titulo: 'Flujo de Caja',
      descripcion: 'Reporte mensual de ingresos y egresos del año. Exportable a PDF.',
      icon: BarChart3,
      available: true,
    },
    {
      tipo: 'proyectos',
      titulo: 'Reporte de Proyectos',
      descripcion: 'Resumen financiero por proyecto: ingresos, egresos y avance.',
      icon: FolderOpen,
      available: true,
    },
    {
      tipo: 'cuentas',
      titulo: 'Cuentas Pendientes',
      descripcion: 'CXC y CXP con antigüedad de saldos y estado de cobro/pago.',
      icon: Receipt,
      available: true,
    },
    {
      tipo: 'movimientos',
      titulo: 'Movimientos Detallados',
      descripcion: 'Listado completo de movimientos importados desde Excel.',
      icon: TrendingUp,
      available: true,
    },
  ]
}

export default async function ReportesPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  const tenantId = user.tenantId
  if (!tenantId) throw new Error('Tenant ID is required')

  const empresa = await getEmpresaById(empresaId, tenantId)
  if (!empresa) notFound()

  const reports = getReports(empresa.tipo)
  const anio = new Date().getFullYear()

  return (
    <section className="p-6">
      <div className="mb-6">
        <h1 className="text-foreground text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {empresa.name} · Selecciona un reporte para ver el detalle o exportarlo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon
          return (
            <div
              key={r.tipo}
              className="border-border bg-card hover:border-primary/50 group flex flex-col rounded-xl border shadow-sm transition-colors"
            >
              <div className="flex-1 p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                    <Icon className="text-primary h-5 w-5" />
                  </div>
                  {r.available && empresa.tipo !== 'COMERCIAL' && r.tipo === 'flujo' && (
                    <a
                      href={`/empresa/${empresaId}/reportes/${r.tipo}/pdf?anio=${anio}`}
                      download
                      className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs font-medium transition-colors"
                      title="Descargar PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </a>
                  )}
                </div>
                <h3 className="text-foreground mb-1 font-semibold">{r.titulo}</h3>
                <p className="text-muted-foreground text-sm">{r.descripcion}</p>
              </div>
              <div className="border-border border-t px-5 py-3">
                <Link
                  href={`/empresa/${empresaId}/reportes/${r.tipo}`}
                  className="text-primary group-hover:text-primary/80 flex items-center gap-1.5 text-sm font-medium transition-colors"
                >
                  Ver reporte <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
