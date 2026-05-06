# Épica 9 — Dashboard General (Consolidado)

> Estado: **Cerrada estructuralmente al 100%**
> Activación final: depende de datos reales en las 3 empresas
> Fecha: 2026-05-05

---

## Alcance entregado

### 1. Servicio — `lib/services/dashboard-general.service.ts` (nuevo)

Separado del per-empresa service para mantener responsabilidades claras.

| Función                                          | Descripción                                                                                        | Cuadra con                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `getResumenGeneral(tenantId, periodo)`           | KPIs consolidados — itera empresas y aplica fórmula según `tipo`                                   | `getKpisMihbah` + `getKpisYcdi` + `getKpisBmcorp`            |
| `getCorrelacionEmpresas(tenantId, periodo)`      | Flujos narrativos: YCDI→MIHBAH (capital→obra), BM→YCDI (ventas→capital), BM→MIHBAH (comisión→obra) | Datos directos de cada tabla                                 |
| `getCuentasConsolidado(tenantId)`                | CXC/CXP por empresa + totales + vencidas                                                           | `cuentas_pendientes` (MIHBAH/BM) + `pagos_aportacion` (YCDI) |
| `getMihbahEstimadoVsAvance(tenantId, anio, mes)` | Gastado mes vs promedio mensual histórico del año                                                  | `movimientos` MIHBAH                                         |
| `getResumenDelResumen(tenantId)`                 | BM CORP ↔ YCDI · ventas finalizadas + comisión + capital + hipótesis narrativa                     | `ventas_bmcorp` + `pagos_aportacion` + `acuerdos_aportacion` |

**Patrón:** todas envuelven `db.transaction()` + `setTenant()` para que RLS aplique.

### 2. Componentes UI

| Componente            | Archivo                                         | Notas                                                                                                                                                                       |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EmpresaResumenCard`  | `components/dashboard/empresa-resumen-card.tsx` | Card por empresa con icono+color por tipo (CONSTRUCTORA jade · CAPITAL azul · COMERCIAL morado), 4 KPIs, link al dashboard de la empresa, badge "datos parciales" si aplica |
| `CorrelacionEmpresas` | `components/dashboard/correlacion-empresas.tsx` | Cards conectados con flecha + monto + concepto. Más legible que Sankey para 3 empresas y 3 flujos.                                                                          |

### 3. Página `/dashboard` consolidado

`app/(app)/dashboard/page.tsx` reescrito:

```
┌────────────────────────────────────────────────────────┐
│  Header: Universo Jade · periodo                       │
├────────────────────────────────────────────────────────┤
│  4 KPIs consolidados (sin Margen)                      │
│  Ingresos · Egresos · CXC · CXP                        │
├────────────────────────────────────────────────────────┤
│  Cards por empresa (3 columnas)                        │
│  MIHBAH · YCDI · BM CORP                               │
├────────────────────────────────────────────────────────┤
│  Correlación entre empresas (cards con flecha)         │
├────────────────────────────────────────────────────────┤
│  MIHBAH estimado vs avance del mes (barra progreso)    │
├────────────────────────────────────────────────────────┤
│  Resumen del resumen — BM ↔ YCDI                       │
│  + hipótesis narrativa                                 │
├────────────────────────────────────────────────────────┤
│  Cuentas consolidado — detalle (2 tablas CXC + CXP)    │
└────────────────────────────────────────────────────────┘
```

**Sin "Margen"** — decisión cliente del CLAUDE.md.

### 4. Soporta `searchParams` para filtros

`?anio=2026&mes=5` → todos los queries respetan el periodo. Default: año actual,
acumulado.

---

## Verificación de números

Los totales del Dashboard General **deben cuadrar** con la suma de los dashboards
individuales:

| KPI             | Cómo se calcula                                                     | Cuadra con             |
| --------------- | ------------------------------------------------------------------- | ---------------------- |
| `totalIngresos` | Σ `ingresos` de las 3 empresas                                      | Suma de cada dashboard |
| `totalEgresos`  | Σ `egresos` de las 3 empresas                                       | Suma de cada dashboard |
| `totalCxc`      | Σ CXC de cuentas_pendientes (MIHBAH/BM) + saldo aportaciones (YCDI) | Cada dashboard CXC     |
| `totalCxp`      | Σ CXP de cuentas_pendientes (MIHBAH/BM)                             | Cada dashboard CXP     |

**Nota:** YCDI no tiene CXP (es captación), por eso `cxp` siempre 0 ahí.

### Cómo probar

```bash
npm run dev
# Login: admin@universojade.com / Admin12345!
# Topbar → "TODAS" (vista consolidada)
# URL: /dashboard
# Verificar:
#   - 4 KPIs consolidados con suma de las 3 empresas
#   - 3 cards (MIHBAH, YCDI, BM CORP) → click va al dashboard individual
#   - Correlación: 3 flujos visibles
#   - MIHBAH avance: % con barra de progreso (verde/amarillo/rojo)
#   - Resumen del resumen: 4 cifras + hipótesis
#   - Cuentas detalle: 2 tablas con totales

# Validar suma:
# Ir a /empresa/[mihbah-id]/dashboard → anotar ingresos
# Ir a /empresa/[ycdi-id]/dashboard → anotar ingresos
# Ir a /empresa/[bm-corp-id]/dashboard → anotar ingresos
# Suma = totalIngresos del dashboard general
```

---

## Reglas de cálculo por tipo de empresa

Cada empresa entra al consolidado con fórmula distinta:

### CONSTRUCTORA (MIHBAH)

- `ingresos`: SUM `movimientos.monto` WHERE `tipo='INGRESO'` en periodo
- `egresos`: SUM `movimientos.monto` WHERE `tipo IN ('EGRESO','SALIDA','PRESTAMO')` en periodo
- `cxc`: SUM `cuentas_pendientes.monto` WHERE `tipo='POR_COBRAR' AND estado='PENDIENTE'`
- `cxp`: SUM `cuentas_pendientes.monto` WHERE `tipo='POR_PAGAR' AND estado='PENDIENTE'`

### CAPITAL (YCDI)

- `ingresos`: SUM `pagos_aportacion.montoPagado` WHERE `fecha_pago` en periodo
- `egresos`: 0 (YCDI capta, no gasta)
- `cxc`: SUM `montoEsperado − montoPagado` WHERE `estado IN ('VENCIDA','PROXIMA')`
- `cxp`: 0

### COMERCIAL (BM CORP)

- `ingresos`: SUM `ventas_bmcorp.comisionBmcorp` (15% del monto vendido) en periodo
- `egresos`: 0 (sin fuente — pendiente columnas Monday cliente)
- `cxc`: 0
- `cxp`: 0
- **`parcial: true`** — UI marca con badge "datos parciales"

---

## Dependencias externas

### BM CORP datos parciales

Ver `docs/MONDAY_COLUMNAS_REQUERIDAS.md` y `docs/EPICA_8_DASHBOARD_BMCORP.md`.
Cuando cliente agregue columnas Monday y haga sync, los `egresos` y `cxp` de BM
se llenan automáticamente — no requiere tocar este service.

### Estimado MIHBAH (Fase 2)

Hoy `estimadoMes` se calcula como **promedio histórico** del año. Cuando se
implemente captura de presupuesto por proyecto/mes (Fase 2), reemplazar con
SUM del presupuesto del mes.

### Hipótesis correlación BM ↔ YCDI

Hoy es narrativa textual generada del lado del servidor. Para correlación
exacta (ej. "X% de las ventas BM son acciones YCDI"), necesitamos:

- Campo `ventas_bmcorp.es_accion_ycdi` (boolean) o
- Tabla `desarrollos.empresa_propietaria` que linkee desarrollos a YCDI

Actualmente la hipótesis solo aparece si BM y YCDI tienen datos en el periodo.

---

## Verificación técnica

| Check                | Resultado                                                    |
| -------------------- | ------------------------------------------------------------ |
| `npm run type-check` | ✅ pasa                                                      |
| `npm run lint`       | ✅ 0 errors                                                  |
| Aislamiento RLS      | ✅ todas las queries en `db.transaction()` con `setTenant()` |
| Sin "Margen"         | ✅ confirmado                                                |

---

## Conclusión

Épica 9 cumple los 4 entregables del brief:

1. ✅ 5 funciones consolidadas en service (separado por claridad)
2. ✅ Componente `correlacion-empresas` con cards conectados (decisión: cards en lugar de Sankey por legibilidad)
3. ✅ Página `/dashboard` con 6 secciones del brief
4. ✅ Sin "Margen" — eliminado

**Lista para pasar a la siguiente Épica.**
