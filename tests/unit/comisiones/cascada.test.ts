import { describe, expect, it } from 'vitest'
import {
  repartirCascada,
  deltaCascadaAbono,
  type LineaCascada,
} from '@/lib/services/comisiones/cascada'

// Dream Big terrenos, lote $151,800, sin descuento (modelo consolidado, matriz base).
// OP 2% / LIDER 8% / bolsa Jorge 2.5% + Kass 4.5% / socios fijos 1.5%+1.5% = 20% = $30,360
function lineasDreamBig(): LineaCascada[] {
  return [
    { id: 'op_bm', tipoBeneficiario: 'OP_BMCORP', montoTotal: 1518 }, // 1%
    { id: 'op_yy', tipoBeneficiario: 'OP_YESYUCAN', montoTotal: 1518 }, // 1%
    { id: 'lider', tipoBeneficiario: 'LIDER_SALDO', montoTotal: 12144 }, // 8%
    { id: 'jorge_b', tipoBeneficiario: 'SOCIO_BOLSA_JORGE', montoTotal: 3795 }, // 2.5%
    { id: 'kass_b', tipoBeneficiario: 'SOCIO_BOLSA_KASS', montoTotal: 6831 }, // 4.5%
    { id: 'jorge_f', tipoBeneficiario: 'SOCIO_FIJO_JORGE', montoTotal: 2277 }, // 1.5%
    { id: 'kass_f', tipoBeneficiario: 'SOCIO_FIJO_KASS', montoTotal: 2277 }, // 1.5%
  ]
}

const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0)

describe('cascada de prioridad — repartirCascada', () => {
  it('paga todo cuando el resto cubre la comisión completa', () => {
    const r = repartirCascada(lineasDreamBig(), 30360)
    expect(Math.round(sum(r))).toBe(30360)
    expect(r.get('lider')).toBe(12144)
    expect(r.get('kass_f')).toBe(2277)
  })

  it('cliente paga $22,770 (15%) — cascada con tier de bolsa parcial proporcional', () => {
    const r = repartirCascada(lineasDreamBig(), 22770)
    // Suma repartida = exactamente lo pagado
    expect(Math.round(sum(r))).toBe(22770)
    // Tier 1 (op) y tier 2 (líder) completos
    expect(r.get('op_bm')).toBe(1518)
    expect(r.get('op_yy')).toBe(1518)
    expect(r.get('lider')).toBe(12144)
    // Tier 3 (bolsa) parcial → proporcional a 2.5 : 4.5
    expect(r.get('jorge_b')).toBeCloseTo(2710.7, 0)
    expect(r.get('kass_b')).toBeCloseTo(4879.3, 0)
    // Tier 4 (socios fijos) no alcanza → 0
    expect(r.get('jorge_f')).toBe(0)
    expect(r.get('kass_f')).toBe(0)
  })

  it('pago chico solo cubre operativa (tier 1)', () => {
    const r = repartirCascada(lineasDreamBig(), 3036)
    expect(r.get('op_bm')).toBe(1518)
    expect(r.get('op_yy')).toBe(1518)
    expect(r.get('lider')).toBe(0)
  })

  it('resto 0 → nadie cobra', () => {
    const r = repartirCascada(lineasDreamBig(), 0)
    expect(sum(r)).toBe(0)
  })
})

describe('cascada acumulativa entre abonos — deltaCascadaAbono', () => {
  it('segundo abono continúa la cascada donde quedó el primero', () => {
    const lineas = lineasDreamBig()
    // Abono 1: $15,180 (cubre op 3036 + líder 12144). Abono 2 lleva a $22,770.
    const delta1 = deltaCascadaAbono(lineas, 0, 15180)
    expect(delta1.get('lider')).toBe(12144)
    expect(delta1.get('jorge_b')).toBe(0) // aún no alcanza bolsa

    const delta2 = deltaCascadaAbono(lineas, 15180, 22770)
    // El 2do abono ($7,590) cae en el tier de bolsa, proporcional
    expect(delta2.get('lider')).toBe(0) // ya estaba pagado
    expect(delta2.get('jorge_b')).toBeCloseTo(2710.7, 0)
    expect(delta2.get('kass_b')).toBeCloseTo(4879.3, 0)
    expect(Math.round(sum(delta2))).toBe(7590)
  })
})
