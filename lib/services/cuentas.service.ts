/**
 * Servicio unificado de cuentas.
 * Delega a bmcorp o excel según tipo de empresa.
 */
export {
  getCuentasBmcorp,
  type CuentaPorCobrar,
  type CuentaPorPagarAsesor,
  type CuentasBmcorpData,
} from './cuentas-bmcorp.service'
export {
  getCuentasExcel,
  type CuentaPendienteExcel,
  type CuentasExcel,
} from './cuentas-excel.service'
