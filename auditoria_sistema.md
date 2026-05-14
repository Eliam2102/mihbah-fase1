# Auditoría de cálculos — SIG Jade

**Fecha:** 2026-05-08 | **Para:** Revisión con contador

Formato: cada KPI muestra qué campo toma, de qué tabla, con qué filtro, y qué operación hace.

---

## MIHBAH — Dashboard

| KPI                                | Campo usado           | Filtro aplicado                                                                   | Operación                                                                                                                          | Fuente             |
| ---------------------------------- | --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| **Ingresos**                       | `monto`               | tipo = INGRESO, período seleccionado                                              | Suma                                                                                                                               | movimientos        |
| **Egresos**                        | `monto`               | tipo = EGRESO ó SALIDA ó PRESTAMO, período seleccionado                           | Suma                                                                                                                               | movimientos        |
| **Neto**                           | Ingresos, Egresos     | —                                                                                 | Ingresos − Egresos                                                                                                                 | Calculado          |
| **Cuentas por cobrar (CXC)**       | `monto − montoPagado` | tipo = POR_COBRAR, estado = PENDIENTE                                             | Suma de saldos pendientes                                                                                                          | cuentas_pendientes |
| **Cuentas por pagar (CXP)**        | `monto − montoPagado` | tipo = POR_PAGAR, estado = PENDIENTE                                              | Suma de saldos pendientes                                                                                                          | cuentas_pendientes |
| **Semáforo**                       | Neto, Egresos, CXP    | —                                                                                 | CXP/Ingresos > 0.80 y Neto < 0 → CRÍTICO · Neto/Egresos ≥ 0.30 → SALUDABLE · ≥ 0.10 → PRECAUCIÓN · ≥ 0 → EN RIESGO · < 0 → CRÍTICO | Calculado          |
| **Flujo mensual — Ingresos**       | `monto`               | tipo = INGRESO, año seleccionado                                                  | Suma por mes (12 puntos)                                                                                                           | movimientos        |
| **Flujo mensual — Egresos**        | `monto`               | tipo = EGRESO ó SALIDA ó PRESTAMO                                                 | Suma por mes (12 puntos)                                                                                                           | movimientos        |
| **Avance por proyecto — Gastado**  | `monto`               | tipo = EGRESO ó SALIDA (**PRESTAMO excluido aquí**), proyectoNombre no vacío, año | Suma por nombre de proyecto                                                                                                        | movimientos        |
| **Avance por actividad — Gastado** | `monto`               | tipo = EGRESO ó SALIDA, nombre de proyecto específico                             | Suma por columna CATEGORÍA y GRUPO del Excel                                                                                       | movimientos        |

> ⚠️ **Inconsistencia detectada:** "Avance por proyecto" excluye PRESTAMO pero "Flujo de Caja" sí lo incluye. El gasto de obra podría estar subvaluado si hay préstamos asociados a obra.

> ⚠️ **Pendiente:** el KPI "¿Cuánto debería haberme gastado vs cuánto gasté?" usa un estimado = promedio mensual del año hasta el mes previo. No existe un presupuesto real capturado. El mes de enero siempre muestra "sin datos" (ya corregido).

---

## BM CORP — Dashboard

| KPI                                    | Campo usado                           | Filtro aplicado                                                | Operación                                                                  | Fuente                          |
| -------------------------------------- | ------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------- |
| **Total vendido**                      | `monto`                               | estado ≠ CANCELADA, ≠ RECHAZADO, período                       | Suma                                                                       | ventas_bmcorp (Monday)          |
| **Conteo ventas activas**              | —                                     | estado ≠ CANCELADA, ≠ RECHAZADO, período                       | Conteo                                                                     | ventas_bmcorp                   |
| **En proceso**                         | `monto`                               | estado = EN_PROCESO ó APROBADO_VENTAS ó ESPERANDO_AUTORIZACION | Suma + conteo                                                              | ventas_bmcorp                   |
| **Aprobado jurídico**                  | `monto`                               | estado = APROBADO_JURIDICO ó LIBERADO                          | Suma + conteo                                                              | ventas_bmcorp                   |
| **Finalizadas**                        | `monto`                               | estado = FINALIZADA ó FINALIZADO_Y_LIQUIDADO                   | Suma + conteo                                                              | ventas_bmcorp                   |
| **Ranking alianzas — quién vende más** | `monto`                               | estado ≠ canceladas, período                                   | Suma por alianza, orden descendente, top 10                                | ventas_bmcorp + afiliados       |
| **Ranking proyectos — qué vende más**  | `monto`                               | estado ≠ canceladas, período                                   | Suma por desarrollo, orden descendente, top 10                             | ventas_bmcorp + desarrollos     |
| **Repartos realizados**                | `monto`                               | tipo = REPARTO_ALIANZA, estado = PAGADO                        | Suma + conteo                                                              | repartos_bmcorp                 |
| **Repartos pendientes**                | `monto`                               | tipo = REPARTO_ALIANZA, estado = PENDIENTE ó PARCIAL           | Suma + conteo                                                              | repartos_bmcorp                 |
| **Remanente por alianza**              | `monto` (ventas) y `monto` (repartos) | Sin filtro de estado en ventas                                 | Vendido − Repartos pagados por alianza                                     | ventas_bmcorp + repartos_bmcorp |
| **Comisión generada**                  | `comisionBmcorp`                      | Todas las ventas                                               | Suma                                                                       | ventas_bmcorp                   |
| **Comisión pagada a asesores**         | `monto`                               | tipo = COMISION_ASESOR, estado = PAGADO                        | Suma                                                                       | repartos_bmcorp                 |
| **Comisión pendiente**                 | —                                     | —                                                              | Comisión generada − Pagada − Parcial                                       | Calculado                       |
| **% Conciliado comisiones**            | —                                     | —                                                              | (Pagada + Parcial) / Generada × 100                                        | Calculado                       |
| **Flujo semanal — Ingresos**           | `monto`                               | fechaCierre no vacía, últimas N semanas                        | Suma por semana                                                            | ventas_bmcorp                   |
| **Flujo semanal — Egresos**            | `monto`                               | últimas N semanas                                              | Suma por semana                                                            | repartos_bmcorp                 |
| **Semáforo**                           | —                                     | —                                                              | ⚠️ Placeholder visual — criterios no definidos aún, siempre muestra neutro | —                               |

> ⚠️ **Comisión BM CORP = 15% fijo.** La fórmula de Monday no es calculada por la API; el sistema siempre usa `monto × 0.15`. Si la comisión real es diferente al 15%, el sistema no lo refleja.

> ⚠️ **Match alianza ↔ reparto** se hace comparando nombre de texto (normalizado a minúsculas). Si hay variaciones de nombre, el remanente se calcula mal.

---

## YCDI — Dashboard

| KPI                                   | Campo usado                     | Filtro aplicado                                                                                                                                                                         | Operación                                       | Fuente             |
| ------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------ |
| **Total ingresos**                    | `monto`                         | tipo = INGRESO, todos los períodos                                                                                                                                                      | Suma                                            | movimientos        |
| **Total egresos**                     | `monto`                         | tipo = EGRESO ó SALIDA ó PRESTAMO                                                                                                                                                       | Suma                                            | movimientos        |
| **Saldo neto**                        | Ingresos, Egresos               | —                                                                                                                                                                                       | Ingresos − Egresos                              | Calculado          |
| **Préstamos**                         | `monto`                         | tipo = PRESTAMO                                                                                                                                                                         | Suma                                            | movimientos        |
| **Capital aportado**                  | `monto`                         | tipo = INGRESO + grupo = T224/T006/T112/T124/T012/T024/ACCIONISTA/T106/T212/T018/T118/APORTACIONES/T000/T100/T324/T306/T200/T312/NIVEL 1/NIVEL 2/NIVEL 3 ó concepto contiene "aportaci" | Suma                                            | movimientos        |
| **Accionistas únicos**                | `nombre`                        | tipo = INGRESO + mismo filtro de grupo/concepto que capital aportado                                                                                                                    | Conteo de nombres distintos                     | movimientos        |
| **Precio promedio por accionista**    | Capital aportado, Accionistas   | —                                                                                                                                                                                       | Capital aportado / Accionistas únicos           | Calculado          |
| **% Levantamiento de capital**        | —                               | —                                                                                                                                                                                       | ⚠️ Siempre 0% — no existe meta capturada en BD  | —                  |
| **CXC**                               | `monto − montoPagado`           | tipo = POR_COBRAR, estado = PENDIENTE                                                                                                                                                   | Suma                                            | cuentas_pendientes |
| **CXP**                               | `monto − montoPagado`           | tipo = POR_PAGAR, estado = PENDIENTE                                                                                                                                                    | Suma                                            | cuentas_pendientes |
| **Flujo mensual**                     | `monto`                         | tipo = INGRESO / EGRESO/SALIDA/PRESTAMO, todos los períodos                                                                                                                             | Suma por mes+año                                | movimientos        |
| **Top accionistas**                   | `monto`                         | tipo = INGRESO + filtro grupo/concepto                                                                                                                                                  | Suma por nombre, top 10                         | movimientos        |
| **Tabla pivot accionista × concepto** | `monto`                         | tipo = INGRESO                                                                                                                                                                          | Suma por (nombre, concepto) — cruce en columnas | movimientos        |
| **Cuánto ya ingresó**                 | Capital aportado (ver arriba)   | —                                                                                                                                                                                       | Mismo valor                                     | Calculado          |
| **Cuánto falta por ingresar**         | —                               | —                                                                                                                                                                                       | ⚠️ Siempre 0 — no existe meta en BD             | —                  |
| **Cuánto ya gastó**                   | Total egresos (ver arriba)      | —                                                                                                                                                                                       | Mismo valor                                     | Calculado          |
| **Cuánto falta por gastar**           | —                               | —                                                                                                                                                                                       | ⚠️ Sin dato — no existe presupuesto en BD       | —                  |
| **Acciones colocadas**                | Accionistas únicos (ver arriba) | —                                                                                                                                                                                       | Mismo valor (proxy: nombres distintos)          | Calculado          |

---

## Dashboard General — Consolidado

| KPI                                  | Campo usado                             | Filtro aplicado                              | Operación                                                                       | Fuente                                                                                                                 |
| ------------------------------------ | --------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Total ingresos (3 empresas)**      | Ingresos de cada empresa                | Período                                      | Suma de las 3                                                                   | MIHBAH+YCDI: movimientos · BM CORP: comisionBmcorp + movimientos INGRESO                                               |
| **Total egresos (3 empresas)**       | Egresos de cada empresa                 | Período                                      | Suma de las 3                                                                   | movimientos (MIHBAH+YCDI) + repartos_bmcorp (BM CORP)                                                                  |
| **CXC consolidado**                  | CXC de cada empresa                     | —                                            | Suma de las 3                                                                   | MIHBAH: cuentas_pendientes · BM CORP: monto−enganche de ventas activas · YCDI: pagos_aportacion estado VENCIDA/PROXIMA |
| **CXP consolidado**                  | CXP de cada empresa                     | —                                            | Suma de las 3                                                                   | MIHBAH: cuentas_pendientes · BM CORP: comisionBmcorp de ventas activas · YCDI: 0                                       |
| **Correlación YCDI→MIHBAH**          | `montoPagado`                           | fechaPago en período                         | Suma de capital levantado en el período                                         | pagos_aportacion                                                                                                       |
| **Correlación BM→YCDI**              | `monto`                                 | fechaApertura en período, todas las ventas   | Suma de ventas BM (proxy de acciones YCDI)                                      | ventas_bmcorp                                                                                                          |
| **Correlación BM→MIHBAH**            | `comisionBmcorp`                        | fechaApertura en período                     | Suma de comisiones generadas (potencial flujo a obra)                           | ventas_bmcorp                                                                                                          |
| **MIHBAH estimado vs gastado**       | `monto`                                 | tipo = EGRESO/SALIDA/PRESTAMO                | Gastado = suma del mes · Estimado = promedio mensual del año hasta mes anterior | movimientos                                                                                                            |
| **% Avance MIHBAH**                  | Gastado, Estimado                       | —                                            | Gastado / Estimado × 100                                                        | Calculado                                                                                                              |
| **Ventas BM finalizadas**            | `monto`                                 | estado = FINALIZADA ó FINALIZADO_Y_LIQUIDADO | Suma                                                                            | ventas_bmcorp                                                                                                          |
| **Comisión generada BM (resumen)**   | `comisionBmcorp`                        | estado = FINALIZADA ó FINALIZADO_Y_LIQUIDADO | Suma                                                                            | ventas_bmcorp                                                                                                          |
| **Capital levantado YCDI (resumen)** | `montoPagado`                           | Sin filtro de estado                         | Suma histórica                                                                  | pagos_aportacion                                                                                                       |
| **Capital pendiente YCDI**           | Capital comprometido, Capital levantado | —                                            | MAX(0, comprometido − levantado)                                                | acuerdos_aportacion + pagos_aportacion                                                                                 |

---

## Módulos — Qué datos muestra cada uno

| Módulo               | Qué muestra                                                                                                                                                                          | Fuente                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **Flujo de Caja**    | Ingresos/Egresos/Neto/Acumulado por mes, trimestre o año histórico. BM CORP muestra semanas. Drill-down al hacer clic en un mes (lista de movimientos, máx 100).                     | movimientos / ventas_bmcorp / repartos_bmcorp |
| **Proyectos**        | MIHBAH/YCDI: lista de proyectos con ingresos, egresos y neto. Detalle: movimientos del proyecto (máx 200). BM CORP: lista de desarrollos con ventas, monto y comisiones.             | movimientos / ventas_bmcorp                   |
| **Cuentas**          | MIHBAH/YCDI: tabla CXC y CXP con saldo pendiente (monto − montoPagado) y días vencido. BM CORP: CXC = saldo sin cobrar por venta activa; CXP = comisión pendiente de pago al asesor. | cuentas_pendientes / ventas_bmcorp            |
| **Reportes**         | Lista cruda de movimientos para exportar. MIHBAH/YCDI: últimos 200 movimientos. BM CORP: todas las ventas con afiliado, desarrollo, comisión, enganche.                              | movimientos / ventas_bmcorp                   |
| **Cargas Excel**     | Historial de archivos cargados. Validación al importar: detecta duplicados por (fecha + monto + concepto + año + mes).                                                               | cargas / movimientos                          |
| **Monday (BM CORP)** | Botón de sincronización. Jala tablero definido en `MONDAY_BOARD_ID`. Idempotente: no duplica si se corre dos veces. Marca stale si no se sincroniza en 24h.                          | Monday API → ventas_bmcorp + repartos_bmcorp  |

---

## Cosas pendientes / sin dato en BD (para definir con cliente)

| Pendiente                           | Impacto                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| **Meta de capital YCDI**            | % levantamiento y "cuánto falta por ingresar" siempre son 0                        |
| **Presupuesto por proyecto MIHBAH** | "Cuánto debería haberme gastado" usa promedio histórico, no presupuesto real       |
| **Criterios semáforo BM CORP**      | Semáforo visual está puesto pero sin lógica — siempre neutro                       |
| **Comisión BM CORP variable**       | Hoy siempre es 15%. Si la tasa cambia por venta, no se puede capturar desde Monday |
| **Faltante por gastar YCDI**        | Sin presupuesto capturado, no se puede calcular                                    |
