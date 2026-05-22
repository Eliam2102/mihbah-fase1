import type { KpisMihbah } from '../dashboard/dashboard.types'
import type {
  SemaforoEstado,
  SemaforoResult,
  SubIndicador,
  SubIndicadorEstado,
} from './semaforo.types'

// Modelo: 4 sub-indicadores según doc A5 (Validacion_Pendiente_SIG_Jade)
// Verde / Amarillo / Rojo por sub-indicador → estado global = peor de los disponibles.

const ESTADOS_UI: Record<SemaforoEstado, Omit<SemaforoResult, 'estado' | 'subIndicadores'>> = {
  SALUDABLE: {
    label: 'Saludable',
    descripcion: 'El flujo de caja cubre holgadamente los compromisos del periodo.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    pulseColor: 'bg-emerald-400',
  },
  PRECAUCION: {
    label: 'Precaución',
    descripcion: 'El flujo neto es negativo pero dentro del rango tolerable. Monitorear.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-400',
    pulseColor: 'bg-amber-300',
  },
  EN_RIESGO: {
    label: 'En riesgo',
    descripcion: 'Uno o más indicadores están fuera del rango aceptable.',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500',
    pulseColor: 'bg-orange-400',
  },
  CRITICO: {
    label: 'Crítico',
    descripcion: 'El flujo neto supera -$100,000 MXN. Acción inmediata requerida.',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-600',
    pulseColor: 'bg-red-500',
  },
}

// Ordena de peor a mejor para calcular estado global.
const SEVERIDAD: Record<SemaforoEstado, number> = {
  CRITICO: 3,
  EN_RIESGO: 2,
  PRECAUCION: 1,
  SALUDABLE: 0,
}

const SUB_ESTADO_SEVERIDAD: Record<SubIndicadorEstado, number> = {
  ROJO: 3,
  AMARILLO: 1,
  VERDE: 0,
  SIN_DATOS: -1,
}

function subToEstado(sub: SubIndicadorEstado): SemaforoEstado {
  if (sub === 'ROJO') return 'CRITICO'
  if (sub === 'AMARILLO') return 'PRECAUCION'
  return 'SALUDABLE'
}

// ─── Sub-indicador 1: Flujo neto ──────────────────────────────────────────────
// Verde  = neto > 0
// Amarillo = -$100,000 ≤ neto ≤ 0
// Rojo   = neto < -$100,000
function calcFlujoNeto(neto: number): SubIndicador {
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(neto)

  if (neto > 0) return { estado: 'VERDE', label: 'Flujo neto', valor: formatted }
  if (neto >= -100_000) return { estado: 'AMARILLO', label: 'Flujo neto', valor: formatted }
  return { estado: 'ROJO', label: 'Flujo neto', valor: formatted }
}

// ─── Sub-indicador 2: Cobranza ────────────────────────────────────────────────
// PENDIENTE — necesita cxcTotal (pagado + pendiente) en KpisMihbah.
// Actualmente getKpisMihbah solo devuelve cxc pendiente, no el total histórico.
// Para activar: agregar cxcTotal y cxcCobrado a KpisMihbah desde cuentas_pendientes
// (sumar monto completo sin filtrar por estado=PENDIENTE).
// Verde = cobranza ≥ 90% | Amarillo = 70–90% | Rojo = < 70%
function calcCobranza(): SubIndicador {
  return { estado: 'SIN_DATOS', label: 'Cobranza', valor: null }
}

// ─── Sub-indicador 3: Avance físico vs financiero ─────────────────────────────
// PENDIENTE — requiere hoja "Avance de obra" en Excel MIHBAH (Sección E, item 1).
// Columnas esperadas: Proyecto | % avance físico | Fecha actualización.
// Sistema calculará % avance financiero = gastado / presupuesto por proyecto.
// Verde = |físico - financiero| ≤ 5% | Amarillo = 5–10% | Rojo = > 10%
function calcAvanceFisico(): SubIndicador {
  return { estado: 'SIN_DATOS', label: 'Avance físico vs financiero', valor: null }
}

// ─── Sub-indicador 4: Pipeline ────────────────────────────────────────────────
// PENDIENTE — requiere hoja "Pipeline" en Excel MIHBAH (Sección E, item 1).
// Columnas esperadas: Proyecto | Monto estimado MXN | Fecha estimada inicio.
// Definición de umbrales pendiente de respuesta A5 del cliente.
function calcPipeline(): SubIndicador {
  return { estado: 'SIN_DATOS', label: 'Pipeline', valor: null }
}

// ─── Cálculo global ───────────────────────────────────────────────────────────

export function calcularSemaforo(kpis: KpisMihbah): SemaforoResult {
  const subIndicadores = {
    flujoNeto: calcFlujoNeto(kpis.neto),
    cobranza: calcCobranza(),
    avanceFisico: calcAvanceFisico(),
    pipeline: calcPipeline(),
  }

  // Estado global = peor sub-indicador con datos disponibles.
  const conDatos = Object.values(subIndicadores).filter((s) => s.estado !== 'SIN_DATOS')
  const peor =
    conDatos.length === 0
      ? 'SALUDABLE'
      : conDatos.reduce<SemaforoEstado>((worst, s) => {
          const candidate = subToEstado(s.estado as SubIndicadorEstado)
          return SEVERIDAD[candidate] > SEVERIDAD[worst] ? candidate : worst
        }, 'SALUDABLE')

  return {
    estado: peor,
    ...ESTADOS_UI[peor],
    subIndicadores,
  }
}

export const SEMAFORO_ORDER: SemaforoEstado[] = ['SALUDABLE', 'PRECAUCION', 'EN_RIESGO', 'CRITICO']
