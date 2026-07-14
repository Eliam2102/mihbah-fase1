'use client'

import { useState, useTransition } from 'react'
import { Check, Trash2, X, Loader2 } from 'lucide-react'

export function ConfirmInline({
  onConfirm,
  label = 'Eliminar',
  question = '¿Seguro?',
  size = 'sm',
}: {
  onConfirm: () => Promise<void> | void
  label?: string
  question?: string
  size?: 'sm' | 'md'
}) {
  const [armed, setArmed] = useState(false)
  const [pending, startTransition] = useTransition()

  const heightCls = size === 'md' ? 'h-8 px-3 text-xs' : 'h-7 px-2 text-[11px]'

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`text-destructive hover:bg-destructive/10 inline-flex items-center gap-1 rounded-md font-medium transition-colors ${heightCls}`}
        title={label}
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`text-muted-foreground inline-flex items-center ${heightCls.includes('text-xs') ? 'text-xs' : 'text-[11px]'}`}
      >
        {question}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await onConfirm()
            setArmed(false)
          })
        }}
        className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center gap-1 rounded-md font-medium disabled:opacity-60 ${heightCls}`}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Sí
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setArmed(false)}
        className={`bg-muted hover:bg-muted/70 text-foreground inline-flex items-center gap-1 rounded-md font-medium disabled:opacity-60 ${heightCls}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
