# Solicitud — Columnas a agregar en Monday "Seguimiento General"

> Para: equipo BM CORP (Carla, Mafer, Ale, Gina, OP CORP)
> De: equipo SIG Jade
> Tablero: [Seguimiento General](https://bm-corp-company.monday.com/boards/3017199126)
> Fecha estimada de cambio: antes de la entrega Fase 1

---

## ¿Por qué?

Hoy SIG Jade lee del tablero **Seguimiento General** todas las ventas de
BM CORP. Sin embargo, **no tenemos forma de saber qué repartos ya se pagaron
a las alianzas** ni **qué comisiones ya se pagaron a los asesores**, porque
esa información no vive en ese tablero (vive en Excels que se generan los
días de pago).

Para que SIG Jade muestre **automáticamente**:

- Repartos realizados vs pendientes
- Comisiones pagadas vs pendientes
- Remanentes por alianza
- Flujo de caja semanal (ingresos vs egresos reales)

Necesitamos que **6 columnas nuevas** vivan dentro del mismo tablero
Seguimiento General, junto a cada venta. Así la información queda **homologada
y centralizada en un solo lugar**, sin Excels paralelos.

---

## Las 6 columnas a agregar

Agregar al tablero **Seguimiento General**, al final de las columnas existentes:

| #   | Nombre exacto de la columna | Tipo Monday | Valores permitidos                 |
| --- | --------------------------- | ----------- | ---------------------------------- |
| 1   | **Reparto Pagado**          | Status      | `PENDIENTE` · `PARCIAL` · `PAGADO` |
| 2   | **Fecha Reparto**           | Date        | —                                  |
| 3   | **Monto Reparto**           | Numbers     | en pesos, sin moneda               |
| 4   | **Comisión Asesor Pagada**  | Status      | `PENDIENTE` · `PARCIAL` · `PAGADO` |
| 5   | **Fecha Comisión Asesor**   | Date        | —                                  |
| 6   | **Monto Comisión Asesor**   | Numbers     | en pesos, sin moneda               |

> **Importante:** los nombres deben ser **idénticos** (incluyendo mayúsculas y
> acentos) para que SIG Jade las detecte automáticamente.

---

## ¿Cómo se llenan?

Cada vez que **pague un reparto a una alianza** o **una comisión a un asesor**,
quien hoy actualiza el Excel debe ahora marcarlo en Monday, en la fila de la
venta correspondiente:

1. Cambiar **Reparto Pagado** (o **Comisión Asesor Pagada**) de `PENDIENTE` a
   `PAGADO` (o `PARCIAL` si fue pago dividido)
2. Llenar **Fecha** y **Monto**

Eso es todo. SIG Jade lo detecta en la siguiente sincronización
(automática o manual desde el panel de BM CORP).

---

## ¿Qué pasa con los Excels actuales?

Esta migración busca **eliminar** los Excels de comisiones/repartos. La
información queda dentro de Monday, donde ya viven las ventas. Beneficios:

- ✅ Una sola fuente de verdad — no hay desfase entre Excel y Monday
- ✅ Histórico preservado — cada venta acumula su trazabilidad
- ✅ Más rápido para el equipo — un solo click vs llenar Excel
- ✅ SIG Jade muestra dashboards en tiempo real sin trabajo extra

---

## Lo que NO cambia

- El cálculo de comisiones sigue siendo de ustedes (BM CORP). SIG Jade
  **no calcula**, solo **lee** el resultado.
- El esquema actual de comisiones (JJG, líder, op, asesor) sigue funcionando.
  Lo que SIG Jade necesita es el **monto final pagado al asesor** y el
  **monto final repartido a la alianza** — no el desglose interno.
- Estado de venta, datos del cliente, contratos, etc. — sin cambio.

---

## Confirmación que necesitamos

Para proceder, por favor confirmen:

1. ✅ ¿De acuerdo en agregar las 6 columnas al tablero Seguimiento General?
2. ✅ ¿Quién del equipo será responsable de marcarlas (¿operativos AP/Cierre?)?
3. ✅ ¿Fecha en que pueden agregar las columnas y empezar a usarlas?
4. ✅ ¿Hay ventas históricas que requieran rellenar retroactivamente, o
   solo aplica de aquí en adelante?

Cualquier duda sobre cómo crear cada tipo de columna en Monday, podemos
agendar 15 minutos para hacerlo en vivo.

---

**Fase 2 (no es esta entrega):** una vez homologado el flujo, podemos
discutir si capturas como el desglose JJG/líder/op viven directamente en
SIG Jade en lugar de Excels.
