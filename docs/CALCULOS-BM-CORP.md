# Cálculos BM CORP — Cómo funciona el motor

> Doc técnico para validar que el sistema replica al 100% el doc YESYUCAN v5.
> Fuente: `/Applications/YESYUCAN_Esquema_de_Comisiones_v5.pdf`

---

## 1. Detección de tipo de producto

**Input:** una venta sincronizada desde Monday.

**Regla** (función `detectarTipoProductoPorDesarrolladora`):

| Desarrolladora en Monday                                    | Tipo               |
| ----------------------------------------------------------- | ------------------ |
| `GRUPO ARKA`                                                | TERRENO            |
| `GRUPO RH`                                                  | TERRENO            |
| `YUCANDOIT`, `KOOBEN`, `HUUNAL`, `TIXKOKOB`, `RENTABILIDAD` | ACCION             |
| Cualquier otra / null                                       | TERRENO (fallback) |

**Por qué importa:** define qué esquema global aplica (20% terrenos o 15% YCD).

---

## 2. Esquemas globales

Dos plantillas fijas según PDF §1 y §2:

### Terrenos (Aliados del Universo) — 20% total

| Concepto                            |       % | Destino                      |
| ----------------------------------- | ------: | ---------------------------- |
| OP BM Corp                          |      1% | BM Corp                      |
| OP YESYUCAN                         |      1% | YESYUCAN                     |
| Socio fijo Jorge                    |    1.5% | Jorge Juárez (mensual fijo)  |
| Socio fijo Kass                     |    1.5% | Kass Brambila (mensual fijo) |
| Bolsa comercial                     |     15% | Se reparte vía matriz (§3)   |
| **TOTAL**                           | **20%** | —                            |
| Asesor estándar (dentro afiliación) |      8% | —                            |
| Tope líder                          |       — | Sin tope                     |

### YCD (Partners YCD) — 15% total

| Concepto                            |       % | Destino                            |
| ----------------------------------- | ------: | ---------------------------------- |
| OP BM Corp                          |      0% | —                                  |
| OP YESYUCAN                         |      3% | YESYUCAN                           |
| Bolsa comercial                     |     12% | Se reparte vía matriz (§3)         |
| **TOTAL**                           | **15%** | —                                  |
| Asesor estándar (dentro afiliación) |      7% | —                                  |
| Tope líder                          | **10%** | Máx. afiliación recibida por líder |

---

## 3. Matriz Alianza × Producto

Define cómo se reparte la **bolsa comercial** entre líder y socios. Por alianza y tipo de producto.

**Regla de oro:** `% Afiliación + % Jorge bolsa + % Kass bolsa + % Diana bolsa = % bolsa comercial total`

- Terrenos: suma = 15%
- YCD: suma = 12%

**Casos especiales del PDF:**

- LGI, KB Asesores, Somos la Diferencia, Kuchmots, IXHA → son alianzas de un socio directo. `% Afiliación = bolsa total`, socios = 0.

---

## 4. Cálculo línea por línea (cascada)

Para una venta de **$1,000,000** terrenos con enganche **$120,000** (12%), alianza Flamingo (Diana líder · 11% afi + 3% Jorge + 1% Diana):

### Paso 1: comisión bruta

```
comisión bruta = monto venta × % total cliente
              = 1,000,000 × 20%
              = $200,000
```

### Paso 2: montos por concepto

```
OP BM Corp        = 1,000,000 × 1%   = $10,000
OP YESYUCAN       = 1,000,000 × 1%   = $10,000
Fijo Jorge        = 1,000,000 × 1.5% = $15,000
Fijo Kass         = 1,000,000 × 1.5% = $15,000
Asesor (8%)       = 1,000,000 × 8%   = $80,000

Afiliación (11%)  = 1,000,000 × 11%  = $110,000
Líder saldo       = afiliación − asesor = 110,000 − 80,000 = $30,000

Jorge bolsa       = 1,000,000 × 3%   = $30,000
Kass bolsa        = 1,000,000 × 0%   = $0
Diana bolsa       = 1,000,000 × 1%   = $10,000
```

### Paso 3: verificación

```
Suma = 10k + 10k + 15k + 15k + 80k + 30k + 30k + 0 + 10k = $200,000 ✓
Cuadra con comisión bruta ✓
```

---

## 5. Tope líder YCD (10%)

Solo aplica para `tipoProducto = ACCION`. Si la matriz tiene `% Afiliación > 10%`, el motor recorta a 10%.

**Ejemplo LGI YCD:** matriz dice 10% afiliación + 2% Jorge = 12% bolsa total. Líder Kass cobra **máx 10%**, Jorge recibe el saldo (2%) como socio operativo de Yucandoit.

---

## 6. Liberación según enganche

El motor libera lo que cubre el enganche. El resto queda **diferido** hasta que cliente pague más mensualidades.

### Cascada de liberación (orden PDF §4)

```
1. OP BM Corp + OP YESYUCAN
2. Asesor
3. Líder saldo
4. Socios bolsa (Jorge / Kass / Diana)
5. Socios fijos (1.5% Jorge + 1.5% Kass) — solo terrenos, mensual aparte
```

### Cálculo

```
liberable_total = MIN(enganche pagado, comisión bruta)
diferido_total  = comisión bruta − liberable_total
factor          = liberable_total / comisión bruta

Cada línea liberable = monto_línea × factor
Cada línea diferido  = monto_línea × (1 − factor)
```

### Ejemplo: enganche $120,000 cubre el 100% (porque comisión bruta $200,000 < enganche)

Wait — enganche $120k < bruta $200k. Entonces:

```
liberable_total = MIN(120,000, 200,000) = $120,000
diferido_total  = 200,000 − 120,000     = $80,000
factor          = 120,000 / 200,000     = 0.60

OP BM Corp:   liberable = 10,000 × 0.60 = $6,000   diferido = $4,000
OP YESYUCAN:  liberable = 10,000 × 0.60 = $6,000   diferido = $4,000
Asesor:       liberable = 80,000 × 0.60 = $48,000  diferido = $32,000
Líder:        liberable = 30,000 × 0.60 = $18,000  diferido = $12,000
Jorge bolsa:  liberable = 30,000 × 0.60 = $18,000  diferido = $12,000
Diana bolsa:  liberable = 10,000 × 0.60 = $6,000   diferido = $4,000
Fijo Jorge:   liberable = 15,000 × 0.60 = $9,000   diferido = $6,000
Fijo Kass:    liberable = 15,000 × 0.60 = $9,000   diferido = $6,000

Verificación: 6+6+48+18+18+6+9+9 = $120,000 ✓
```

---

## 7. Reglas especiales

### FLAMINGO_DIRECTO

YESYUCAN paga directo al asesor (sin líder intermedio). En el sistema: dispersión `ASESOR` no tiene `liderId`.

### LGI_YCD_ACUMULA

Solo aplica a LGI tipo ACCION. Todas las dispersiones se marcan `acumulaMensual=true`. Kass define al inicio del mes siguiente cómo repartir.

### Jorge bolsa siempre acumula

En cualquier alianza, la línea `SOCIO_BOLSA_JORGE` lleva `acumulaMensual=true`. Se paga 1 vez al mes consolidado.

---

## 8. Bonos por meta (NO calculados automáticamente hoy)

Existen en doc §1 y §2 pero **no están en motor**. Tabla `bonosLider` lista para captura manual.

| Nivel      | Promedio mensual | Bono terrenos | Bono YCD |
| ---------- | ---------------- | ------------: | -------: |
| Jade       | ≥ $5 MDP         |           +3% |    +1.5% |
| Turquesa   | $3.5–$4.9 MDP    |           +2% |      +1% |
| Ónix Negro | $2–$3.5 MDP      |           +1% |    +0.5% |

**Cliente debe definir:** ¿meta es 100% numérica (auto) o cualitativa (manual)? — pendiente respuesta.

---

## 9. Plan de pautas digitales

Compromiso de marketing aparte de comisión. Tabla `pautasDigitales`.

| Nivel      | Pauta mensual |
| ---------- | ------------: |
| Jade       |       $15,000 |
| Turquesa   |       $10,000 |
| Ónix Negro |        $5,000 |

**No entra a cálculo de dispersiones.** Es métrica complementaria.

---

## 10. Día de pago (doc §5)

| Cliente paga... | Líder cobra...          |
| --------------- | ----------------------- |
| Martes          | Viernes mismo semana    |
| Jueves          | Martes siguiente semana |

Hoy es informativo. No automatizado.

---

## 11. Integración Monday — cómo se traen los datos

### 11.1 Configuración

| Variable env      | Valor            | Uso                                 |
| ----------------- | ---------------- | ----------------------------------- |
| `MONDAY_API_KEY`  | token de Carlita | Autenticación API GraphQL           |
| `MONDAY_BOARD_ID` | `3017199126`     | Board "Seguimiento General" BM CORP |

Endpoint API: `https://api.monday.com/v2` (GraphQL).
Función central: `syncBoard(empresaId, tenantId, userId)` en `lib/services/monday/monday.service.ts`.

### 11.2 Cuándo y cómo se ejecuta

**Modo:** manual con botón en `/empresa/[bm-corp]/monday` → "Sincronizar ahora".

**Idempotente:** correr N veces no duplica datos.

- Unique key venta: `(tenantId, mondayItemId)` — `mondayItemId = item.id` de Monday
- Si existe → UPDATE. Si no → INSERT.

**Tras upsert de cada venta:** motor llama `calcularYPersistirComision(tenantId, ventaId)` automático. Comisiones y dispersiones se generan en la misma corrida.

**Errores:** se loguean en `sincronizacionesMonday.errores` (JSONB). Una venta fallida NO bloquea el resto.

### 11.3 Mapeo completo Monday → DB

Cada columna de Monday se identifica por **column_id** (formato `n_mero_de_lote`, NO por título). Mapping en `lib/monday/mappers.ts` constante `COLS`.

#### Identificación + Relaciones

| Column ID Monday | Tipo Monday   | Campo DB                                                          | Tabla destino            |
| ---------------- | ------------- | ----------------------------------------------------------------- | ------------------------ |
| `name`           | item.name     | `ventasBmcorp.cliente`                                            | ventas_bmcorp            |
| `item.id`        | —             | `ventasBmcorp.mondayItemId`                                       | ventas_bmcorp (unique)   |
| `n_meros8`       | number        | `ventasBmcorp.loteAcciones`                                       | ventas_bmcorp            |
| `n_mero_de_lote` | status (chip) | `afiliados.mondayLabel` ← match                                   | afiliados (upsert)       |
| `desarrollo`     | dropdown      | `desarrollos.nombre` ← match                                      | desarrollos (upsert)     |
| `desarrolladora` | status        | `desarrollos.desarrolladora`                                      | desarrollos              |
| `texto2`         | text          | `ventasBmcorp.asesor` (texto) → cruce con `asesores.mondayNombre` | ventas_bmcorp + asesores |

#### Montos

| Column ID          | Tipo    | Campo DB                          | Uso                                                                         |
| ------------------ | ------- | --------------------------------- | --------------------------------------------------------------------------- |
| `n_meros`          | number  | `ventasBmcorp.monto`              | Base de cálculo                                                             |
| `numeric_mkv1tbc3` | number  | `ventasBmcorp.montoPorAccion`     | Informativo                                                                 |
| `n_meros4`         | number  | `ventasBmcorp.porcentajeEnganche` | % no monto. Si > 0 y enganche=0, motor calcula enganche = monto × %         |
| `f_rmula8`         | formula | `ventasBmcorp.comisionBmcorp`     | Lo que Monday calculaba antes (referencia legacy)                           |
| **calculado**      | —       | `ventasBmcorp.enganche`           | Si Monday tiene `enganche` lo usa, si no = monto × porcentajeEnganche / 100 |

#### Status y estados

| Column ID        | Valores Monday → Enum DB                                                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `estado_1`       | "EN PROCESO"→EN_PROCESO, "APROBADO JURÍDICO"→APROBADO_JURIDICO, "FINALIZADA"→FINALIZADA, "CANCELADA"→CANCELADA, "APROBADO VENTAS"→APROBADO_VENTAS, "RECHAZADO"→RECHAZADO, "LIBERADO"→LIBERADO, "FINALIZADO Y LIQUIDADO"→FINALIZADO_Y_LIQUIDADO |
| `estado_14`      | financiamiento (CONTADO/CREDITO/etc) → `ventasBmcorp.financiamiento`                                                                                                                                                                           |
| `color_mkv1cg83` | paquete acción → `ventasBmcorp.paqueteAccion`                                                                                                                                                                                                  |
| `color`          | operativo apertura → `ventasBmcorp.operativoApertura`                                                                                                                                                                                          |
| `color2`         | operativo cierre → `ventasBmcorp.operativoCierre`                                                                                                                                                                                              |

#### Fechas

| Column ID | Tipo | Campo DB                       | Uso en motor                                          |
| --------- | ---- | ------------------------------ | ----------------------------------------------------- |
| `date`    | date | `ventasBmcorp.fechaApertura`   | Selecciona qué esquema vigente aplica                 |
| `fecha`   | date | `ventasBmcorp.fechaCierre`     | Flujo confirmado (cerrado) vs proyectado (sin cierre) |
| `fecha7`  | date | `ventasBmcorp.fechaNacimiento` | Informativo cliente                                   |

#### Datos personales (informativos, no entran a motor)

| Column ID            | Campo DB                    |
| -------------------- | --------------------------- |
| `tel_fono`           | `ventasBmcorp.telefono`     |
| `correo_electr_nico` | `ventasBmcorp.correo`       |
| `pa_s5`              | `ventasBmcorp.nacionalidad` |
| `pa_s0`              | `ventasBmcorp.residencia`   |
| `estado10`           | `ventasBmcorp.sexo`         |

### 11.4 Reparto/comisión asesor (pendiente cliente agregar columnas)

Estas columnas NO existen en board actual. Mapper hace match por título (case-insensitive) cuando aparezcan:

| Título esperado en Monday         | Campo DB                                       |
| --------------------------------- | ---------------------------------------------- |
| `reparto pagado` (status)         | `repartosBmcorp.estado` (legacy)               |
| `fecha reparto` (date)            | `repartosBmcorp.fecha`                         |
| `monto reparto` (number)          | `repartosBmcorp.monto`                         |
| `comisión asesor pagada` (status) | `repartosBmcorp.estado` (tipo COMISION_ASESOR) |
| `fecha comisión asesor` (date)    | mismo                                          |
| `monto comisión asesor` (number)  | mismo                                          |

**Hoy esto NO está en uso** — el nuevo módulo de comisiones (tabla `dispersiones`) reemplaza este flujo. Joana marca pagos desde UI, no desde Monday.

### 11.5 Cruce alianza Monday → afiliado DB

Cuando llega venta:

1. Lee `n_mero_de_lote` (chip status) — ej. "FLAMINGO"
2. Normaliza nombre: trim + uppercase
3. Busca afiliado existente con `mondayLabel` o `nombre` matching
4. Si no existe → crea afiliado nuevo con `requiereConfig=true` en matriz
5. Si existe → reusa su ID

### 11.6 Cruce asesor Monday → entidad asesor DB

1. Lee `texto2` (texto libre del asesor) — ej. "IVAN CASTAÑEDA"
2. Guarda en `ventasBmcorp.asesor` (texto, snapshot)
3. Busca asesor con `mondayNombre = texto` para misma alianza
4. Si encuentra → dispersión `ASESOR` se vincula a `asesorId`
5. Si NO encuentra → dispersión queda sin `asesorId` (sin acceso portal hasta crear entidad)

**Cómo arreglar asesores faltantes:** `npm run audit:comisiones:fix` o crear manual desde UI.

### 11.7 Flujo end-to-end del sync

```
1. Botón "Sincronizar" en /empresa/[bm-corp]/monday
   ↓
2. triggerSync() Server Action
   ↓
3. syncBoard():
   a) Query Monday: getBoard(boardId) → trae items + columnas
   b) Por cada item:
      - mapItemToVenta(item)  → objeto MappedVenta
      - upsertAfiliado(afiliadoNombre)
      - upsertDesarrollo(desarrolloNombre + desarrolladora)
      - upsertVenta por (tenantId, mondayItemId)
      - calcularYPersistirComision(tenantId, ventaId)
        → resuelve esquema + matriz
        → calcula 9 montos
        → upsert comisión + 4-9 dispersiones
   c) Registra resultado en sincronizacionesMonday
   ↓
4. UI refresca: ventas, dispersiones, dashboard, KPIs
```

### 11.8 Tabla resumen de cruce datos

| Dato Monday           | Sistema lo usa para...                            | Validable en UI                   |
| --------------------- | ------------------------------------------------- | --------------------------------- |
| Nombre cliente        | Mostrar en venta + reportes                       | `/comisiones/ventas`              |
| Alianza chip          | Cruzar con catálogo afiliados                     | `/comisiones/alianzas`            |
| Desarrollo dropdown   | Mostrar contexto + opcional matriz por desarrollo | Detalle venta                     |
| Desarrolladora        | **Define TERRENO o ACCION**                       | Detalle venta                     |
| Asesor texto          | Vincular a entidad asesor para portal             | `/comisiones/alianzas` (expandir) |
| Monto venta           | Base de TODO cálculo                              | Detalle venta                     |
| Enganche $ o %        | Determinar liberable vs diferido                  | Detalle venta                     |
| Estado venta          | Filtro (excluye CANCELADA del cálculo activo)     | Tabla ventas                      |
| Fecha apertura/cierre | Esquema vigente + flujo proyectado vs confirmado  | Detalle venta + flujo             |

---

## 12. Validación end-to-end

1. Sincronizar Monday: trae ventas + actualiza afiliados/desarrollos.
2. Motor procesa cada venta:
   - Detecta tipo por desarrolladora
   - Busca esquema global activo
   - Busca matriz alianza×producto
   - Calcula 9 montos por concepto
   - Distribuye liberable/diferido según enganche
3. Persiste:
   - `comisionesCalculadas` (snapshot — 1 por venta)
   - `dispersiones` (4–9 por venta, 1 por beneficiario)
4. Joana revisa `/comisiones/validacion` o baja Excel.

---

## 13. Cuándo el motor NO calcula

- **Alianza sin matriz configurada** (`matriz.requiereConfig = true`) → marca `sinConfig=true`, no genera dispersiones.
- **Esquema global desactivado** → error explícito.
- **Suma matriz ≠ bolsa esperada** → calcula igual pero emite advertencia.

---

## 14. Cómo modificar % sin tocar código

| Cambio                        | Dónde                                             | Aplicación                      |
| ----------------------------- | ------------------------------------------------- | ------------------------------- |
| % comisión operativa          | `/comisiones/esquemas` → editar                   | Inmediato comisiones nuevas     |
| % bolsa comercial             | mismo                                             | mismo                           |
| % afiliación de una alianza   | `/comisiones/alianzas` → matriz                   | mismo                           |
| Reaplicar a comisiones viejas | `/comisiones/esquemas` → botón "Recalcular todas" | Recalcula 124 ventas existentes |

---

## Resumen brutal

**5 entradas determinan cada comisión:**

1. Monto venta
2. Enganche
3. Tipo producto (por desarrolladora)
4. Esquema global del tipo
5. Matriz de la alianza

**Salida: 9 montos + flag liberable/diferido.**

Si los % en sistema = % en doc YESYUCAN v5 + cliente confirma que el doc es la verdad operativa → motor está correcto.

---

_Doc operativo · Mayo 2026 · SIG Jade_
