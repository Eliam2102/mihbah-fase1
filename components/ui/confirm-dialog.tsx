'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'

type ConfirmOptions = {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((val: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts)
    setIsOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve)
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    resolvePromise?.(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolvePromise?.(false)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="bg-card animate-scale-up relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200/80 shadow-2xl dark:border-slate-800/80">
            <div className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-foreground text-lg font-bold">{options.title}</h2>
              {options.description && (
                <p className="text-muted-foreground mt-2 text-sm">{options.description}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={handleCancel}
                className="text-muted-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-800"
              >
                {options.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-rose-700 active:scale-[0.98]"
              >
                <Check className="h-4 w-4" />
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
