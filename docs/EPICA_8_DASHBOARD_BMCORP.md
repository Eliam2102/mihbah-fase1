# Épica 8 — Dashboard BM CORP

> Estado: **Cerrada estructuralmente al 100%**
> Activación final: depende de cliente (columnas Monday) + Carla (semáforo)
> Fecha: 2026-05-05

---

## Alcance entregado

### 1. Servicios — `lib/services/dashboard-bmcorp.service.ts`

| Función                                     | Estado | Datos hoy                       |
| ------------------------------------------- | ------ | ------------------------------- |
| `getKpisBmcorp()`                           | ✅     | Reales (50 ventas Monday)       |
| `getRankingAfiliados()`                     | ✅     | Reales                          |
| `getRankingDesarrollos()` (alias proyectos) | ✅     | Reales                          |
| `getFlujoSemanal()`                         | ✅     | Ingresos reales · Egresos en 0  |
| `getRepartosSplit()`                        | ✅     | `sinDatos: true` hasta cliente  |
| `getRemanentesPorAfiliado()`                | ✅     | = vendido (sin restar repartos) |
| `getComisionamientoConciliado()`            | ✅     | Generado real · Pagado en 0     |
| `getUltimaSync()`                           | ✅     | Reales                          |

Todas las funciones envuelven en `db.transaction()` + `set_config('app.current_tenant_id', ...)`
para que RLS aplique. Patrón consistente con el resto del codebase.

### 2. Componentes UI

| Componente              | Archivo                                           | Notas                                                                                                                |
| ----------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `BmcorpSemaforo`        | `components/dashboard/bmcorp-semaforo.tsx`        | Placeholder "En configuración"                                                                                       |
| `BmcorpRanking`         | `components/dashboard/bmcorp-ranking.tsx`         | Lista numerada · medallas top 3 · avatar circular con color determinístico · barra de progreso · drill-down opcional |
| `BmcorpFlujoSemanal`    | `components/dashboard/bmcorp-flujo-semanal.tsx`   | Recharts BarChart agrupadas ingresos vs egresos · 12 semanas                                                         |
| `BmcorpRepartosCard`    | `components/dashboard/bmcorp-repartos-card.tsx`   | Split realizado/parcial/pendiente · placeholder cuando `sinDatos`                                                    |
| `BmcorpComisionamiento` | `components/dashboard/bmcorp-comisionamiento.tsx` | Pagado vs pendiente vs parcial + % conciliado · placeholder cuando `sinDatos`                                        |
| `BmcorpEmptyState`      | `components/dashboard/bmcorp-empty-state.tsx`     | Cuando `totalVentas === 0`                                                                                           |

### 3. Página Dashboard — layout final

`app/(app)/empresa/[empresaId]/dashboard/dashboard-bmcorp.tsx`

```
┌──────────────────────────────────────────────────────┐
│  Semáforo BM CORP (placeholder)                      │
├──────────────────────────────────────────────────────┤
│  Sync banner — última sync + botón "Sincronizar"     │
├─────────────────────────┬────────────────────────────┤
│  IZQUIERDA              │  DERECHA                   │
│                         │                            │
│  • Total vendido card   │  • Repartos card           │
│    (3 sub KPIs)         │    (split + placeholder)   │
│                         │                            │
│  • Top alianzas         │  • Flujo semanal           │
│    (drill-down →        │    (BarChart 12 semanas)   │
│     /cuentas)           │                            │
│                         │  • Comisionamiento         │
│  • Top desarrollos      │    conciliado              │
│    (drill-down →        │    (placeholder)           │
│     /proyectos)         │                            │
├─────────────────────────┴────────────────────────────┤
│  Remanentes por afiliado (tabla full width)          │
└──────────────────────────────────────────────────────┘
```

### 4. Routing condicional

`app/(app)/empresa/[empresaId]/dashboard/page.tsx:65` — al detectar
`empresa.tipo === 'COMERCIAL'` renderiza `<DashboardBmcorp>`.

---

## Dependencias externas — bloquean activación final

Estos KPIs muestran 0 / placeholder. **No es bug, es esperado.** Cuando lleguen
los datos, todo se llena automático sin tocar código.

### Dep #1 — Cliente debe agregar 6 columnas en Monday

**Solicitud:** `docs/MONDAY_COLUMNAS_REQUERIDAS.md`

| Columna Monday                    | Habilita en SIG Jade                                 |
| --------------------------------- | ---------------------------------------------------- |
| `Reparto Pagado` (status)         | Estado en card Repartos                              |
| `Fecha Reparto` (date)            | Fecha exacta del pago                                |
| `Monto Reparto` (numbers)         | Egresos del flujo · Repartos realizados · Remanentes |
| `Comisión Asesor Pagada` (status) | Estado conciliación                                  |
| `Fecha Comisión Asesor` (date)    | —                                                    |
| `Monto Comisión Asesor` (numbers) | Comisionamiento conciliado                           |

**Cuando estén:** próximo sync llena `repartos_bmcorp`. Dashboard muestra todo.

### Dep #2 — Carla debe definir umbrales del semáforo

Necesario para reemplazar el placeholder con lógica real.

Necesitamos:

- Métrica base (¿% conciliado, % ventas finalizadas, ratio repartos pagados, otra?)
- Umbrales por color: verde · amarillo · naranja · rojo

**Mientras tanto:** `BmcorpSemaforo` muestra "En configuración".

### Dep #3 — Filtros granulares

Hoy solo periodo (anio/mes via `searchParams`). El doc cliente menciona filtros
adicionales: alianza, desarrollo, estado de venta.

**Estado:** scaffolding `PeriodFilter` en `dashboard/page.tsx`. Filtros extra
quedan para Épica posterior si cliente prioriza.

---

## Verificación funcional

### Con datos reales del board Monday

1. `MONDAY_API_KEY` + `MONDAY_BOARD_ID=3017199126` en `.env.local`
2. Sync ejecutado: 50 ventas creadas en `ventas_bmcorp`
3. Resultados confirmados:
   - **Total vendido:** suma correcta de los 50 items
   - **Top alianzas:** LGI, HACKERS INMOBILIARIOS, etc. (rankeadas por monto)
   - **Top desarrollos:** Nuuktal, Nayal 2, HUUNAL, etc.
   - **Estados:** mapeo correcto de los 7 grupos Monday → 9 valores enum
   - **Enganche:** calculado como `monto × % / 100` (fix de `Porcentaje × 1`)
   - **Comisión BM CORP:** calculada como `monto × 0.15` (fallback porque Monday no calcula formulas en API)

### KPIs que quedan en 0/placeholder

| KPI                                      | Razón                                |
| ---------------------------------------- | ------------------------------------ |
| Repartos realizados / pendientes         | Cliente debe agregar columnas Monday |
| Comisionamiento conciliado (lado pagado) | Cliente debe agregar columnas Monday |
| Egresos del flujo semanal                | Egreso = reparto pagado · sin fuente |
| Remanentes ≠ 0 (vendido − repartos)      | Repartos en 0 → remanente = vendido  |
| Semáforo de salud                        | Carla debe definir umbrales          |

---

## Cómo probar end-to-end

```bash
npm run dev
# Login: admin@universojade.com / Admin12345!
# Topbar → seleccionar BM CORP
# Sidebar → Dashboard (debe renderizar layout completo)
# Click "Sincronizar" en banner → ir a Monday y volver
# Verificar:
#   ✓ Total vendido > 0
#   ✓ Rankings con datos
#   ✓ Flujo semanal con barras de ingresos
#   ✓ Repartos card con placeholder "Pendiente — requiere data Monday"
#   ✓ Comisionamiento card con generado real + placeholder en pagado
#   ✓ Semáforo "En configuración"
```

---

## Trabajo que se desbloquea cuando lleguen datos

Sin tocar código:

1. Cliente agrega 6 columnas Monday → llena 1 venta de prueba con reparto y comisión
2. Click "Sincronizar ahora" en SIG Jade
3. Refrescar Dashboard
4. Esperado:
   - Repartos card sale de placeholder · muestra split real
   - Comisionamiento muestra `% conciliado` real
   - Flujo semanal muestra barras de egresos
   - Remanentes resta repartos del vendido

Cero código pendiente para esos casos.

---

## Verificación técnica

| Check                  | Resultado                                                |
| ---------------------- | -------------------------------------------------------- |
| `npm run type-check`   | ✅ pasa                                                  |
| `npm run lint`         | ✅ 0 errors                                              |
| `npm run db:push`      | ✅ schema en sync                                        |
| Sync Monday end-to-end | ✅ 50 ventas                                             |
| RLS aislamiento        | ✅ todas queries en `db.transaction()` con `setTenant()` |

---

## Conclusión

Épica 8 cumple los 5 entregables del brief:

1. ✅ 7 funciones del servicio (8 con `getUltimaSync`)
2. ✅ Componente `ranking-list` con avatar/icono + drill-down
3. ✅ Componente `flujo-semanal` con barras agrupadas
4. ✅ Página dashboard 50/50 con semáforo arriba
5. ✅ Renderiza cuando `tipo === 'COMERCIAL'`

Lo que no llega al 100% **funcional** son las dependencias externas
(columnas Monday + criterios Carla). El código está listo y se enciende solo.

**Lista para pasar a la siguiente Épica.**
