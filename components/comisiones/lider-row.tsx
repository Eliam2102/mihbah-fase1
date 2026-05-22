'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Mail, Phone, Award, Wallet, CreditCard } from 'lucide-react'
import { desactivarLiderAction } from '@/app/actions/comisiones/alianzas'
import type { Lider } from '@/lib/services/comisiones/alianzas.service'
import { ConfirmInline } from './confirm-inline'
import { LiderForm } from './lider-form'

const NIVEL_LABEL: Record<string, { label: string; cls: string }> = {
  JADE: { label: 'Jade', cls: 'bg-jade-100 text-jade-800 dark:bg-jade-900/40 dark:text-jade-200' },
  TURQUESA: {
    label: 'Turquesa',
    cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  },
  ONIX_NEGRO: { label: 'Ónix', cls: 'bg-zinc-800 text-zinc-100 dark:bg-zinc-700' },
}

export function LiderRow({ empresaId, lider }: { empresaId: string; lider: Lider }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()

  if (editing) {
    return (
      <LiderForm
        empresaId={empresaId}
        afiliadoId={lider.afiliadoId}
        lider={lider}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const nivel = lider.nivel ? NIVEL_LABEL[lider.nivel] : null
  const initials =
    lider.nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'

  async function handleDelete() {
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await desactivarLiderAction(empresaId, lider.id)
        if (result.ok) router.refresh()
        resolve()
      })
    })
  }

  return (
    <div className="bg-card hover:border-primary/40 group flex items-start gap-3 rounded-lg border p-3 transition-colors">
      <span className="from-jade-500 to-jade-700 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white">
        {initials}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-foreground text-sm font-semibold">{lider.nombre}</p>
          {nivel && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${nivel.cls}`}
            >
              <Award className="h-2.5 w-2.5" />
              {nivel.label}
            </span>
          )}
          {lider.coordinaPago && (
            <span className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
              <Wallet className="h-2.5 w-2.5" />
              {lider.coordinaPago}
            </span>
          )}
          {lider.metodoPago && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                lider.metodoPago === 'EFECTIVO'
                  ? 'bg-emerald-100 text-emerald-800'
                  : lider.metodoPago === 'DEPOSITO'
                    ? 'bg-indigo-100 text-indigo-800'
                    : lider.metodoPago === 'TRANSFERENCIA'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-muted text-muted-foreground'
              }`}
            >
              {lider.metodoPago === 'EFECTIVO'
                ? 'Efectivo'
                : lider.metodoPago === 'DEPOSITO'
                  ? 'Depósito'
                  : lider.metodoPago === 'TRANSFERENCIA'
                    ? 'Transferencia'
                    : 'Otro'}
            </span>
          )}
        </div>

        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {lider.email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {lider.email}
            </span>
          )}
          {lider.telefono && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {lider.telefono}
            </span>
          )}
          {lider.banco && (
            <span className="inline-flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              {lider.banco}
            </span>
          )}
          {!lider.email && !lider.telefono && !lider.banco && (
            <span className="italic opacity-70">Sin datos de contacto</span>
          )}
        </div>

        {Number(lider.presupuestoPautasMensual ?? 0) > 0 && (
          <p className="text-muted-foreground mt-1 text-[11px]">
            Pauta mensual:{' '}
            <span className="text-foreground tabular-nums">
              $
              {Number(lider.presupuestoPautasMensual).toLocaleString('es-MX', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </p>
        )}
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
