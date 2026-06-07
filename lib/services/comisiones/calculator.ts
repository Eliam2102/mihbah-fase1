/**
 * Motor de cálculo de comisiones BM CORP — función pura, sin DB.
 *
 * Implementa el esquema documentado en YESYUCAN_Esquema_de_Comisiones_v5:
 *   - Terrenos (Aliados del Universo): 20% total — 2% op + 3% socios fijos + 15% bolsa
 *   - YCD (Partners YCD): 15% total — 3% op + 12% bolsa, líder topado 10%
 *
 * Cascada de liberación con enganche (doc §4):
 *   1. Comisión operativa (BM Corp + YESYUCAN)
 *   2. Comisión del asesor
 *   3. Saldo del líder (afiliación − asesor)
 *   4. Bolsa socios (Jorge / Kass / Diana — Jorge acumula mes)
 *   5. Socios fijos (solo terrenos, mensual)
 */

export type TipoProducto = 'TERRENO' | 'ACCION'

export type ReglaEspecial = 'NINGUNA' | 'FLAMINGO_DIRECTO' | 'LGI_YCD_ACUMULA'

export type TipoBeneficiario =
  | 'OP_BMCORP'
  | 'OP_YESYUCAN'
  | 'ASESOR'
  | 'LIDER_SALDO'
  | 'SOCIO_BOLSA_JORGE'
  | 'SOCIO_BOLSA_KASS'
  | 'SOCIO_BOLSA_DIANA'
  | 'SOCIO_FIJO_JORGE'
  | 'SOCIO_FIJO_KASS'

export interface EsquemaConfig {
  tipoProducto: TipoProducto
  porcentajeTotalCliente: number
  porcentajeOpBmcorp: number
  porcentajeOpYesyucan: number
  porcentajeSocioFijoJorge: number
  porcentajeSocioFijoKass: number
  porcentajeBolsaComercial: number
  porcentajeAsesorEstandar: number
  porcentajeLiderTope?: number | null
}

export interface MatrizConfig {
  porcentajeAfiliacion: number
  porcentajeJorgeBolsa: number
  porcentajeKassBolsa: number
  porcentajeDianaBolsa: number
  reglaEspecial: ReglaEspecial
  liderNombre: string
  asesorNombre?: string | null
  requiereConfig?: boolean
  // Override de socios fijos por alianza (null = usar valor del esquema global)
  porcentajeSocioFijoJorgeOverride?: number | null
  porcentajeSocioFijoKassOverride?: number | null
}

export interface CalculatorInput {
  montoVenta: number
  enganchePagado: number
  porcentajeEnganche?: number
  esquema: EsquemaConfig
  matriz: MatrizConfig | null
  // Descuento que aplica la desarrolladora ANTES de entregar comisión a BM Corp.
  // Default 5% según práctica real. Se aplica a cada concepto antes de cascada.
  descuentoDesarrolladoraPct?: number
}

export interface LineaDispersion {
  tipoBeneficiario: TipoBeneficiario
  beneficiarioNombre: string
  montoTotal: number
  montoLiberable: number
  montoDiferido: number
  acumulaMensual: boolean
}

export interface CalculatorOutput {
  sinConfig: boolean
  comisionBrutaTotal: number
  montoOpBmcorp: number
  montoOpYesyucan: number
  montoSocioFijoJorge: number
  montoSocioFijoKass: number
  montoBolsaComercial: number
  montoAsesor: number
  montoLiderSaldo: number
  montoSocioBolsaJorge: number
  montoSocioBolsaKass: number
  montoSocioBolsaDiana: number
  enganchePagado: number
  porcentajeEnganche: number
  montoLiberable: number
  montoDiferido: number
  dispersiones: LineaDispersion[]
  advertencias: string[]
}

const TWO_DECIMALS = 100

function round(n: number): number {
  return Math.round(n * TWO_DECIMALS) / TWO_DECIMALS
}

function pct(monto: number, porcentaje: number): number {
  return round((monto * porcentaje) / 100)
}

export function calcular(input: CalculatorInput): CalculatorOutput {
  const { montoVenta, enganchePagado, esquema, matriz } = input
  const advertencias: string[] = []

  // Sin matriz configurada → motor no calcula líneas, solo totales agregados.
  if (!matriz || matriz.requiereConfig) {
    return emptyOutput(montoVenta, enganchePagado, esquema, input.porcentajeEnganche, [
      matriz?.requiereConfig
        ? 'Matriz marcada requiereConfig=true. Joana debe configurar antes de calcular.'
        : 'No hay matriz para esta alianza × producto.',
    ])
  }

  // Descuento desarrolladora — default 0%. Regla Joana (junta 2026-05-28):
  // los montos por concepto son brutos (% × venta total), sin retención. El
  // techo de cada línea es el bruto. Si en el futuro un desarrollo retiene un
  // %, la reducción se aplica al monto DISPONIBLE para dispersar en cascada
  // (en cortes.ts), no al techo de cada línea aquí.
  const descuentoPct = input.descuentoDesarrolladoraPct ?? 0
  const factorDescuento = 1 - descuentoPct / 100

  // 1. Montos por concepto (BRUTOS, antes de descuento)
  const comisionBrutaTotal = pct(montoVenta, esquema.porcentajeTotalCliente)
  const montoOpBmcorp = pct(montoVenta, esquema.porcentajeOpBmcorp)
  const montoOpYesyucan = pct(montoVenta, esquema.porcentajeOpYesyucan)
  // Socios fijos: override por alianza tiene prioridad sobre el esquema global
  const pctSocioFijoJorge =
    matriz.porcentajeSocioFijoJorgeOverride != null
      ? matriz.porcentajeSocioFijoJorgeOverride
      : esquema.porcentajeSocioFijoJorge
  const pctSocioFijoKass =
    matriz.porcentajeSocioFijoKassOverride != null
      ? matriz.porcentajeSocioFijoKassOverride
      : esquema.porcentajeSocioFijoKass
  const montoSocioFijoJorge = pct(montoVenta, pctSocioFijoJorge)
  const montoSocioFijoKass = pct(montoVenta, pctSocioFijoKass)
  const montoBolsaComercial = pct(montoVenta, esquema.porcentajeBolsaComercial)

  const montoAsesor = pct(montoVenta, esquema.porcentajeAsesorEstandar)

  // Afiliación con tope (YCD = 10%; terrenos = sin tope)
  const tope = esquema.porcentajeLiderTope ?? Infinity
  const afiliacionAplicada = Math.min(matriz.porcentajeAfiliacion, tope)
  const montoAfiliacionAplicada = pct(montoVenta, afiliacionAplicada)

  const montoSocioBolsaJorge = pct(montoVenta, matriz.porcentajeJorgeBolsa)
  const montoSocioBolsaKass = pct(montoVenta, matriz.porcentajeKassBolsa)
  const montoSocioBolsaDiana = pct(montoVenta, matriz.porcentajeDianaBolsa)

  // Validación: suma matriz (afiliación + socios bolsa) debe = bolsa comercial
  const sumaMatriz = round(
    montoAfiliacionAplicada + montoSocioBolsaJorge + montoSocioBolsaKass + montoSocioBolsaDiana,
  )
  if (Math.abs(sumaMatriz - montoBolsaComercial) > 0.01) {
    advertencias.push(
      `Matriz no cuadra: suma ${sumaMatriz} != bolsa comercial ${montoBolsaComercial}`,
    )
  }

  // Asesor cobra del líder excepto Flamingo (regla validada cliente).
  // Si NO es Flamingo, la línea ASESOR se consolida en LIDER_SALDO.
  // El líder recibe afiliación COMPLETA y dispersa internamente.
  const esFlamingo = matriz.reglaEspecial === 'FLAMINGO_DIRECTO'
  const montoAsesorEfectivo = esFlamingo ? montoAsesor : 0
  const montoLiderSaldo = esFlamingo
    ? round(Math.max(0, montoAfiliacionAplicada - montoAsesor))
    : montoAfiliacionAplicada

  // 2. Construir líneas en orden de cascada (doc §4)
  // Aplica factor descuento (1 - desc%) a cada monto.
  const lineas: LineaDispersion[] = []
  const addLinea = (
    tipo: TipoBeneficiario,
    nombre: string,
    montoBruto: number,
    acumula = false,
  ): void => {
    const monto = round(montoBruto * factorDescuento)
    if (monto > 0) {
      lineas.push({
        tipoBeneficiario: tipo,
        beneficiarioNombre: nombre,
        montoTotal: monto,
        montoLiberable: 0,
        montoDiferido: monto,
        acumulaMensual: acumula,
      })
    }
  }

  addLinea('OP_BMCORP', 'BM Corp', montoOpBmcorp)
  addLinea('OP_YESYUCAN', 'YESYUCAN', montoOpYesyucan)
  if (esFlamingo) {
    addLinea('ASESOR', matriz.asesorNombre || 'Asesor', montoAsesorEfectivo)
  }
  addLinea('LIDER_SALDO', matriz.liderNombre, montoLiderSaldo)
  addLinea('SOCIO_BOLSA_JORGE', 'Jorge Juárez', montoSocioBolsaJorge, true)
  addLinea('SOCIO_BOLSA_KASS', 'Kass Brambila', montoSocioBolsaKass)
  addLinea('SOCIO_BOLSA_DIANA', 'Diana Jimendi', montoSocioBolsaDiana)
  addLinea('SOCIO_FIJO_JORGE', 'Jorge Juárez (fijo)', montoSocioFijoJorge)
  addLinea('SOCIO_FIJO_KASS', 'Kass Brambila (fijo)', montoSocioFijoKass)

  // 3. Cascada de liberación según enganche pagado.
  // El enganche también se reduce por el descuento desarrolladora (lo que
  // realmente cobra BM Corp del enganche).
  let resto = round(enganchePagado * factorDescuento)
  for (const linea of lineas) {
    if (resto <= 0) break
    const liberable = Math.min(linea.montoTotal, resto)
    linea.montoLiberable = round(liberable)
    linea.montoDiferido = round(linea.montoTotal - liberable)
    resto = round(resto - liberable)
  }

  // 4. Reglas especiales — afectan SOLO el flag acumulaMensual, no el cálculo numérico.
  // FLAMINGO_DIRECTO: ASESOR queda sin líder (lo marca el servicio que persiste,
  // este motor solo calcula montos).
  if (matriz.reglaEspecial === 'LGI_YCD_ACUMULA' && esquema.tipoProducto === 'ACCION') {
    for (const linea of lineas) {
      linea.acumulaMensual = true
    }
  }

  // 5. Totales liberable/diferido
  const montoLiberable = round(lineas.reduce((sum, l) => sum + l.montoLiberable, 0))
  const montoDiferido = round(lineas.reduce((sum, l) => sum + l.montoDiferido, 0))

  const porcentajeEnganche =
    input.porcentajeEnganche ?? (montoVenta > 0 ? round((enganchePagado / montoVenta) * 100) : 0)

  // Snapshot de totales — todos NETOS post-descuento (lo que realmente
  // cobra cada beneficiario). Esto es lo que se persiste en comisiones_calculadas.
  return {
    sinConfig: false,
    comisionBrutaTotal: round(comisionBrutaTotal * factorDescuento),
    montoOpBmcorp: round(montoOpBmcorp * factorDescuento),
    montoOpYesyucan: round(montoOpYesyucan * factorDescuento),
    montoSocioFijoJorge: round(montoSocioFijoJorge * factorDescuento),
    montoSocioFijoKass: round(montoSocioFijoKass * factorDescuento),
    montoBolsaComercial: round(montoBolsaComercial * factorDescuento),
    montoAsesor: round(montoAsesorEfectivo * factorDescuento),
    montoLiderSaldo: round(montoLiderSaldo * factorDescuento),
    montoSocioBolsaJorge: round(montoSocioBolsaJorge * factorDescuento),
    montoSocioBolsaKass: round(montoSocioBolsaKass * factorDescuento),
    montoSocioBolsaDiana: round(montoSocioBolsaDiana * factorDescuento),
    enganchePagado: round(enganchePagado),
    porcentajeEnganche,
    montoLiberable,
    montoDiferido,
    dispersiones: lineas,
    advertencias,
  }
}

function emptyOutput(
  montoVenta: number,
  enganchePagado: number,
  esquema: EsquemaConfig,
  porcentajeEngancheInput: number | undefined,
  advertencias: string[],
): CalculatorOutput {
  const comisionBrutaTotal = pct(montoVenta, esquema.porcentajeTotalCliente)
  const porcentajeEnganche =
    porcentajeEngancheInput ?? (montoVenta > 0 ? round((enganchePagado / montoVenta) * 100) : 0)
  return {
    sinConfig: true,
    comisionBrutaTotal,
    montoOpBmcorp: 0,
    montoOpYesyucan: 0,
    montoSocioFijoJorge: 0,
    montoSocioFijoKass: 0,
    montoBolsaComercial: 0,
    montoAsesor: 0,
    montoLiderSaldo: 0,
    montoSocioBolsaJorge: 0,
    montoSocioBolsaKass: 0,
    montoSocioBolsaDiana: 0,
    enganchePagado: round(enganchePagado),
    porcentajeEnganche,
    montoLiberable: 0,
    montoDiferido: comisionBrutaTotal,
    dispersiones: [],
    advertencias,
  }
}

// Constructores helpers para configs típicas — facilitan tests y seeds.

export function esquemaTerrenos(): EsquemaConfig {
  return {
    tipoProducto: 'TERRENO',
    porcentajeTotalCliente: 20,
    porcentajeOpBmcorp: 1,
    porcentajeOpYesyucan: 1,
    porcentajeSocioFijoJorge: 1.5,
    porcentajeSocioFijoKass: 1.5,
    porcentajeBolsaComercial: 15,
    porcentajeAsesorEstandar: 8,
    porcentajeLiderTope: null,
  }
}

export function esquemaYcd(): EsquemaConfig {
  return {
    tipoProducto: 'ACCION',
    porcentajeTotalCliente: 15,
    porcentajeOpBmcorp: 0,
    porcentajeOpYesyucan: 3,
    porcentajeSocioFijoJorge: 0,
    porcentajeSocioFijoKass: 0,
    porcentajeBolsaComercial: 12,
    porcentajeAsesorEstandar: 7,
    porcentajeLiderTope: 10,
  }
}
