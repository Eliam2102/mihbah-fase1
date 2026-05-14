/**
 * lib/monday/mappers.ts
 *
 * Converts raw Monday.com items → DB-ready shapes.
 * Column titles are matched case-insensitively to handle minor variations.
 *
 * Monday "Seguimiento General" columns we care about:
 *   Nombre       → item.name (title)
 *   Afiliado     → afiliado (alianza)
 *   Desarrollo   → desarrollo (proyecto)
 *   Monto total  → monto
 *   Financiamiento → financiamiento
 *   Asesor       → asesor
 *   Estado de venta → estadoVenta
 *   Fecha apertura → fechaApertura
 *   Fecha cierre → fechaCierre
 *   Enganche     → enganche
 */

import {
  type MondayItem,
  getColumnByTitle,
  getColumnById,
  parseMondayDate,
  parseMondayNumber,
} from './client'

/**
 * IDs reales de columnas del board "Seguimiento General" (3017199126).
 * Si cliente cambia estructura del board, actualizar esta tabla.
 * Match por ID es más robusto que match por título (varias columnas
 * comparten título — ej. dos "ENGANCHE": una formula, una status).
 */
const COLS = {
  // Identificación
  loteAcciones: 'n_meros8',
  // Relaciones
  afiliado: 'n_mero_de_lote', // status — nombre afiliado/alianza
  desarrollo: 'desarrollo', // dropdown
  desarrolladora: 'desarrolladora', // status
  asesorTexto: 'texto2', // text — asesor de la alianza
  // Montos
  montoTotal: 'n_meros', // numbers
  montoPorAccion: 'numeric_mkv1tbc3',
  porcentajeEnganche: 'n_meros4', // numbers — % no monto
  comisionBmcorp: 'f_rmula8', // formula "Monto 15%"
  // Status
  estadoVenta: 'estado_1',
  financiamiento: 'estado_14',
  paqueteAccion: 'color_mkv1cg83',
  operativoApertura: 'color', // OPERATIVO AP
  operativoCierre: 'color2',
  // Fechas
  fechaApertura: 'date',
  fechaCierre: 'fecha',
  fechaNacimiento: 'fecha7',
  // Personales
  telefono: 'tel_fono',
  correo: 'correo_electr_nico',
  nacionalidad: 'pa_s5',
  residencia: 'pa_s0',
  sexo: 'estado10',
} as const

/**
 * Columnas REQUERIDAS al cliente para homologar pagos BM CORP.
 * Hoy NO existen en el board "Seguimiento General" — el mapper hace match
 * por título (case-insensitive) hasta que cliente las agregue.
 * Cuando se agreguen, registrar IDs aquí para match exacto.
 *
 * Ver: docs/MONDAY_COLUMNAS_REQUERIDAS.md
 */
const COLS_PAGOS_TITLES = {
  repartoEstado: 'reparto pagado', // status: PENDIENTE | PARCIAL | PAGADO
  repartoFecha: 'fecha reparto', // date
  repartoMonto: 'monto reparto', // numbers
  comisionAsesorEstado: 'comisión asesor pagada', // status
  comisionAsesorFecha: 'fecha comisión asesor', // date
  comisionAsesorMonto: 'monto comisión asesor', // numbers
} as const

// ─── Tipos intermedios ────────────────────────────────────────────────────────

export interface MappedVenta {
  mondayItemId: string
  cliente: string
  afiliadoNombre: string | null
  desarrolloNombre: string | null
  desarrolladoraNombre: string | null
  asesor: string | null
  monto: string
  financiamiento: string | null
  enganche: string
  // Must match estadoVentaEnum in schema
  estadoVenta:
    | 'EN_PROCESO'
    | 'APROBADO_JURIDICO'
    | 'FINALIZADA'
    | 'CANCELADA'
    | 'APROBADO_VENTAS'
    | 'RECHAZADO'
    | 'ESPERANDO_AUTORIZACION'
    | 'LIBERADO'
    | 'FINALIZADO_Y_LIQUIDADO'
  fechaApertura: string | null
  fechaCierre: string | null
  fecha: string

  // New fields
  loteAcciones: string | null
  paqueteAccion: string | null
  pipelineGroup: string | null
  operativoApertura: string | null
  operativoCierre: string | null
  comisionBmcorp: string
  telefono: string | null
  correo: string | null
  nacionalidad: string | null
  residencia: string | null
  sexo: string | null
  fechaNacimiento: string | null

  // Pagos derivados — extraídos a `repartos_bmcorp` cuando estado === PAGADO o PARCIAL
  pagos: MappedPago[]
}

/**
 * Pago derivado de una venta (reparto a alianza o comisión a asesor).
 * Cliente registra estos datos en columnas Monday (ver doc).
 * Si las columnas no existen o vienen vacías, no se genera pago.
 */
export interface MappedPago {
  mondayItemId: string // = `${ventaMondayId}:${tipo}` para idempotencia
  tipo: 'REPARTO_ALIANZA' | 'COMISION_ASESOR'
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO'
  beneficiario: string // nombre alianza (REPARTO) o asesor (COMISION)
  monto: string
  fecha: string // fecha pago si PAGADO; fechaApertura como fallback
}

function mapEstadoPago(text: string | null | undefined): MappedPago['estado'] {
  const normalized = (text ?? '').toLowerCase().trim()
  if (normalized.includes('pagad')) return 'PAGADO'
  if (normalized.includes('parcial')) return 'PARCIAL'
  return 'PENDIENTE'
}

// ─── Estado mapping ───────────────────────────────────────────────────────────

const ESTADO_MAP: Record<string, MappedVenta['estadoVenta']> = {
  'en proceso': 'EN_PROCESO',
  en_proceso: 'EN_PROCESO',
  vendido: 'APROBADO_JURIDICO', // Monday "Vendido" → juridico phase
  'aprobado juridico': 'APROBADO_JURIDICO',
  aprobado: 'APROBADO_JURIDICO',
  finalizada: 'FINALIZADA',
  finalizado: 'FINALIZADA',
  cancelado: 'CANCELADA',
  cancelada: 'CANCELADA',
  'en escrituración': 'FINALIZADA',
  'en escrituracion': 'FINALIZADA',
  escrituración: 'FINALIZADA',
  escrituracion: 'FINALIZADA',
  'aprobado ventas': 'APROBADO_VENTAS',
  rechazado: 'RECHAZADO',
  'esperando autorización': 'ESPERANDO_AUTORIZACION',
  'esperando autorizacion': 'ESPERANDO_AUTORIZACION',
  liberado: 'LIBERADO',
  'finalizado y liquidado': 'FINALIZADO_Y_LIQUIDADO',
}

function mapEstado(text: string | null | undefined): MappedVenta['estadoVenta'] {
  if (!text) return 'EN_PROCESO'
  return ESTADO_MAP[text.toLowerCase().trim()] ?? 'EN_PROCESO'
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * Converts a raw Monday item → MappedVenta (DB-ready, no IDs yet).
 * Lookup por ID exacto (ver constante COLS arriba).
 */
export function mapItemToVenta(item: MondayItem): MappedVenta {
  const byId = (id: string) => getColumnById(item, id)
  // Fallback por título cuando el board del cliente difiere
  const byTitle = (t: string) => getColumnByTitle(item, t)

  const montoTotal = parseMondayNumber(byId(COLS.montoTotal)?.text)
  const porcentajeEngancheText = byId(COLS.porcentajeEnganche)?.text ?? null
  const porcentajeEnganche = porcentajeEngancheText
    ? Number(parseMondayNumber(porcentajeEngancheText))
    : 0
  const montoTotalNum = Number(montoTotal)

  // ENGANCHE en Monday es formula `MULTIPLY({n_meros4},{n_meros})` pero la API
  // no calcula formulas — text viene vacío. Calculamos manualmente:
  // Cliente NO divide entre 100 (formula original es porcentaje × monto).
  // Pero "Porcentaje de enganche" en samples viene como 16, 10, 3.294 → es %.
  // Interpretación correcta: enganche $ = monto × (porcentaje / 100).
  const engancheCalculado =
    montoTotalNum > 0 && porcentajeEnganche > 0
      ? ((montoTotalNum * porcentajeEnganche) / 100).toFixed(2)
      : '0'

  const fechaAperturaRaw = parseMondayDate(byId(COLS.fechaApertura)?.value)
  const fechaCierreRaw = parseMondayDate(byId(COLS.fechaCierre)?.value)
  const today = new Date().toISOString().slice(0, 10)
  const fecha = fechaAperturaRaw ?? fechaCierreRaw ?? today

  return {
    mondayItemId: item.id,
    cliente: item.name || 'Sin nombre',
    afiliadoNombre: byId(COLS.afiliado)?.text?.trim() || null,
    desarrolloNombre: byId(COLS.desarrollo)?.text?.trim() || null,
    desarrolladoraNombre: byId(COLS.desarrolladora)?.text?.trim() || null,
    asesor: byId(COLS.asesorTexto)?.text?.trim() || byTitle('asesor')?.text?.trim() || null,
    monto: montoTotal,
    financiamiento: byId(COLS.financiamiento)?.text?.trim() || null,
    enganche: engancheCalculado,
    estadoVenta: mapEstado(byId(COLS.estadoVenta)?.text),
    fechaApertura: fechaAperturaRaw,
    fechaCierre: fechaCierreRaw,
    fecha,

    loteAcciones: byId(COLS.loteAcciones)?.text?.trim() || null,
    paqueteAccion: byId(COLS.paqueteAccion)?.text?.trim() || null,
    pipelineGroup: item.group?.title || null,
    operativoApertura: byId(COLS.operativoApertura)?.text?.trim() || null,
    operativoCierre: byId(COLS.operativoCierre)?.text?.trim() || null,
    // BM Corp recibe 2% operativo del precio de venta (1% BM Corp + 1% YesYucan).
    // Si Monday ya tiene el valor calculado lo usamos; fallback = precio × 2%.
    comisionBmcorp:
      parseMondayNumber(byId(COLS.comisionBmcorp)?.text) !== '0'
        ? parseMondayNumber(byId(COLS.comisionBmcorp)?.text)
        : montoTotalNum > 0
          ? (montoTotalNum * 0.02).toFixed(2)
          : '0',

    telefono: byId(COLS.telefono)?.text?.trim() || null,
    correo: byId(COLS.correo)?.text?.trim() || null,
    nacionalidad: byId(COLS.nacionalidad)?.text?.trim() || null,
    residencia: byId(COLS.residencia)?.text?.trim() || null,
    sexo: byId(COLS.sexo)?.text?.trim() || null,
    fechaNacimiento: parseMondayDate(byId(COLS.fechaNacimiento)?.value),

    pagos: extractPagos(item, byTitle, fecha),
  }
}

/**
 * Extrae pagos (reparto a alianza + comisión a asesor) de las columnas
 * Monday que el cliente debe agregar. Si las columnas no existen o vienen
 * vacías, retorna []. Match por título; cuando se agreguen al board, mover
 * IDs a constante COLS_PAGOS_IDS para match exacto.
 */
function extractPagos(
  item: MondayItem,
  byTitle: (t: string) => ReturnType<typeof getColumnByTitle>,
  fechaFallback: string,
): MappedPago[] {
  const pagos: MappedPago[] = []

  // Reparto a alianza
  const repEstado = byTitle(COLS_PAGOS_TITLES.repartoEstado)?.text
  const repMontoText = byTitle(COLS_PAGOS_TITLES.repartoMonto)?.text
  const repFechaRaw = parseMondayDate(byTitle(COLS_PAGOS_TITLES.repartoFecha)?.value)
  if (repMontoText) {
    const monto = parseMondayNumber(repMontoText)
    if (Number(monto) > 0) {
      const beneficiario = byTitle('afiliado')?.text?.trim() || 'Sin asignar'
      pagos.push({
        mondayItemId: `${item.id}:REPARTO_ALIANZA`,
        tipo: 'REPARTO_ALIANZA',
        estado: mapEstadoPago(repEstado),
        beneficiario,
        monto,
        fecha: repFechaRaw ?? fechaFallback,
      })
    }
  }

  // Comisión a asesor
  const comEstado = byTitle(COLS_PAGOS_TITLES.comisionAsesorEstado)?.text
  const comMontoText = byTitle(COLS_PAGOS_TITLES.comisionAsesorMonto)?.text
  const comFechaRaw = parseMondayDate(byTitle(COLS_PAGOS_TITLES.comisionAsesorFecha)?.value)
  if (comMontoText) {
    const monto = parseMondayNumber(comMontoText)
    if (Number(monto) > 0) {
      const beneficiario =
        byTitle('asesor')?.text?.trim() ||
        getColumnByTitle(item, 'asesor')?.text?.trim() ||
        'Sin asignar'
      pagos.push({
        mondayItemId: `${item.id}:COMISION_ASESOR`,
        tipo: 'COMISION_ASESOR',
        estado: mapEstadoPago(comEstado),
        beneficiario,
        monto,
        fecha: comFechaRaw ?? fechaFallback,
      })
    }
  }

  return pagos
}

/**
 * Normalizes an afiliado/desarrollo name for deduplication.
 * Trims whitespace, removes double spaces, title-cases.
 */
export function normalizeNombre(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}
