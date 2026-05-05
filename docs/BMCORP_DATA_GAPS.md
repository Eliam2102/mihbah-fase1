# BM CORP — Huecos de datos y plan de cobertura

> Documento técnico-funcional sobre datos que el módulo BM CORP necesita
> pero **no existen aún** en su fuente Monday "Seguimiento General".
> Última actualización: 2026-05-05.

---

## 1. Resumen del problema

El tablero Monday **"Seguimiento General"** (board ID `3017199126`)
contiene la información de las **ventas** que BM CORP gestiona.

Tiene 50 items, 7 grupos (etapas pipeline), 63 columnas. Cubre:

- ✅ Cliente, alianza/afiliado, desarrollo, asesor
- ✅ Monto total de venta, financiamiento, enganche
- ✅ Estado de venta + estados administrativos (PROMO, DOCUMENTACIÓN, CONTRATO, etc.)
- ✅ Comisión BM CORP **calculada** (`Monto 15%` formula)

**Lo que NO contiene:**

| Dato necesario para SIG Jade               | ¿Existe en Monday hoy? | Notas                                |
| ------------------------------------------ | ---------------------- | ------------------------------------ |
| Reparto **pagado** a la alianza            | ❌                     | No hay columna ni board separado     |
| Comisión **pagada** al asesor              | ❌                     | Solo existe la comisión calculada    |
| Fecha de pago de reparto                   | ❌                     | —                                    |
| Fecha de pago de comisión                  | ❌                     | —                                    |
| Mensualidades pagadas por el cliente (CXC) | ⚠️ Parcial             | Vive en CRM externo (mirror columns) |

---

## 2. Impacto en el dashboard / módulos

Los siguientes KPIs y submódulos quedan **en cero o vacíos** hasta que
exista una fuente de datos para repartos y comisiones pagadas:

### Dashboard BM CORP

| KPI                        | Estado                             | Razón                               |
| -------------------------- | ---------------------------------- | ----------------------------------- |
| Total vendido              | ✅ Funciona                        | Suma `monto` de ventas              |
| Top alianzas               | ✅ Funciona                        | —                                   |
| Top desarrollos            | ✅ Funciona                        | —                                   |
| Repartos realizados        | 🟡 0 hardcoded                     | Sin fuente                          |
| Repartos pendientes        | 🟡 0 hardcoded                     | Sin fuente                          |
| Remanentes por afiliado    | 🟡 = vendido (sin restar repartos) | Sin fuente                          |
| Flujo semanal — ingresos   | ✅ Funciona                        | `fechaCierre` de ventas             |
| Flujo semanal — egresos    | 🟡 0                               | Egreso = reparto pagado, sin fuente |
| Comisionamiento conciliado | 🟡 No implementado                 | —                                   |

### Submódulos BM CORP

| Submódulo                                             | Estado                                               |
| ----------------------------------------------------- | ---------------------------------------------------- |
| Dashboard                                             | ✅ Construido (con KPIs en 0 donde falta dato)       |
| Sincronización Monday                                 | ✅ Construido y funcional                            |
| Flujo de Caja                                         | 🔴 No construido — bloqueado por falta de egresos    |
| Proyectos                                             | 🟢 Construible hoy con ventas (no necesita repartos) |
| Cuentas (CXC mensualidades + CXP comisiones/repartos) | 🔴 Sin fuente                                        |
| Reportes                                              | 🔴 Bloqueado por flujo + cuentas                     |

---

## 3. Decisión tomada (2026-05-05, actualizada)

**Opción elegida final:** **A — Cliente agrega columnas en Monday "Seguimiento General".**

**Razones del cambio:**

1. Excels paralelos generan más fragmentación, no menos.
2. Cliente prefiere homologar y centralizar en Monday (su fuente de verdad).
3. Fase 1 = solo lectura, pero arquitectura debe quedar lista para Fase 2.
4. SIG Jade NO calcula comisiones — el cliente entrega el resultado pagado.

**Solicitud al cliente:** ver `docs/MONDAY_COLUMNAS_REQUERIDAS.md` para el
documento que se le envía.

**Comportamiento actual del código:**

- Schema `repartos_bmcorp` extendido con `ventaId`, `tipo`, `estado`,
  `mondayItemId`, `afiliadoId`
- Mapper `lib/monday/mappers.ts` ya espera 6 columnas Monday por título
  (case-insensitive). Si no existen → `mapped.pagos = []` → no-op
- Sync `lib/services/monday.service.ts` llama `syncPagos()` que upserts
  `repartos_bmcorp` por `(tenant, monday_item_id, tipo)` — idempotente
- Cuando cliente agregue las columnas, basta correr "Sincronizar ahora" y
  los KPIs se llenan sin tocar más código

---

## 4. Plan de cobertura (cuando cliente decida)

Tres opciones se han presentado al cliente. Cualquiera que elija:

### Opción A — Agregar columnas en Monday "Seguimiento General"

Cliente agrega 6 columnas nuevas:

| Columna                | Tipo Monday | Valores                      |
| ---------------------- | ----------- | ---------------------------- |
| Reparto pagado         | status      | PENDIENTE / PAGADO / PARCIAL |
| Fecha reparto          | date        | —                            |
| Monto reparto          | numbers     | —                            |
| Comisión asesor pagada | status      | PENDIENTE / PAGADO / PARCIAL |
| Fecha comisión         | date        | —                            |
| Monto comisión asesor  | numbers     | —                            |

**Cambios en código requeridos:**

- `lib/monday/mappers.ts` — agregar lectura de las 6 columnas nuevas
- `lib/services/monday.service.ts` — al sincronizar, insertar en `repartos_bmcorp` cuando `Reparto pagado === 'PAGADO'`
- `lib/services/dashboard-bmcorp.service.ts` — `getRepartosKpi`, `getRemanentes`, `getFlujoSemanal` automáticamente reflejan datos
- Migración: agregar tabla `comisiones_pagadas_bmcorp` (similar a `repartos_bmcorp`)

### Opción B — Tablero Monday "Pagos BM CORP" separado

Cliente crea un segundo board con items: `beneficiario`, `monto`, `fecha`,
`tipo` (REPARTO/COMISIÓN), `venta_id_referencia`.

**Cambios en código:**

- Soporte multi-board en `monday.service.ts` (env `MONDAY_BOARD_IDS=csv` o tabla `monday_board_configs`)
- Mapper específico para el board de pagos
- Resto igual que Opción A

### Opción C — Carga Excel temporal

Reusar Épica 4 (Cargas Excel). Plantilla `bmcorp-repartos-template.xlsx` con
columnas: AÑO, MES, FECHA, BENEFICIARIO, TIPO (REPARTO|COMISION), MONTO,
VENTA_REFERENCIA, COMENTARIOS.

**Cambios en código:**

- Habilitar módulo "Cargas Excel" para BM CORP en `lib/modules.ts`
- Adaptador en `lib/services/excel.service.ts` para insertar en `repartos_bmcorp` cuando empresa es BM CORP
- Plantilla en `public/templates/bmcorp-repartos-template.xlsx`

---

## 5. Puntos de inserción en el código (TODOs)

Cuando se implemente la solución, estos son los lugares que hay que tocar:

```
lib/services/dashboard-bmcorp.service.ts
  ├─ getRepartosKpi()        → ya consulta repartos_bmcorp; basta poblarla
  ├─ getRemanentesPorAfiliado() → ya cruza ventas vs repartos
  └─ getFlujoSemanal()       → ya suma egresos desde repartos_bmcorp

lib/services/monday.service.ts
  └─ syncBoard() → agregar bloque que inserte/upsert repartos_bmcorp
                   tras procesar ventas_bmcorp (si Opción A o B)

lib/monday/mappers.ts
  └─ mapItemToVenta() → ya mapea Monto 15% como comisionBmcorp;
                        agregar lectura de reparto pagado / comisión pagada

components/dashboard/bmcorp-flujo-semanal.tsx
  └─ Ya soporta egresos en el chart; solo se llenan cuando haya datos

app/(app)/empresa/[empresaId]/cargas/  (Opción C)
  └─ Habilitar para BM CORP en lib/modules.ts y agregar template
```

Buscar `// TODO(BMCORP_DATA_GAP)` en el código para encontrar los puntos
exactos.

---

## 6. Validación end-to-end con datos parciales

Estado del 2026-05-05 con respuestas del cliente integradas:

1. ✅ Schema actualizado: `ventasBmcorp` con 11 columnas nuevas
2. ✅ Enum `estadoVentaEnum` extendido a 9 valores (matchea Monday)
3. ✅ Mapper Monday → DB usa IDs reales de columnas
4. ✅ Sync idempotente por `(tenant_id, monday_item_id)`
5. ✅ Dashboard renderiza con KPIs ventas reales y KPIs repartos en 0
6. ✅ Sidebar BM CORP: Dashboard + Sincronización Monday (resto pendiente)
7. ❌ Flujo de Caja, Proyectos, Cuentas, Reportes — pendientes
8. ❌ Tests automatizados de aislamiento BM CORP — pendientes

---

## 7. Próxima decisión que necesita cliente

Para desbloquear los KPIs en 0, el cliente debe responder:

1. ¿Acepta agregar columnas en Monday (Opción A) o prefiere board separado (B)?
2. ¿Cuándo puede definir el workflow de captura de repartos/comisiones pagadas?
3. ¿Quién captura esos pagos? (tesorería / contabilidad / dirección)
4. ¿Frecuencia de captura? (diaria / semanal / al cierre)

Mientras se decide, el módulo queda funcional con KPIs ventas reales
y placeholders en 0 para repartos/comisiones.
