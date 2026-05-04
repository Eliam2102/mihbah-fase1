'use client'

import { cn } from '@/lib/utils'

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-surface flex flex-col items-center justify-center rounded-xl border border-dashed px-8 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="bg-surface-2 text-muted-foreground mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          {icon}
        </div>
      )}
      <h3 className="text-foreground text-base font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
