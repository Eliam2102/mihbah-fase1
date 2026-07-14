'use client'

import { forwardRef, useCallback } from 'react'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  step?: number
  min?: number
  max?: number
}

/**
 * Input numérico con comportamiento consistente en todo el sistema:
 * - onFocus selecciona el contenido completo (no deja el cursor al final del 0)
 * - onWheel desactiva el scroll cambiando el valor (evita accidentes)
 * - Solo acepta lo que el usuario escribe
 */
const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { onFocus, onWheel, className, ...props },
  ref,
) {
  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select()
      onFocus?.(e)
    },
    [onFocus],
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLInputElement>) => {
      e.currentTarget.blur()
      onWheel?.(e)
    },
    [onWheel],
  )

  return (
    <input
      {...props}
      ref={ref}
      type="number"
      onFocus={handleFocus}
      onWheel={handleWheel}
      className={className}
    />
  )
})

export default NumberInput
