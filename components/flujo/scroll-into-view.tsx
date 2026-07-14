'use client'

import { useEffect, useRef } from 'react'

export function ScrollIntoView({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return <div ref={ref}>{children}</div>
}
