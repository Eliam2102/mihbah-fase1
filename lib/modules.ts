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
  type LucideIcon,
} from 'lucide-react'

export interface ModuleItem {
  label: string
  href: string
  icon: LucideIcon
}

// Base modules — used for "TODAS" view (consolidated)
const BASE_MODULES: ModuleItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Flujo', href: '/flujo', icon: ArrowLeftRight },
  { label: 'Proyectos', href: '/proyectos', icon: FolderKanban },
  { label: 'Cuentas', href: '/cuentas', icon: BookOpen },
  { label: 'Reportes', href: '/reportes', icon: BarChart3 },
]

// Per-empresa modules — all hrefs include empresaId
function empresaModules(id: string): ModuleItem[] {
  return [
    { label: 'Dashboard', href: `/empresa/${id}/dashboard`, icon: LayoutDashboard },
    { label: 'Flujo', href: `/empresa/${id}/flujo`, icon: ArrowLeftRight },
    { label: 'Proyectos', href: `/empresa/${id}/proyectos`, icon: FolderKanban },
    { label: 'Cuentas', href: `/empresa/${id}/cuentas`, icon: BookOpen },
    { label: 'Reportes', href: `/empresa/${id}/reportes`, icon: BarChart3 },
  ]
}

const EXCEL_MODULE: ModuleItem = {
  label: 'Cargas Excel',
  href: `/cargas`,
  icon: FileSpreadsheet,
}

const MONDAY_MODULE = (empresaId: string): ModuleItem => ({
  label: 'Sincronización Monday',
  href: `/empresa/${empresaId}/monday`,
  icon: RefreshCw,
})

const COMISIONES_MODULES = (empresaId: string): ModuleItem[] => [
  {
    label: 'Comisiones',
    href: `/empresa/${empresaId}/comisiones`,
    icon: Percent,
  },
  {
    label: 'Alianzas y red',
    href: `/empresa/${empresaId}/comisiones/alianzas`,
    icon: Users,
  },
  {
    label: 'Usuarios del portal',
    href: `/empresa/${empresaId}/comisiones/portal-usuarios`,
    icon: ShieldCheck,
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
    return [...baseBmcorp, ...COMISIONES_MODULES(id), MONDAY_MODULE(id)]
  }

  return base
}
