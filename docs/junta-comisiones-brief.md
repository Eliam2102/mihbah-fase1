# Brief — Junta Comisiones BM CORP (Carlita + Joana + Dirección)

> Documento de 1 página para resolver 4 preguntas pendientes que bloquean el cierre del módulo de comisiones de SIG Jade. Imprime esto o compártelo en pantalla y que respondan en vivo. Respuestas alimentan código directo.

**Convocados:** Carlita (Monday) · Joana (operación) · Dirección General (Jorge Juárez)
**Tiempo estimado:** 30 min
**Resultado esperado:** 4 decisiones firmes con responsables.

---

## Contexto

El sistema SIG Jade automatiza el cálculo, dispersión y portal de comisiones BM CORP. Las matrices del doc YESYUCAN v5 cubren ~85% del motor. Falta cerrar 4 reglas operativas para arrancar producción.

---

## Pregunta 1 — Niveles del aliado/partner

**Doc dice:** Jade / Turquesa / Ónix Negro según promedio mensual de ventas.

**Pregunta:** ¿Cómo deciden el nivel hoy?

- [ ] **Auto** (sistema calcula promedio 3 meses, sin intervención)
- [ ] **Manual** (Joana asigna cada mes)
- [ ] **Híbrido** (sistema propone, Joana confirma o override)

**Sub-pregunta:** ¿Hay casos donde se sostiene el nivel aunque no cumpla el promedio (vacaciones, post-parto, baja temporal)?

- [ ] Sí → motivos válidos: **********************\_\_**********************
- [ ] No

**Responsable:** Joana
**Cómo impacta código:** Define lógica de la tabla `asesoresNiveles` (ya existe en DB).

---

## Pregunta 2 — Bonos por meta cumplida

**Doc dice:** Bono adicional (3% Jade / 2% Turquesa / 1% Ónix terrenos; 1.5/1/0.5 YCD) cuando alianza alcanza meta mensual. Lo paga el líder, no BMCorp.

**Pregunta:** ¿La "meta cumplida" es 100% numérica o tiene componente cualitativo?

- [ ] **Numérica** (ventas mes ≥ umbral nivel = cumplió, sin discusión)
- [ ] **Cualitativa** (incluye asistencia, comportamiento, ranking, etc — Joana o líder confirman)
- [ ] **Mixta** (ambas — describir): ******************\_******************

**Sub-pregunta:** ¿Qué umbral aplica exactamente? Doc dice "$5MDP / $3.5-$4.9 / $2-$3.5" para terrenos. ¿Es ventas brutas, comisión generada, o de qué tipo?

Respuesta: ****************************\_\_\_****************************

**Responsable:** Dirección General
**Cómo impacta código:** Define enum `modoBonoEnum` (ya existe: `NUMERICO_AUTO` | `MANUAL`) y la fórmula del cálculo automático en `bonosLider`.

---

## Pregunta 3 — Alianzas en Monday no documentadas

**Discrepancia:** Doc v5 tiene **15 alianzas**. Monday actualmente trae **19**. Las 4 extras necesitan clasificación:

| Alianza Monday        | Clasificar como                                      | Acción |
| --------------------- | ---------------------------------------------------- | ------ |
| **ETF**               | □ Alianza viva (faltó docu) □ Op interna □ Histórica | **\_** |
| **BM CORP OP**        | □ Alianza viva (faltó docu) □ Op interna □ Histórica | **\_** |
| **ADARA ARGUELLO**    | □ Alianza viva (faltó docu) □ Op interna □ Histórica | **\_** |
| **(4ª — sin nombre)** | □ Alianza viva (faltó docu) □ Op interna □ Histórica | **\_** |

**Tipos:**

- **Alianza viva**: agregar al doc v6 con sus % (Carlita confirma % aplicables)
- **Op interna**: NO es alianza, etiquetar diferente en Monday, no entra a matriz
- **Histórica**: marcar `vigente_hasta` en doc, sigue calculando ventas pasadas

**Responsable:** Carlita
**Cómo impacta código:** Define para cada una si `matrizAlianzaProducto` tendrá registro (vivas/históricas) o queda `requiereConfig=true` permanente (operativas).

---

## Pregunta 4 — Plan de pautas digitales

**Doc dice:** Jade → $15k/mes · Turquesa → $10k/mes · Ónix Negro → $5k/mes en pauta digital. NO forma parte de comisión efectiva.

**Pregunta:** ¿Quién ejecuta hoy ese presupuesto?

- [ ] Mariana
- [ ] Niq Torres
- [ ] Diana Jimendi
- [ ] Nadie / cada alianza lo administra
- [ ] Otro: ********\_\_********

**Sub-pregunta:** ¿Auditan compromiso vs ejecutado? Si una alianza Jade no recibió sus $15k del mes, ¿lo saben?

- [ ] Sí, auditamos en: ****************\_****************
- [ ] No, es compromiso pero nadie lo audita
- [ ] Parcialmente — qué se audita: **********\_\_**********

**Responsable:** Joana / Marketing
**Cómo impacta código:** Define si la tabla `pautasDigitales` (ya existe) se conecta a Drive/Excel para cruzar real vs comprometido, o solo guarda compromiso.

---

## Cierre

Al final de la junta, cada pregunta debe quedar con:

1. Decisión firme
2. Responsable que la sostiene
3. Fecha tope si requiere data adicional

Devuelve este doc llenado a Eliam — él lo pasa al desarrollo.

---

_Documento generado para SIG Jade · Mayo 2026_
