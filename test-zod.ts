import { excelRowSchema } from './lib/validations/excel'

const test1 = {
  fecha: new Date('2024-11-01T00:00:00.000Z'),
  anio: 2024,
  mes: 11,
  tipo: 'INGRESO',
  monto: 500,
  concepto: 'Aportación a Capital',
}

const res1 = excelRowSchema.safeParse(test1)
if (!res1.success) console.log('Test 1 errors:', res1.error.errors)
else console.log('Test 1 SUCCESS')

const test2 = {
  fecha: new Date('2024-11-28T00:00:00.000Z'),
  anio: 2024,
  mes: 11,
  tipo: 'INGRESO',
  monto: 4050,
  concepto: undefined,
}

const res2 = excelRowSchema.safeParse(test2)
if (!res2.success) console.log('Test 2 errors:', res2.error.errors)
else console.log('Test 2 SUCCESS', res2.data)
