/**
 * Servicio unificado de reportes.
 * Delega a bmcorp o excel según tipo de empresa.
 */
export { getVentasReporteBmcorp } from './reportes-bmcorp.service'
export { getMovimientosReporte, type MovimientoReporte } from './reportes-excel.service'
export { getFlujoMensual, getFlujoTrimestral, getFlujoAnual } from './flujo.service'
export { getProyectosExcel } from './proyectos-excel.service'
export { getProyectosBmcorp } from './proyectos-bmcorp.service'
export { getCuentasExcel } from './cuentas-excel.service'
export { getCuentasBmcorp } from './cuentas-bmcorp.service'
