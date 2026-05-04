'use client'

import { useRouter } from 'next/navigation'
import { useEmpresaStore, type EmpresaId } from '@/stores/empresa-store'
import { ChevronDown, Building2, Layers } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface EmpresaOption {
  id: string
  name: string
}

interface EmpresaSelectorProps {
  empresas: EmpresaOption[]
  compact?: boolean
}

export function EmpresaSelector({ empresas, compact = false }: EmpresaSelectorProps) {
  const { empresaActiva, setEmpresaActiva } = useEmpresaStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeLabel =
    empresaActiva === 'TODAS'
      ? 'Todas las empresas'
      : (empresas.find((e) => e.id === empresaActiva)?.name ?? 'Empresa')

  function handleSelect(id: EmpresaId) {
    setEmpresaActiva(id)
    setOpen(false)
    if (id === 'TODAS') {
      router.push('/dashboard')
    } else {
      router.push(`/empresa/${id}/dashboard`)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        id="empresa-selector-trigger"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'border-border bg-surface flex w-full items-center gap-2 rounded-lg border px-3 py-2',
          'text-foreground hover:bg-surface-2 text-sm font-medium transition-colors',
          'focus-visible:ring-ring focus:outline-none focus-visible:ring-2',
          compact && 'min-w-0',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {empresaActiva === 'TODAS' ? (
          <Layers className="text-primary h-4 w-4 shrink-0" />
        ) : (
          <Building2 className="text-primary h-4 w-4 shrink-0" />
        )}
        <span className={cn('flex-1 truncate text-left', compact && 'max-w-[120px]')}>
          {activeLabel}
        </span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Seleccionar empresa"
          className={cn(
            'border-border bg-popover absolute z-50 mt-1 min-w-[200px] rounded-lg border py-1 shadow-lg',
            compact ? 'right-0' : 'left-0 w-full',
          )}
        >
          {/* All companies option */}
          <button
            role="option"
            aria-selected={empresaActiva === 'TODAS'}
            onClick={() => handleSelect('TODAS')}
            className={cn(
              'hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
              empresaActiva === 'TODAS' && 'text-primary font-medium',
            )}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span>Todas las empresas</span>
            {empresaActiva === 'TODAS' && (
              <span className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />
            )}
          </button>

          {empresas.length > 0 && <div className="border-border my-1 border-t" />}

          {empresas.map((empresa) => (
            <button
              key={empresa.id}
              role="option"
              aria-selected={empresaActiva === empresa.id}
              onClick={() => handleSelect(empresa.id)}
              className={cn(
                'hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                empresaActiva === empresa.id && 'text-primary font-medium',
              )}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{empresa.name}</span>
              {empresaActiva === empresa.id && (
                <span className="bg-primary ml-auto h-1.5 w-1.5 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
