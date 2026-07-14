/**
 * Servicio unificado de proyectos.
 * Delega a bmcorp o excel según tipo de empresa.
 */
export {
  getProyectosBmcorp,
  getDesarrolloDetalle,
  type ProyectoStats,
  type VentaDetalle,
  type DesarrolloDetalle,
} from './proyectos-bmcorp'
export {
  getProyectosExcel,
  getProyectoDetalle,
  type ProyectoExcel,
  type ProyectoDetalle,
} from './proyectos-excel.service'
