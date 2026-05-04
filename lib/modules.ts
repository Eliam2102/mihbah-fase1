import {
  LayoutDashboard,
  ArrowLeftRight,
  FolderKanban,
  BookOpen,
  BarChart3,
  FileSpreadsheet,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'

export interface ModuleItem {
  label: string
  href: string
  icon: LucideIcon
}

// Base modules available to all companies
const BASE_MODULES: ModuleItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Flujo', href: '/flujo', icon: ArrowLeftRight },
  { label: 'Proyectos', href: '/proyectos', icon: FolderKanban },
  { label: 'Cuentas', href: '/cuentas', icon: BookOpen },
  { label: 'Reportes', href: '/reportes', icon: BarChart3 },
]

const EXCEL_MODULE: ModuleItem = {
  label: 'Cargas Excel',
  href: '/cargas-excel',
  icon: FileSpreadsheet,
}

const MONDAY_MODULE: ModuleItem = {
  label: 'Sincronización Monday',
  href: '/monday',
  icon: RefreshCw,
}

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
): ModuleItem[] {
  if (empresaActiva === 'TODAS') return BASE_MODULES

  const name = (empresaNombre ?? '').toUpperCase()

  if (name === 'MIHBAH' || name === 'YCDI') {
    return [...BASE_MODULES, EXCEL_MODULE]
  }

  if (name === 'BM CORP') {
    return [...BASE_MODULES, MONDAY_MODULE]
  }

  // Default: base modules only
  return BASE_MODULES
}
