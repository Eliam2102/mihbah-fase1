// 💡 Next.js: Este es un SERVER COMPONENT (sin 'use client')
// Puede hacer fetch a la DB directamente — el resultado llega pre-renderizado al browser

import {
  getKpisMihbah,
  getFlujoMensual,
  getAvancePorProyecto,
} from '@/lib/services/dashboard.service'
import { calcularSemaforo } from '@/lib/services/semaforo.service'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Semaforo } from '@/components/dashboard/semaforo'
import { FlowChart } from '@/components/dashboard/flow-chart'
import { ProyectosCard } from '@/components/dashboard/proyectos-card'

interface Props {
  empresaId: string
  tenantId: string
  anio: number
  mes?: number
}

// 💡 Promise.all: carga los 3 queries EN PARALELO — más rápido que uno por uno
export async function DashboardMihbah({ empresaId, tenantId, anio, mes }: Props) {
  const [kpis, flujo, proyectos] = await Promise.all([
    getKpisMihbah(empresaId, tenantId, mes ? { anio, mes } : { anio }),
    getFlujoMensual(empresaId, tenantId, anio),
    getAvancePorProyecto(empresaId, tenantId, anio),
  ])

  const semaforo = calcularSemaforo(kpis)

  return (
    <div className="space-y-6">
      {/* Row 1: 4 KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Ingresos" value={kpis.ingresos} variant="success" />
        <KpiCard
          label="Egresos"
          value={kpis.egresos}
          variant={kpis.egresos > kpis.ingresos ? 'critical' : 'default'}
        />
        <KpiCard label="Neto" value={kpis.neto} variant={kpis.neto >= 0 ? 'success' : 'critical'} />
        <KpiCard label="CxC" value={kpis.cxc} variant="warning" />
      </div>

      {/* Row 2: CxP + semáforo + gráfica */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <KpiCard
            label="Cuentas por pagar"
            value={kpis.cxp}
            variant={kpis.cxp > kpis.ingresos * 0.5 ? 'critical' : 'warning'}
          />
          <Semaforo result={semaforo} />
        </div>
        <div className="lg:col-span-2">
          <FlowChart data={flujo} />
        </div>
      </div>

      {/* Row 3: Proyectos */}
      <ProyectosCard proyectos={proyectos} />
    </div>
  )
}
