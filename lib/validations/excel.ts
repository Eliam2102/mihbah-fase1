import { z } from 'zod'

export const TIPO_MOVIMIENTO_VALUES = ['INGRESO', 'SALIDA', 'INTERNO', 'PRESTAMO'] as const

export type TipoMovimientoExcel = (typeof TIPO_MOVIMIENTO_VALUES)[number]

/** Single Excel row schema. Validates one parsed row. */
export const excelRowSchema = z
  .object({
    anio: z.coerce
      .number()
      .int()
      .gte(2020, 'Año debe ser >= 2020')
      .lte(2030, 'Año debe ser <= 2030'),
    mes: z.coerce.number().int().gte(1, 'Mes debe ser 1-12').lte(12, 'Mes debe ser 1-12'),
    fecha: z.coerce.date({
      required_error: 'Fecha requerida',
      invalid_type_error: 'Fecha inválida',
    }),
    tipo: z.enum(TIPO_MOVIMIENTO_VALUES, {
      errorMap: () => ({ message: `Tipo debe ser ${TIPO_MOVIMIENTO_VALUES.join('|')}` }),
    }),
    categoria: z.string().optional().nullable(),
    grupo: z.string().optional().nullable(),
    nombre: z.string().optional().nullable(),
    concepto: z
      .string()
      .nullish()
      .transform((v) => (v && v.trim() !== '' ? v.trim() : 'Otros')),
    monto: z.coerce
      .number()
      .transform((n) => Math.abs(n))
      .refine((n) => n > 0, 'Monto debe ser mayor a cero'),
    cuenta: z.string().optional().nullable(),
    proyecto: z.string().optional().nullable(),
    comentarios: z.string().optional().nullable(),
  })
  .refine((d) => d.fecha.getUTCFullYear() === d.anio, {
    message: 'Año no coincide con fecha',
    path: ['fecha'],
  })
  .refine((d) => d.fecha.getUTCMonth() + 1 === d.mes, {
    message: 'Mes no coincide con fecha',
    path: ['fecha'],
  })

export type ExcelRow = z.infer<typeof excelRowSchema>

export interface ExcelRowInput {
  anio?: unknown
  mes?: unknown
  fecha?: unknown
  tipo?: unknown
  categoria?: unknown
  grupo?: unknown
  nombre?: unknown
  concepto?: unknown
  monto?: unknown
  cuenta?: unknown
  proyecto?: unknown
  comentarios?: unknown
}

export interface ValidatedRow {
  rowNumber: number
  raw: ExcelRowInput
  data?: ExcelRow
  errors: string[]
  isDuplicate: boolean
}
