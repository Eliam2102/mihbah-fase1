import {
  LayoutDashboard,
  ArrowLeftRight,
  FolderKanban,
  BookOpen,
  BarChart3,
  FileSpreadsheet,
  RefreshCw,
  Percent,
  Users,
  ShieldCheck,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ModuloKey } from '@/lib/modulos-config'

export interface ModuleItem {
  label: string
  href: string
  icon: LucideIcon
  moduloKey: ModuloKey
}

// Base modules — used for "TODAS" view (consolidated)
const BASE_MODULES: ModuleItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, moduloKey: 'dashboard' },
  { label: 'Flujo', href: '/flujo', icon: ArrowLeftRight, moduloKey: 'flujo' },
  { label: 'Proyectos', href: '/proyectos', icon: FolderKanban, moduloKey: 'proyectos' },
  { label: 'Cuentas', href: '/cuentas', icon: BookOpen, moduloKey: 'cuentas' },
  { label: 'Reportes', href: '/reportes', icon: BarChart3, moduloKey: 'reportes' },
]

// Per-empresa modules — all hrefs include empresaId
function empresaModules(id: string): ModuleItem[] {
  return [
    {
      label: 'Dashboard',
      href: `/empresa/${id}/dashboard`,
      icon: LayoutDashboard,
      moduloKey: 'dashboard',
    },
    { label: 'Flujo', href: `/empresa/${id}/flujo`, icon: ArrowLeftRight, moduloKey: 'flujo' },
    {
      label: 'Proyectos',
      href: `/empresa/${id}/proyectos`,
      icon: FolderKanban,
      moduloKey: 'proyectos',
    },
    { label: 'Cuentas', href: `/empresa/${id}/cuentas`, icon: BookOpen, moduloKey: 'cuentas' },
    { label: 'Reportes', href: `/empresa/${id}/reportes`, icon: BarChart3, moduloKey: 'reportes' },
  ]
}

const EXCEL_MODULE: ModuleItem = {
  label: 'Cargas Excel',
  href: `/cargas`,
  icon: FileSpreadsheet,
  moduloKey: 'cargas',
}

const MONDAY_MODULE = (empresaId: string): ModuleItem => ({
  label: 'Sincronización Monday',
  href: `/empresa/${empresaId}/monday`,
  icon: RefreshCw,
  moduloKey: 'monday',
})

const VENTAS_MODULE = (empresaId: string): ModuleItem => ({
  label: 'Ventas',
  href: `/empresa/${empresaId}/ventas`,
  icon: ShoppingCart,
  moduloKey: 'ventas',
})

const COMISIONES_MODULES = (empresaId: string): ModuleItem[] => [
  {
    label: 'Comisiones',
    href: `/empresa/${empresaId}/comisiones`,
    icon: Percent,
    moduloKey: 'comisiones',
  },
  {
    label: 'Tesorería',
    href: `/empresa/${empresaId}/comisiones/tesoreria`,
    icon: Wallet,
    moduloKey: 'comisiones',
  },
  {
    label: 'Alianzas y red',
    href: `/empresa/${empresaId}/comisiones/alianzas`,
    icon: Users,
    moduloKey: 'comisiones',
  },
  {
    label: 'Usuarios del portal',
    href: `/empresa/${empresaId}/comisiones/portal-usuarios`,
    icon: ShieldCheck,
    moduloKey: 'comisiones',
  },
]

// empresa name → slug mapping for known empresas
export const EMPRESA_SLUGS: Record<string, string> = {
  MIHBAH: 'mihbah',
  YCDI: 'ycdi',
  'BM CORP': 'bm-corp',
}

/**
 * Returns the modules available for a given empresa.
 * Pass 'TODAS' for the consolidated view.
 */
export function getModulesForEmpresa(
  empresaActiva: 'TODAS' | string,
  empresaNombre?: string,
  empresaId?: string,
): ModuleItem[] {
  if (empresaActiva === 'TODAS') return BASE_MODULES

  const name = (empresaNombre ?? '').toUpperCase()
  const id = empresaId ?? empresaActiva
  const base = empresaModules(id)

  if (name === 'MIHBAH' || name === 'YCDI') {
    return [...base, EXCEL_MODULE]
  }

  if (name === 'BM CORP') {
    // BM CORP usa /flujo-caja (vista semanal) en lugar de /flujo genérico
    const baseBmcorp = base.map((m) =>
      m.label === 'Flujo' ? { ...m, href: `/empresa/${id}/flujo-caja` } : m,
    )
    return [...baseBmcorp, VENTAS_MODULE(id), ...COMISIONES_MODULES(id), MONDAY_MODULE(id)]
  }

  return base
}
