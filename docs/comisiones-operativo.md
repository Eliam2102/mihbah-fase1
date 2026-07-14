# Manual operativo — Módulo de Comisiones BM CORP

> Guía paso a paso para **Joana**. Si tienes dudas técnicas, escribe a Eliam. Si tienes dudas de criterio (cuánto pagar, a quién), escribe a Jorge Juárez.

---

## 1. Acceso

URL: `https://mihab.vercel.app` (prod) o `http://localhost:3000` (dev)

Login: tu usuario admin. Una vez dentro, selecciona empresa **BM CORP** y verás en sidebar la sección **Comisiones**.

---

## 2. Estructura del módulo

```
Comisiones
├── Resumen (landing)
├── Alianzas, líderes y asesores
├── Esquemas globales
├── Ventas con comisión
├── Dispersiones a pagar
├── Precálculo
├── Usuarios del portal
└── NPS interno
```

---

## 3. Flujo diario

### Setup inicial (una vez por alianza nueva)

1. Ir a **Alianzas, líderes y asesores**
2. Expande la alianza (click la flecha)
3. Click **+ Nuevo líder** → captura nombre, email, banco
4. Click **+ Nuevo asesor** bajo ese líder → captura datos
5. En la columna **Matriz Terrenos** y **Matriz YCD**, click "Configurar" o el % actual:
   - Selecciona líder
   - Captura porcentajes: afiliación (lo que recibe líder), Jorge bolsa, Kass bolsa, Diana bolsa
   - **La suma debe igualar la bolsa comercial** (15% terrenos / 12% YCD). El sistema valida.
   - Marca regla especial si aplica (Flamingo directo, LGI YCD acumula)

### Cuando llega una nueva venta de Monday

1. Ir a **Sincronización Monday** y dale "Sincronizar ahora"
2. El sistema:
   - Trae las ventas nuevas
   - Calcula automáticamente la comisión y dispersiones
   - Las marca **SIN_CONFIG** si la alianza no tiene matriz aún
3. Ir a **Ventas con comisión** → ver listado y filtrar por TERRENO / ACCION
4. Click una venta → ves el desglose de 4 a 9 líneas según matriz

### Cuando llega el reporte oficial de comisiones (mensual)

1. Ir a **Precálculo** y simular antes de tocar la DB real
2. Si difiere de lo que ves en **Ventas con comisión**, revisa que la matriz coincida con doc YESYUCAN v5

### Cuando vas a pagar una dispersión

1. Ir a **Dispersiones a pagar**
2. Filtra "Solo pendientes" si quieres
3. Click **Marcar** en la fila → captura fecha y monto (vacío = paga el restante)
4. Si está aprobada por Jorge, los admins reciben notificación de retiro de caja

### Cuando cliente paga más enganche

1. Actualiza enganche en Monday (campo "Enganche")
2. Vuelve a sincronizar → motor recalcula automáticamente
3. O ve a la venta y click **Recalcular comisión**

### Captura NPS trimestral

1. Ir a **NPS interno**
2. Click **+ Capturar trimestre**
3. Llena: empresa, año, Q, puntuación (-100 a 100), respondientes, promotores, detractores
4. Semáforo: Verde > 50, Amarillo 0-50, Rojo < 0

---

## 4. Portal para líderes y asesores

### Crear cuenta de portal

1. Ir a **Usuarios del portal**
2. Click **+ Nuevo usuario**
3. Selecciona rol: ASESOR o LIDER_ALIANZA
4. Vincula al asesor o líder correspondiente
5. Captura nombre, email, password temporal
6. Comparte el password al líder/asesor por canal seguro (WhatsApp directo, NO grupo)
7. Ellos cambian el password en su primer login

### Qué ven los líderes

- Su dashboard con: total pagado, pendiente, total red de asesores
- Lista de todos sus asesores con sus comisiones acumuladas
- Tabla de sus dispersiones LIDER_SALDO
- Acceso a comprobantes de sus propias dispersiones

### Qué ven los asesores

- Su dashboard con: próxima comisión, pagado histórico, diferido
- Detalle de cada comisión que les corresponde
- Acceso a comprobantes de sus propias dispersiones

### Aislamiento

- Asesor A no puede ver dispersiones de Asesor B (aunque sean misma alianza)
- Líder A no puede ver alianza de Líder B
- Si alguien intenta acceder por URL directa → 404

---

## 5. Reglas especiales del doc YESYUCAN v5

### Flamingo

- YESYUCAN paga directo al asesor (no pasa por Diana, su líder)
- En el sistema: dispersión ASESOR no tiene `liderId` para esta alianza
- Diana recibe SUS partes de bolsa (3% Jorge / 1% Diana) por separado

### LGI YCD

- Las comisiones se acumulan mensualmente
- Kass define la dispersión a sus asesores al inicio del mes siguiente
- Todas las líneas de dispersión llevan flag `acumulaMensual = true`

### Jorge bolsa

- En toda alianza, la parte de Jorge en bolsa comercial se acumula al mes
- Se paga una vez (no por venta)
- Flag `acumulaMensual = true`

### Socios fijos (terrenos)

- 1.5% Jorge + 1.5% Kass se paga mensual, no por venta
- Aparecen como líneas separadas en las dispersiones

---

## 6. Niveles de aliado (TODO confirmar con junta)

- Jade: promedio mensual > $5MDP → 3% bono adicional (terrenos)
- Turquesa: $3.5-$4.9MDP → 2%
- Ónix Negro: $2-$3.5MDP → 1%

Los niveles se asignan **manual** en el formulario de líder. Cuando se confirme con junta si es automático o cualitativo, el sistema se ajusta.

---

## 7. Cuando algo no cuadra

### "Veo una venta sin comisión"

- Verifica que la alianza tenga matriz configurada para el tipo de producto (TERRENO/ACCION)
- Marca de alerta "Sin config" en la columna estado

### "Comisión calculada distinta a lo que dice el reporte oficial"

- Revisa porcentajes de matriz vs doc YESYUCAN v5
- Revisa que el esquema activo tenga porcentajes correctos
- Usa precálculo para reproducir caso por caso

### "Líder no puede entrar al portal"

- Verifica que tiene usuario activo en `/portal-usuarios`
- Verifica que rol es `lider_alianza` o `asesor`
- Si olvidó password, créale uno nuevo y reenvía

### "Pago se rechazó"

- Revisa monto restante (no pagues más de lo que queda)
- Verifica fecha de pago no sea futura

---

## 8. Comandos técnicos (Eliam)

```bash
# Local
npm run dev                       # servidor
npm run db:seed-comisiones        # poblar 15 alianzas + 2 esquemas

# Tests
npm test                          # 20 verdes (motor + servicios + portal)

# Verificar Monday
# Ir a /empresa/[bmcorp-id]/monday y click sincronizar
```

---

## 9. Pendientes para Fase 2

- Storage real de comprobantes (volumen Easypanel o R2)
- Cálculo automático de niveles (auto vs manual)
- Webhook Monday en tiempo real
- 2FA para usuarios admin
- Reportes PDF autogenerados de dispersión
- Reapuntar dashboard BM CORP a tabla `dispersiones` nueva

---

_Manual versión 1.0 — Mayo 2026 · SIG Jade_
