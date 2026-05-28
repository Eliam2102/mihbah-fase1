import { describe, expect, it } from 'vitest'
import {
  calcularBonoUmbral,
  type ConfigBonoUmbral,
  type VentasPorGrupo,
} from '@/lib/services/comisiones/bonos-umbral'

const cfgFlamingoExcedente: ConfigBonoUmbral = {
  tipoFuente: 'PROPIA',
  overridePct: 0,
  umbralAcumuladoMensual: 10_000_000,
  bonoPct: 0.5,
  gruposAcumulan: ['YCD', 'ARKA', 'RH'],
  gruposAplicaBono: ['ARKA', 'RH'],
  formulaCalculo: 'EXCEDENTE',
}

const cfgFlamingoTotal: ConfigBonoUmbral = {
  ...cfgFlamingoExcedente,
  formulaCalculo: 'TOTAL_GRUPOS_APLICA',
}

const cfgDianaOverride: ConfigBonoUmbral = {
  tipoFuente: 'OVERRIDE_AFILIADO',
  overridePct: 1,
  umbralAcumuladoMensual: 10_000_000,
  bonoPct: 0.5,
  gruposAcumulan: ['YCD', 'ARKA', 'RH'],
  gruposAplicaBono: ['ARKA', 'RH'],
  formulaCalculo: 'EXCEDENTE',
}

const ventasFlamingoCruza: VentasPorGrupo = {
  YCD: 2_800_000,
  ARKA: 4_000_000,
  RH: 3_500_000,
  OTRO: 0,
}

const ventasFlamingoNoCruza: VentasPorGrupo = {
  YCD: 1_000_000,
  ARKA: 2_000_000,
  RH: 1_000_000,
  OTRO: 0,
}

describe('calcularBonoUmbral — Flamingo (PROPIA)', () => {
  it('PDF Flamingo: total $10.3M, ARKA+RH $7.5M, fórmula EXCEDENTE = 0.5% × $300k = $1,500', () => {
    const r = calcularBonoUmbral(ventasFlamingoCruza, cfgFlamingoExcedente)
    expect(r.totalAcumulado).toBe(10_300_000)
    expect(r.ventasGruposAplica).toBe(7_500_000)
    expect(r.cumplioUmbral).toBe(true)
    expect(r.excedente).toBe(300_000)
    expect(r.montoOverride).toBe(0)
    expect(r.montoBono).toBe(1500) // 0.5% × $300k
    expect(r.montoTotal).toBe(1500)
  })

  it('PDF Flamingo (interpretación alterna): fórmula TOTAL_GRUPOS_APLICA = 0.5% × $7.5M = $37,500', () => {
    const r = calcularBonoUmbral(ventasFlamingoCruza, cfgFlamingoTotal)
    expect(r.montoBono).toBe(37_500)
    expect(r.montoTotal).toBe(37_500)
  })

  it('no cruza umbral → bono = 0 con cualquier fórmula', () => {
    const r1 = calcularBonoUmbral(ventasFlamingoNoCruza, cfgFlamingoExcedente)
    expect(r1.cumplioUmbral).toBe(false)
    expect(r1.montoBono).toBe(0)
    expect(r1.excedente).toBe(0)
    expect(r1.montoTotal).toBe(0)

    const r2 = calcularBonoUmbral(ventasFlamingoNoCruza, cfgFlamingoTotal)
    expect(r2.montoBono).toBe(0)
  })

  it('exactamente en umbral → cumple, excedente = 0', () => {
    const v: VentasPorGrupo = { YCD: 2_000_000, ARKA: 5_000_000, RH: 3_000_000, OTRO: 0 }
    const r = calcularBonoUmbral(v, cfgFlamingoExcedente)
    expect(r.totalAcumulado).toBe(10_000_000)
    expect(r.cumplioUmbral).toBe(true)
    expect(r.excedente).toBe(0)
    expect(r.montoBono).toBe(0) // EXCEDENTE = 0
  })
})

describe('calcularBonoUmbral — Diana F1 (PROPIA)', () => {
  it('PDF Diana: ARKA+RH $8M, YCD $3M, total $11M → excedente $1M → bono $5,000', () => {
    const v: VentasPorGrupo = { YCD: 3_000_000, ARKA: 5_000_000, RH: 3_000_000, OTRO: 0 }
    const r = calcularBonoUmbral(v, cfgFlamingoExcedente) // misma config base
    expect(r.totalAcumulado).toBe(11_000_000)
    expect(r.excedente).toBe(1_000_000)
    expect(r.montoBono).toBe(5_000)
    expect(r.montoOverride).toBe(0)
  })
})

describe('calcularBonoUmbral — Diana F2 (OVERRIDE_AFILIADO sobre Flamingo)', () => {
  it('PDF Diana F2: ventas Flamingo $7.5M+$2.8M=$10.3M → override 1% × $10.3M = $103k + bono 0.5% × $300k = $1.5k = $104,500', () => {
    const r = calcularBonoUmbral(ventasFlamingoCruza, cfgDianaOverride)
    expect(r.totalAcumulado).toBe(10_300_000)
    expect(r.montoOverride).toBe(103_000) // 1% × $10.3M total
    expect(r.montoBono).toBe(1500) // 0.5% × $300k excedente
    expect(r.montoTotal).toBe(104_500)
  })

  it('override paga aunque no cruce umbral (sólo bono se condiciona)', () => {
    const r = calcularBonoUmbral(ventasFlamingoNoCruza, cfgDianaOverride)
    expect(r.cumplioUmbral).toBe(false)
    expect(r.montoOverride).toBe(40_000) // 1% × $4M total
    expect(r.montoBono).toBe(0)
    expect(r.montoTotal).toBe(40_000)
  })
})

describe('calcularBonoUmbral — fórmula EXCEDENTE_CAP_GRUPOS', () => {
  it('cuando excedente < ventas grupos aplica, usa excedente', () => {
    const cfg: ConfigBonoUmbral = {
      ...cfgFlamingoExcedente,
      formulaCalculo: 'EXCEDENTE_CAP_GRUPOS',
    }
    const r = calcularBonoUmbral(ventasFlamingoCruza, cfg)
    // excedente $300k, ventasGrupos $7.5M → min = $300k → bono = 0.5% × $300k = $1,500
    expect(r.montoBono).toBe(1500)
  })

  it('cuando ventas grupos < excedente, usa ventas grupos', () => {
    const cfg: ConfigBonoUmbral = {
      ...cfgFlamingoExcedente,
      formulaCalculo: 'EXCEDENTE_CAP_GRUPOS',
    }
    // Caso patológico: mucho YCD pero poco ARKA+RH
    const v: VentasPorGrupo = { YCD: 15_000_000, ARKA: 200_000, RH: 0, OTRO: 0 }
    const r = calcularBonoUmbral(v, cfg)
    expect(r.totalAcumulado).toBe(15_200_000)
    expect(r.excedente).toBe(5_200_000)
    expect(r.ventasGruposAplica).toBe(200_000)
    // min(5.2M, 200k) = 200k → bono = 0.5% × 200k = $1,000
    expect(r.montoBono).toBe(1_000)
  })
})
