// Definición canónica de módulos por tipo de empresa.
// Usada tanto en el sidebar como en la matriz de permisos.

export type ModuloKey =
  | 'dashboard'
  | 'flujo'
  | 'proyectos'
  | 'cuentas'
  | 'reportes'
  | 'cargas'
  | 'monday'
  | 'comisiones'
  | 'ventas'

export interface ModuloMeta {
  key: ModuloKey
  label: string
  descripcion: string
  tieneEdicion: boolean
  labelEdicion: string
}

export const MODULOS_META: Record<ModuloKey, ModuloMeta> = {
  dashboard: {
    key: 'dashboard',
    label: 'Dashboard',
    descripcion: 'KPIs y resumen financiero',
    tieneEdicion: false,
    labelEdicion: '',
  },
  flujo: {
    key: 'flujo',
    label: 'Flujo de caja',
    descripcion: 'Ingresos y egresos por período',
    tieneEdicion: false,
    labelEdicion: '',
  },
  proyectos: {
    key: 'proyectos',
    label: 'Proyectos',
    descripcion: 'Avance y presupuesto por proyecto',
    tieneEdicion: false,
    labelEdicion: '',
  },
  cuentas: {
    key: 'cuentas',
    label: 'Cuentas (CXC/CXP)',
    descripcion: 'Cuentas por cobrar y por pagar',
    tieneEdicion: false,
    labelEdicion: '',
  },
  reportes: {
    key: 'reportes',
    label: 'Reportes',
    descripcion: 'Exportación PDF y resúmenes',
    tieneEdicion: false,
    labelEdicion: '',
  },
  cargas: {
    key: 'cargas',
    label: 'Cargas Excel',
    descripcion: 'Importación de movimientos desde Excel',
    tieneEdicion: true,
    labelEdicion: 'Puede cargar',
  },
  monday: {
    key: 'monday',
    label: 'Sincronización Monday',
    descripcion: 'Sincronizar ventas desde Monday.com',
    tieneEdicion: true,
    labelEdicion: 'Puede sincronizar',
  },
  comisiones: {
    key: 'comisiones',
    label: 'Comisiones',
    descripcion: 'Alianzas, esquemas, dispersiones y comprobantes',
    tieneEdicion: true,
    labelEdicion: 'Puede aprobar pagos',
  },
  ventas: {
    key: 'ventas',
    label: 'Ventas',
    descripcion: 'Pipeline de ventas BM CORP (Monday + edición en sistema)',
    tieneEdicion: true,
    labelEdicion: 'Puede editar ventas',
  },
}

// Módulos disponibles por tipo de empresa
export type TipoEmpresaKey = 'CONSTRUCTORA' | 'CAPITAL' | 'COMERCIAL' | 'DEFAULT'

export const MODULOS_POR_TIPO: Record<TipoEmpresaKey, ModuloKey[]> = {
  CONSTRUCTORA: ['dashboard', 'flujo', 'proyectos', 'cuentas', 'reportes', 'cargas'],
  CAPITAL: ['dashboard', 'flujo', 'proyectos', 'cuentas', 'reportes', 'cargas'],
  COMERCIAL: [
    'dashboard',
    'flujo',
    'proyectos',
    'cuentas',
    'reportes',
    'ventas',
    'monday',
    'comisiones',
  ],
  DEFAULT: ['dashboard', 'flujo', 'proyectos', 'cuentas', 'reportes'],
}

export function getModulosParaTipo(tipo: string): ModuloKey[] {
  return MODULOS_POR_TIPO[tipo as TipoEmpresaKey] ?? MODULOS_POR_TIPO.DEFAULT
}
