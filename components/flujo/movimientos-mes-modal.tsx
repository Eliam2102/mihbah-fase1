'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  closeHref: string
  children: React.ReactNode
}

export function MovimientosMesModal({ closeHref, children }: Props) {
  const router = useRouter()

  const close = () => router.push(closeHref)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeHref])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div className="animate-in fade-in zoom-in-95 relative z-10 w-full max-w-5xl duration-200">
        {children}
      </div>
    </div>
  )
}
