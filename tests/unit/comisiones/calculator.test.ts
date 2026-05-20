import { describe, expect, it } from 'vitest'
import {
  calcular,
  esquemaTerrenos,
  esquemaYcd,
  type MatrizConfig,
} from '@/lib/services/comisiones/calculator'

// Casos basados en el doc YESYUCAN_Esquema_de_Comisiones_v5 (matrices §3.1 y §3.2).

function lgiTerrenos(): MatrizConfig {
  // LGI es de Kass — líder y socia. Toda la bolsa va vía % afiliación (15%).
  return {
    porcentajeAfiliacion: 15,
    porcentajeJorgeBolsa: 0,
    porcentajeKassBolsa: 0,
    porcentajeDianaBolsa: 0,
    reglaEspecial: 'NINGUNA',
    liderNombre: 'Kass Brambila',
    asesorNombre: 'Asesor LGI',
  }
}

function flamingoTerrenos(): MatrizConfig {
  // Flamingo — Diana líder. Bolsa: 11% afiliación, 3% Jorge, 0 Kass, 1% Diana = 15% ✓
  return {
    porcentajeAfiliacion: 11,
    porcentajeJorgeBolsa: 3,
    porcentajeKassBolsa: 0,
    porcentajeDianaBolsa: 1,
    reglaEspecial: 'FLAMINGO_DIRECTO',
    liderNombre: 'Diana Jimendi',
    asesorNombre: 'Asesor Flamingo',
  }
}

function lgiYcd(): MatrizConfig {
  // LGI YCD — Kass líder topada 10%, Jorge 2% saldo = 12% bolsa
  return {
    porcentajeAfiliacion: 10,
    porcentajeJorgeBolsa: 2,
    porcentajeKassBolsa: 0,
    porcentajeDianaBolsa: 0,
    reglaEspecial: 'LGI_YCD_ACUMULA',
    liderNombre: 'Kass Brambila',
    asesorNombre: 'Asesor LGI YCD',
  }
}

function yuccaliTerrenos(): MatrizConfig {
  // Yuccali — Jorge y Kass co-líderes. Bolsa: 8% afiliación, 3.5% Jorge, 3.5% Kass = 15% ✓
  return {
    porcentajeAfiliacion: 8,
    porcentajeJorgeBolsa: 3.5,
    porcentajeKassBolsa: 3.5,
    porcentajeDianaBolsa: 0,
    reglaEspecial: 'NINGUNA',
    liderNombre: 'Jorge y Kass',
    asesorNombre: 'Asesor Yuccali',
  }
}

describe('motor de comisiones — calculator.calcular()', () => {
  it('Caso 1: LGI Terrenos $1M, enganche 12% — cascada parcial llega a saldo líder', () => {
    const r = calcular({
      montoVenta: 1_000_000,
      enganchePagado: 120_000,
      esquema: esquemaTerrenos(),
      matriz: lgiTerrenos(),
    })

    expect(r.sinConfig).toBe(false)
    expect(r.comisionBrutaTotal).toBe(200_000)
    expect(r.montoOpBmcorp).toBe(10_000)
    expect(r.montoOpYesyucan).toBe(10_000)
    expect(r.montoSocioFijoJorge).toBe(15_000)
    expect(r.montoSocioFijoKass).toBe(15_000)
    expect(r.montoBolsaComercial).toBe(150_000)
    expect(r.montoAsesor).toBe(80_000)
    expect(r.montoLiderSaldo).toBe(70_000)
    expect(r.montoSocioBolsaJorge).toBe(0)
    expect(r.montoSocioBolsaKass).toBe(0)
    expect(r.montoSocioBolsaDiana).toBe(0)
    expect(r.advertencias).toEqual([])

    // Cascada con $120k: OP 10+10, Asesor 80, Líder libera 20 (diferido 50)
    expect(r.montoLiberable).toBe(120_000)
    expect(r.montoDiferido).toBe(80_000)

    const op = r.dispersiones.find((l) => l.tipoBeneficiario === 'OP_BMCORP')!
    expect(op.montoLiberable).toBe(10_000)
    expect(op.montoDiferido).toBe(0)

    const asesor = r.dispersiones.find((l) => l.tipoBeneficiario === 'ASESOR')!
    expect(asesor.montoLiberable).toBe(80_000)
    expect(asesor.montoDiferido).toBe(0)

    const lider = r.dispersiones.find((l) => l.tipoBeneficiario === 'LIDER_SALDO')!
    expect(lider.montoLiberable).toBe(20_000)
    expect(lider.montoDiferido).toBe(50_000)

    const fijoJorge = r.dispersiones.find((l) => l.tipoBeneficiario === 'SOCIO_FIJO_JORGE')!
    expect(fijoJorge.montoLiberable).toBe(0)
    expect(fijoJorge.montoDiferido).toBe(15_000)
  })

  it('Caso 2: Flamingo Terrenos $500k, enganche 7% — cascada corta hasta asesor parcial', () => {
    const r = calcular({
      montoVenta: 500_000,
      enganchePagado: 35_000,
      esquema: esquemaTerrenos(),
      matriz: flamingoTerrenos(),
    })

    expect(r.comisionBrutaTotal).toBe(100_000)
    expect(r.montoAsesor).toBe(40_000)
    expect(r.montoLiderSaldo).toBe(15_000)
    expect(r.montoSocioBolsaJorge).toBe(15_000)
    expect(r.montoSocioBolsaDiana).toBe(5_000)
    expect(r.advertencias).toEqual([])

    // Enganche $35k cubre OP completos (5+5) y parte del asesor (25 de 40)
    expect(r.montoLiberable).toBe(35_000)
    expect(r.montoDiferido).toBe(65_000)

    const asesor = r.dispersiones.find((l) => l.tipoBeneficiario === 'ASESOR')!
    expect(asesor.montoLiberable).toBe(25_000)
    expect(asesor.montoDiferido).toBe(15_000)

    // Jorge bolsa acumula mensual aunque no se haya liberado todavía
    const jorgeBolsa = r.dispersiones.find((l) => l.tipoBeneficiario === 'SOCIO_BOLSA_JORGE')!
    expect(jorgeBolsa.acumulaMensual).toBe(true)
  })

  it('Caso 3: LGI YCD $1M, enganche 12% — tope líder 10%, regla LGI_YCD_ACUMULA marca todas líneas', () => {
    const r = calcular({
      montoVenta: 1_000_000,
      enganchePagado: 120_000,
      esquema: esquemaYcd(),
      matriz: lgiYcd(),
    })

    expect(r.comisionBrutaTotal).toBe(150_000)
    expect(r.montoOpBmcorp).toBe(0)
    expect(r.montoOpYesyucan).toBe(30_000)
    expect(r.montoSocioFijoJorge).toBe(0)
    expect(r.montoSocioFijoKass).toBe(0)
    expect(r.montoBolsaComercial).toBe(120_000)
    expect(r.montoAsesor).toBe(70_000)
    // Tope aplica: afiliación 10% × 1M = $100k → líder saldo = 100 − 70 = $30k
    expect(r.montoLiderSaldo).toBe(30_000)
    expect(r.montoSocioBolsaJorge).toBe(20_000)

    // Cascada $120k: OP 30, Asesor 70, Líder libera 20 (diferido 10)
    expect(r.montoLiberable).toBe(120_000)
    expect(r.montoDiferido).toBe(30_000)

    // Regla especial LGI_YCD_ACUMULA: TODAS las líneas acumulan mensual
    for (const linea of r.dispersiones) {
      expect(linea.acumulaMensual).toBe(true)
    }
  })

  it('Caso 4: Yuccali Terrenos $1M, enganche 16% — co-líderes, líder saldo = 0', () => {
    const r = calcular({
      montoVenta: 1_000_000,
      enganchePagado: 160_000,
      esquema: esquemaTerrenos(),
      matriz: yuccaliTerrenos(),
    })

    expect(r.comisionBrutaTotal).toBe(200_000)
    expect(r.montoAsesor).toBe(80_000)
    // Afiliación 8% = $80k, asesor 8% = $80k → líder saldo = 0
    expect(r.montoLiderSaldo).toBe(0)
    expect(r.montoSocioBolsaJorge).toBe(35_000)
    expect(r.montoSocioBolsaKass).toBe(35_000)
    expect(r.advertencias).toEqual([])

    // Como líder saldo = 0, NO debe existir esa línea en dispersiones
    const lider = r.dispersiones.find((l) => l.tipoBeneficiario === 'LIDER_SALDO')
    expect(lider).toBeUndefined()

    // Cascada $160k: OP 20, Asesor 80, Jorge bolsa 35, Kass bolsa libera 25 (diferido 10)
    expect(r.montoLiberable).toBe(160_000)
    expect(r.montoDiferido).toBe(40_000)

    const kassBolsa = r.dispersiones.find((l) => l.tipoBeneficiario === 'SOCIO_BOLSA_KASS')!
    expect(kassBolsa.montoLiberable).toBe(25_000)
    expect(kassBolsa.montoDiferido).toBe(10_000)

    // Jorge bolsa siempre acumula mensual aunque no sea LGI_YCD_ACUMULA
    const jorgeBolsa = r.dispersiones.find((l) => l.tipoBeneficiario === 'SOCIO_BOLSA_JORGE')!
    expect(jorgeBolsa.acumulaMensual).toBe(true)
  })

  it('Caso 5: Promo Terrenos $500k sin enganche — todo diferido', () => {
    const r = calcular({
      montoVenta: 500_000,
      enganchePagado: 0,
      esquema: esquemaTerrenos(),
      matriz: lgiTerrenos(),
    })

    expect(r.comisionBrutaTotal).toBe(100_000)
    expect(r.montoLiberable).toBe(0)
    expect(r.montoDiferido).toBe(100_000)
    for (const linea of r.dispersiones) {
      expect(linea.montoLiberable).toBe(0)
      expect(linea.montoDiferido).toBe(linea.montoTotal)
    }
  })

  it('Caso 6: Sin matriz (alianza requiereConfig) — motor marca sinConfig y no genera líneas', () => {
    const r = calcular({
      montoVenta: 1_000_000,
      enganchePagado: 120_000,
      esquema: esquemaTerrenos(),
      matriz: null,
    })

    expect(r.sinConfig).toBe(true)
    expect(r.comisionBrutaTotal).toBe(200_000)
    expect(r.montoLiberable).toBe(0)
    expect(r.montoDiferido).toBe(200_000)
    expect(r.dispersiones).toEqual([])
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('Caso 7: Matriz no cuadra — emite advertencia pero calcula igual', () => {
    const matrizMala: MatrizConfig = {
      porcentajeAfiliacion: 15,
      porcentajeJorgeBolsa: 2, // 15+2=17, bolsa terrenos es 15. Inconsistente.
      porcentajeKassBolsa: 0,
      porcentajeDianaBolsa: 0,
      reglaEspecial: 'NINGUNA',
      liderNombre: 'Test',
    }

    const r = calcular({
      montoVenta: 1_000_000,
      enganchePagado: 100_000,
      esquema: esquemaTerrenos(),
      matriz: matrizMala,
    })

    expect(r.advertencias.length).toBe(1)
    expect(r.advertencias[0]).toMatch(/Matriz no cuadra/)
  })

  it('Caso 8: enganche supera comisión — toda comisión liberable, sobrante no genera nada extra', () => {
    const r = calcular({
      montoVenta: 1_000_000,
      enganchePagado: 500_000, // 50% > 20% comisión = 200k
      esquema: esquemaTerrenos(),
      matriz: lgiTerrenos(),
    })

    expect(r.montoLiberable).toBe(200_000)
    expect(r.montoDiferido).toBe(0)
    for (const linea of r.dispersiones) {
      expect(linea.montoDiferido).toBe(0)
    }
  })
})
