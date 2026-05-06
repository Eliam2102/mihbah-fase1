# Fórmulas SIG Jade — Revisión Contable

> Inventario completo de todos los KPIs, cálculos y reglas del sistema.
> Versión: 1.0 · Fecha: 2026-05-05

**Cómo usar:** revisar cada fórmula. Marcar ✅ correcto · ⚠️ ajustar · ❌ eliminar · ➕ agregar.

---

## Fuentes de datos

| Fuente                                         | Contenido                     | Cómo entra                |
| ---------------------------------------------- | ----------------------------- | ------------------------- |
| **movimientos**                                | Ingresos/egresos diarios      | Excel masivo              |
| **cuentas_pendientes**                         | CXC/CXP                       | Excel                     |
| **acuerdos_aportacion** + **pagos_aportacion** | Capital YCDI                  | Pendiente captura         |
| **ventas_bmcorp**                              | Ventas BM CORP                | Sync Monday               |
| **repartos_bmcorp**                            | Repartos + comisiones pagadas | Pendiente columnas Monday |

## Catálogo — Tipos de movimiento

| Tipo                   | Significado actual | Suma a               |
| ---------------------- | ------------------ | -------------------- |
| `INGRESO`              | Entrada de dinero  | Ingresos             |
| `EGRESO` / `SALIDA`    | Salida definitiva  | Egresos              |
| `PRESTAMO`             | Préstamo otorgado  | Egresos              |
| `INTERNO` / `TRASPASO` | Movimiento interno | **Ignorado en KPIs** |

## Catálogo — Estados venta BM CORP

| Estado Monday                                       | Cuenta como       | Notas                    |
| --------------------------------------------------- | ----------------- | ------------------------ |
| EN_PROCESO, APROBADO_VENTAS, ESPERANDO_AUTORIZACION | En proceso        | Pendiente cierre         |
| APROBADO_JURIDICO, LIBERADO                         | Aprobado jurídico | Cerca de finalizar       |
| FINALIZADA, FINALIZADO_Y_LIQUIDADO                  | Finalizada        | Venta firme              |
| RECHAZADO, CANCELADA                                | Cancelada         | Excluida de KPIs activos |

---

# 1. MIHBAH (Constructora)

| #   | KPI                     | Fórmula                                                                       | Validar                         |
| --- | ----------------------- | ----------------------------------------------------------------------------- | ------------------------------- |
| 1.1 | **Ingresos periodo**    | SUM(monto) WHERE tipo=INGRESO AND empresa=MIHBAH AND fecha∈periodo            | ¿INTERNO/PRESTAMO cuentan?      |
| 1.2 | **Egresos periodo**     | SUM(monto) WHERE tipo∈(EGRESO,SALIDA,PRESTAMO)                                | ¿PRESTAMO es egreso definitivo? |
| 1.3 | **Neto**                | Ingresos − Egresos                                                            | ¿IVA descontado? Hoy bruto      |
| 1.4 | **CXC**                 | SUM(monto) FROM cuentas_pendientes WHERE tipo=POR_COBRAR AND estado=PENDIENTE | ¿Vencidas excluir?              |
| 1.5 | **CXP**                 | SUM(monto) WHERE tipo=POR_PAGAR AND estado=PENDIENTE                          | Idem                            |
| 1.6 | **Avance por proyecto** | SUM(monto) movimientos EGRESO/SALIDA agrupados por proyecto                   | Periodo: año actual             |
| 1.7 | **Flujo mensual**       | KPIs 1.1 y 1.2 agrupados por mes                                              | —                               |

## 1.8 Semáforo de salud MIHBAH

```
colchón = neto / egresos
  ≥ 0.30  → SALUDABLE
  ≥ 0.10  → PRECAUCIÓN
  ≥ 0     → EN RIESGO
  < 0     → CRÍTICO

Override CRÍTICO: si CXP/Ingresos > 0.80 Y neto < 0 → CRÍTICO directo
```

**Validar:** ¿estos umbrales 30%/10%/0% son los correctos para MIHBAH?

---

# 2. YCDI (Capital)

| #    | KPI                               | Fórmula                                                      | Validar                              |
| ---- | --------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| 2.1  | **Total ingresos**                | SUM(monto) WHERE tipo=INGRESO AND empresa=YCDI               | —                                    |
| 2.2  | **Total egresos**                 | SUM(monto) WHERE tipo=SALIDA                                 | ¿YCDI tiene egresos legítimos?       |
| 2.3  | **Saldo**                         | Ingresos − Egresos                                           | —                                    |
| 2.4  | **Préstamos**                     | SUM(monto) WHERE tipo=PRESTAMO                               | —                                    |
| 2.5  | **Capital aportado**              | SUM(monto) WHERE tipo=INGRESO AND concepto LIKE '%aportaci%' | ⚠️ heurística por palabra "aportaci" |
| 2.6  | **Acuerdos activos**              | COUNT(DISTINCT nombre) con concepto "aportación"             | Aprox por accionista único           |
| 2.7  | **% Levantamiento**               | (Ingresos / (Ingresos + max(0, −saldo))) × 100               | ⚠️ heurística — sin meta real        |
| 2.8  | **Top 15 accionistas**            | SUM(monto) por nombre WHERE concepto LIKE '%aportaci%'       | —                                    |
| 2.9  | **Tabla conceptos × accionistas** | Pivot: monto por (nombre × concepto) tipo INGRESO            | Top 20 accionistas                   |
| 2.10 | **Flujo mensual YCDI**            | INGRESO vs SALIDA agrupado por (anio, mes)                   | —                                    |

**Validaciones críticas YCDI:**

- "Aportación" se detecta buscando texto en `concepto`. ¿Hay otros textos ("APO.", "capital", etc.)?
- "Acuerdos activos" cuenta accionistas únicos, no acuerdos firmados reales.
- "% levantamiento" no tiene meta real — fórmula es proxy. ¿Cuál es la meta del periodo?

---

# 3. BM CORP (Comercial)

## 3.1 Dashboard

| #      | KPI                            | Fórmula                                                                       | Validar                |
| ------ | ------------------------------ | ----------------------------------------------------------------------------- | ---------------------- |
| 3.1.1  | **Total vendido**              | SUM(monto) FROM ventas_bmcorp WHERE estado∉(RECHAZADO,CANCELADA)              | ¿Excluir EN_PROCESO?   |
| 3.1.2  | **En proceso**                 | COUNT/SUM ventas con estado EN_PROCESO/APROBADO_VENTAS/ESPERANDO_AUTORIZACION | —                      |
| 3.1.3  | **Aprobado jurídico**          | Estados APROBADO_JURIDICO + LIBERADO                                          | —                      |
| 3.1.4  | **Finalizadas**                | Estados FINALIZADA + FINALIZADO_Y_LIQUIDADO                                   | —                      |
| 3.1.5  | **Cancelado/Rechazado**        | Estados CANCELADA + RECHAZADO                                                 | —                      |
| 3.1.6  | **Top 10 alianzas**            | SUM(monto) agrupado por afiliado                                              | Una alianza por venta  |
| 3.1.7  | **Top 10 desarrollos**         | SUM(monto) agrupado por desarrollo                                            | —                      |
| 3.1.8  | **Comisión generada**          | SUM(comisionBmcorp) — calculado por venta como `monto × 0.15`                 | ¿Siempre 15%?          |
| 3.1.9  | **Comisionamiento conciliado** | Pagado / Generado × 100                                                       | Ver fórmulas derivadas |
| 3.1.10 | **Repartos split**             | SUM(monto) agrupado por estado (PAGADO/PARCIAL/PENDIENTE)                     | Pendiente data Monday  |
| 3.1.11 | **Remanentes**                 | Vendido por afiliado − Repartos pagados al afiliado                           | —                      |
| 3.1.12 | **Flujo semanal dashboard**    | Ingresos: SUM(monto) por semana de fechaCierre · Egresos: SUM(repartos.monto) | Última 12 semanas      |

## 3.2 Submódulo Flujo de Caja BM CORP

| KPI                    | Fórmula                                         |
| ---------------------- | ----------------------------------------------- |
| **Ingresos semanales** | SUM(monto) ventas WHERE fechaApertura IN semana |
| **Egresos semanales**  | SUM(monto) repartos WHERE fecha IN semana       |
| **Neto semanal**       | Ingresos − Egresos                              |
| **Acumulado**          | Suma corrida de neto desde primera semana       |

**Validar:** ¿"ingreso" en flujo BM = monto total de venta o solo comisión 15%?

## 3.3 Submódulo Cuentas BM CORP

| KPI                    | Fórmula                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| **CXC (cliente debe)** | Por cada venta no FINALIZADA/CANCELADA: `saldo = monto − enganche`             |
| **CXP asesores**       | Por cada venta activa: `comisionTotal = comisionBmcorp` (asume todo pendiente) |

**Validar:**

- CXC se calcula como `monto − enganche`. ¿Correcto? ¿O hay otras parcialidades?
- Asume que comisión asesor = comisión BM CORP completa. ¿O asesor recibe solo parte?

## 3.4 Submódulo Proyectos BM CORP

Por cada desarrollo:

| Métrica            | Fórmula                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| Ventas en proceso  | COUNT estados EN_PROCESO/APROBADO_VENTAS/ESPERANDO/APROBADO_JURIDICO/LIBERADO |
| Ventas finalizadas | COUNT estados FINALIZADA/FINALIZADO_Y_LIQUIDADO                               |
| Ventas total       | COUNT todas                                                                   |
| Monto total        | SUM(monto) todas las ventas                                                   |
| Comisiones total   | SUM(comisionBmcorp) todas                                                     |

## 3.5 Submódulo Reportes BM CORP

Listado plano de ventas con: cliente, afiliado, desarrollo, asesor, monto, enganche, comisión, estado, fechas, lote, paquete.

---

# 4. Dashboard General (Consolidado)

| #   | KPI                     | Fórmula                                             |
| --- | ----------------------- | --------------------------------------------------- |
| 4.1 | **Total ingresos**      | Σ ingresos de las 3 empresas (KPIs 1.1 + 2.1 + 3.x) |
| 4.2 | **Total egresos**       | Σ egresos de las 3 empresas                         |
| 4.3 | **Total CXC**           | Σ CXC empresas + capital pendiente YCDI             |
| 4.4 | **Total CXP**           | Σ CXP empresas (YCDI = 0)                           |
| 4.5 | **Resumen por empresa** | Cards con ingresos/egresos/neto/CXC por empresa     |

## 4.6 Correlación entre empresas (3 flujos narrativos)

| Flujo                | Fórmula                                     |
| -------------------- | ------------------------------------------- |
| **YCDI → MIHBAH**    | SUM(pagosAportacion.montoPagado) en periodo |
| **BM CORP → YCDI**   | SUM(ventasBmcorp.monto) en periodo          |
| **BM CORP → MIHBAH** | SUM(ventasBmcorp.comisionBmcorp) en periodo |

**Validar:** ¿correlación correcta? Hoy es interpretación nuestra, no transferencias bancarias reales.

## 4.7 MIHBAH Estimado vs Avance del mes

```
gastado_mes  = SUM(egresos MIHBAH del mes)
estimado_mes = SUM(egresos enero a mes_anterior) / (mes_actual − 1)
% avance     = gastado / estimado × 100
```

Color del avance:

- ≤80% → verde
- 81-100% → ámbar
- > 100% → rojo (sobre-estimado)

**Validar crítico:** "estimado" hoy es promedio histórico. **NO es presupuesto real.** ¿Tienen presupuesto en otro lado?

## 4.8 Resumen del resumen (BM CORP ↔ YCDI)

| Cifra                   | Fórmula                                                      |
| ----------------------- | ------------------------------------------------------------ |
| Ventas BM finalizadas   | SUM(monto) WHERE estado∈(FINALIZADA, FINALIZADO_Y_LIQUIDADO) |
| Comisión generada (15%) | SUM(comisionBmcorp) idem                                     |
| Capital levantado YCDI  | SUM(pagosAportacion.montoPagado)                             |
| Capital pendiente YCDI  | SUM(acuerdos.montoTotal) − Capital levantado                 |

---

# 5. Fórmulas derivadas (calculadas, no almacenadas)

## 5.1 Enganche BM CORP

Monday tiene 3 columnas con nombre similar:

- `Porcentaje de enganche` (numbers, %) → ejemplo: `16`, `10`, `3.294`
- `ENGANCHE` (formula `Porcentaje × Monto`) → API regresa **vacío** (Monday no calcula formulas en API)
- `ENGANCHE` (status) → POR LIQUIDAR/LIQUIDADO/EN RASTREO

**Fórmula del sistema:**

```
enganche = monto_total × porcentaje_enganche / 100
```

**Ejemplo real:**

- Sandra Yisela · monto $240,000 · % 10 → enganche **$24,000**
- Erika Medina · monto $151,800 · % 3.294 → enganche **$5,000.29**
- Celene Chávez · monto $167,321 · % 16 → enganche **$26,771**

**Validar:** confirmar que esta fórmula representa el enganche que cobran al cliente.

## 5.2 Comisión BM CORP

Monday tiene columna `Monto 15%` con formula `Monto × 0.15`. La API también devuelve **vacío**.

**Fórmula del sistema (fallback):**

```
comision_bmcorp = monto_total × 0.15
```

Si Monday llegara a devolver el valor calculado, se usa ese. Si no, se calcula con × 0.15.

**Ejemplo:** venta $240,000 → comisión BM CORP **$36,000**

**Validar crítico:**

- ¿Siempre es 15%?
- ¿Se aplica antes o después de descuentos / promociones (PROMO)?
- ¿La comisión que se PAGA al asesor es ese 15% completo o un subconjunto?

---

# 6. Procesamiento de Excel

## 6.1 Detección de columnas

Sistema reconoce variantes de nombres (case-insensitive, sin acentos):

| Campo SIG Jade | Aliases aceptados                  |
| -------------- | ---------------------------------- |
| anio           | año, anio, ano, year               |
| mes            | mes, month                         |
| fecha          | fecha, date                        |
| tipo           | tipo, type                         |
| categoria      | categoria, categoría, category     |
| grupo          | grupo, group                       |
| nombre         | nombre, name                       |
| concepto       | concepto, descripcion, description |
| monto          | monto, importe, cantidad, amount   |
| cuenta         | cuenta, banco, bank                |
| proyecto       | proyecto, obra, project            |
| comentarios    | comentarios, observaciones, notas  |

## 6.2 Validación por fila (Zod)

| Campo    | Regla                                 |
| -------- | ------------------------------------- |
| anio     | Entero · ≥2020 y ≤2030                |
| mes      | Entero · 1-12                         |
| fecha    | Fecha válida                          |
| tipo     | Enum: INGRESO/SALIDA/INTERNO/PRESTAMO |
| monto    | Número positivo                       |
| concepto | No vacío                              |

**Reglas cruzadas:**

- `fecha.year() = anio` (caso contrario rechaza fila)
- `fecha.month() = mes` (idem)

## 6.3 Detección de duplicados

Una fila se considera duplicada si ya existe en BD un registro con:

```
mismo (empresa + fecha + monto + concepto + año + mes)
```

Filas duplicadas se omiten (no se importan ni rechazan — quedan flagged).

## 6.4 Importación atómica

- Wrap en `db.transaction`
- Crea registro en `excel_uploads` con totales (filas, válidas, error, duplicadas, importadas)
- Inserta filas válidas en `movimientos` con `uploadId` FK
- Si falla cualquier fila → rollback total
- Estado final: `COMPLETADO` o `ERROR`

---

# 7. Sincronización Monday

## 7.1 Mapeo Monday → DB

| Columna Monday                          | ID Monday          | Campo DB                       |
| --------------------------------------- | ------------------ | ------------------------------ |
| Name (item title)                       | name               | cliente                        |
| Afiliado                                | n_mero_de_lote     | afiliadoId (lookup por nombre) |
| Desarrollo                              | desarrollo         | desarrolloId (lookup)          |
| Desarrolladora                          | desarrolladora     | desarrolladora                 |
| ASESOR (texto)                          | texto2             | asesor                         |
| Monto total                             | n_meros            | monto                          |
| Porcentaje de enganche                  | n_meros4           | (calcula enganche, ver 5.1)    |
| Estado de venta                         | estado_1           | estadoVenta (mapeado al enum)  |
| Financiamiento                          | estado_14          | financiamiento                 |
| Paquete accion                          | color_mkv1cg83     | paqueteAccion                  |
| Lote/Acciones                           | n_meros8           | loteAcciones                   |
| OPERATIVO AP                            | color              | operativoApertura              |
| OPERATIVO CIERRE                        | color2             | operativoCierre                |
| Monto 15%                               | f_rmula8           | (calcula comisión, ver 5.2)    |
| Fecha de apertura                       | date               | fechaApertura                  |
| Fecha de cierre                         | fecha              | fechaCierre                    |
| Teléfono                                | tel_fono           | telefono                       |
| Correo electrónico                      | correo_electr_nico | correo                         |
| Nacionalidad                            | pa_s5              | nacionalidad                   |
| Residencia                              | pa_s0              | residencia                     |
| Sexo                                    | estado10           | sexo                           |
| Fecha de nacimiento                     | fecha7             | fechaNacimiento                |
| Grupo Monday (ej. PROCESO, FINALIZADAS) | —                  | pipelineGroup                  |

**Pendientes (cliente debe agregar):** ver `docs/MONDAY_COLUMNAS_REQUERIDAS.md`

- Reparto Pagado, Fecha Reparto, Monto Reparto
- Comisión Asesor Pagada, Fecha Comisión Asesor, Monto Comisión Asesor

## 7.2 Idempotencia

Sync se puede correr N veces sin duplicar:

- `ventas_bmcorp` única por `(tenant_id, monday_item_id)`
- `repartos_bmcorp` única por `(tenant_id, monday_item_id, tipo)` (cada venta puede tener 1 reparto + 1 comisión)
- Si existe → UPDATE · si no → INSERT

## 7.3 Mapeo de estados

| Monday                     | Sistema                |
| -------------------------- | ---------------------- |
| en proceso                 | EN_PROCESO             |
| aprobado ventas            | APROBADO_VENTAS        |
| esperando autorización     | ESPERANDO_AUTORIZACION |
| aprobado juridico, vendido | APROBADO_JURIDICO      |
| liberado                   | LIBERADO               |
| finalizado                 | FINALIZADA             |
| finalizado y liquidado     | FINALIZADO_Y_LIQUIDADO |
| rechazado                  | RECHAZADO              |
| cancelado/cancelada        | CANCELADA              |

---

# 8. Validaciones críticas para el contador

| #   | Pregunta                                                                             | Respuesta |
| --- | ------------------------------------------------------------------------------------ | --------- |
| 1   | ¿INTERNO/TRASPASO cuentan como ingreso o egreso? Hoy se ignoran                      |           |
| 2   | ¿PRESTAMO es egreso definitivo o reversible?                                         |           |
| 3   | ¿IVA se descuenta? Hoy todo es bruto                                                 |           |
| 4   | ¿Comisión BM CORP es 15% siempre o varía?                                            |           |
| 5   | ¿Comisión que paga BM al asesor = 15% completo o porcentaje menor?                   |           |
| 6   | ¿"Aportación" en YCDI se detecta solo por texto en concepto, o hay otros marcadores? |           |
| 7   | ¿Meta de levantamiento YCDI cuál es y de dónde la sacamos?                           |           |
| 8   | ¿Presupuesto MIHBAH existe en algún lado o lo capturamos?                            |           |
| 9   | ¿Umbrales semáforo MIHBAH 30/10/0% son correctos?                                    |           |
| 10  | ¿Una venta cancelada cuenta en "total vendido" o no?                                 |           |
| 11  | CXC BM CORP = monto − enganche. ¿Hay otras parcialidades?                            |           |
| 12  | ¿CXC vencidas se restan del CXC sano o suman?                                        |           |
| 13  | ¿Año fiscal = año calendario?                                                        |           |
| 14  | ¿Cierre mensual = último día calendario o último día hábil?                          |           |
| 15  | Correlación 4.6 (YCDI→MIHBAH, BM→YCDI, BM→MIHBAH): ¿es la que necesitan?             |           |
| 16  | "Ingreso" para BM CORP en flujo: ¿monto venta o solo comisión 15%?                   |           |
| 17  | "Acuerdos activos" YCDI cuenta accionistas únicos, no acuerdos firmados. ¿OK?        |           |
| 18  | ¿Falta algún KPI no listado aquí?                                                    |           |

---

**Versión 1.0** · Si algo no coincide, marcar la fila correspondiente y discutir con equipo SIG Jade. Cambios de fórmula se aplican en pocas horas.
