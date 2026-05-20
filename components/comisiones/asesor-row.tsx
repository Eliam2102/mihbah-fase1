'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Mail, Phone, Building2, AlertCircle } from 'lucide-react'
import { desactivarAsesorAction } from '@/app/actions/comisiones/alianzas'
import type { Asesor, Lider } from '@/lib/services/comisiones/alianzas.service'
import { ConfirmInline } from './confirm-inline'
import { AsesorForm } from './asesor-form'

export function AsesorRow({
  empresaId,
  asesor,
  lideres,
}: {
  empresaId: string
  asesor: Asesor
  lideres: Lider[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()

  if (editing) {
    return (
      <AsesorForm
        empresaId={empresaId}
        afiliadoId={asesor.afiliadoId}
        lideres={lideres}
        asesor={asesor}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const initials =
    asesor.nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'

  const liderNombre = asesor.liderId
    ? (lideres.find((l) => l.id === asesor.liderId)?.nombre ?? null)
    : null

  async function handleDelete() {
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await desactivarAsesorAction(empresaId, asesor.id)
        if (result.ok) router.refresh()
        resolve()
      })
    })
  }

  return (
    <div className="bg-card hover:border-primary/40 group flex items-start gap-3 rounded-lg border p-3 transition-colors">
      <span className="from-primary/80 to-jade-500 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white">
        {initials}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-foreground text-sm font-semibold">{asesor.nombre}</p>
          {!asesor.liderId && (
            <span className="text-warning bg-warning/10 border-warning/30 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium">
              <AlertCircle className="h-2.5 w-2.5" />
              Sin líder
            </span>
          )}
        </div>

        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {liderNombre && (
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground/60">↳</span>
              {liderNombre}
            </span>
          )}
          {asesor.email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {asesor.email}
            </span>
          )}
          {asesor.telefono && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {asesor.telefono}
            </span>
          )}
        </div>

        <div className="mt-1">
          {asesor.mondayNombre ? (
            <span className="text-foreground bg-muted/60 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px]">
              <Building2 className="h-2.5 w-2.5" />
              Monday: {asesor.mondayNombre}
            </span>
          ) : (
            <span className="text-warning bg-warning/5 border-warning/20 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]">
              <AlertCircle className="h-2.5 w-2.5" />
              Sin match Monday
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <ConfirmInline onConfirm={handleDelete} />
      </div>
    </div>
  )
}
