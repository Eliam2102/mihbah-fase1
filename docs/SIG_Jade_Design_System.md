# SIG Jade — Design System

**Versión:** 1.0
**Filosofía:** Corporate, legible, profesional. Pensado para CEOs y directores que necesitan leer información financiera densa con claridad.

---

## Filosofía de diseño

### Principios

1. **Legibilidad primero.** Cada elemento debe ser fácil de leer a primera vista. No hay tipografía decorativa, no hay colores que cansen.
2. **Información sobre decoración.** Los datos son el héroe. La UI desaparece.
3. **Confianza visual.** Usamos psicología de color para transmitir el estado financiero sin ambigüedad.
4. **Densidad cómoda.** Información rica sin saturar. Espaciado generoso pero no excesivo.
5. **Accesibilidad WCAG AA.** Todos los contrastes cumplen mínimo 4.5:1 para texto normal, 3:1 para texto grande.

### Inspiración

Stripe Dashboard, Linear, Mercury, Pylon. Limpio, denso, profesional, sin gimmicks visuales.

---

## Psicología de color aplicada

| Color                       | Psicología                                 | Uso en el sistema                                     |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| **Verde Jade**              | Crecimiento, salud, estabilidad, confianza | Marca, ingresos, estado saludable, acciones primarias |
| **Rojo coral**              | Urgencia, alerta, salida de dinero         | Egresos, estado crítico, eliminación                  |
| **Ámbar**                   | Atención, precaución, advertencia          | Estado en riesgo, vencimientos próximos               |
| **Azul navy**               | Autoridad, datos, neutralidad              | Encabezados, títulos, datos neutrales                 |
| **Slate (grises azulados)** | Profesionalismo, calma                     | Texto, fondos, bordes                                 |
| **Blanco roto**             | Limpieza, espacio para respirar            | Fondo principal                                       |

### Mapeo de estados financieros a colores

| Estado                | Color      | Hex (modo claro) | Hex (modo oscuro) |
| --------------------- | ---------- | ---------------- | ----------------- |
| Saludable / verde     | Jade 600   | `#059669`        | `#10b981`         |
| Precaución / amarillo | Amber 500  | `#f59e0b`        | `#fbbf24`         |
| En riesgo / naranja   | Orange 600 | `#ea580c`        | `#fb923c`         |
| Crítico / rojo        | Red 600    | `#dc2626`        | `#ef4444`         |
| Neutral / informativo | Slate 500  | `#64748b`        | `#94a3b8`         |

---

## Tokens de diseño

Todos los tokens viven en **un solo archivo** (`lib/design-tokens.ts`) que se importa en `tailwind.config.ts` y `globals.css`. Para cambiar la identidad visual completa solo se edita ese archivo.

### Paleta de marca: Jade

```typescript
jade: {
  50:  "#ecfdf5",   // Fondos muy sutiles
  100: "#d1fae5",   // Hover states suaves
  200: "#a7f3d0",   // Bordes destacados
  300: "#6ee7b7",   // Iconos secundarios
  400: "#34d399",   // Estados activos suaves
  500: "#10b981",   // Color de marca alternativo
  600: "#059669",   // Color primario principal ★
  700: "#047857",   // Hover de primario
  800: "#065f46",   // Active de primario
  900: "#064e3b",   // Texto sobre fondos jade
  950: "#022c22",   // Fondos oscuros con marca
}
```

### Paleta neutral: Slate (azul-gris corporativo)

```typescript
slate: {
  50:  "#f8fafc",   // Fondo principal modo claro ★
  100: "#f1f5f9",   // Fondos de cards / sidebar
  200: "#e2e8f0",   // Bordes
  300: "#cbd5e1",   // Bordes input
  400: "#94a3b8",   // Texto deshabilitado
  500: "#64748b",   // Texto secundario / labels
  600: "#475569",   // Texto cuerpo
  700: "#334155",   // Texto principal
  800: "#1e293b",   // Headings
  900: "#0f172a",   // Texto mayor jerarquía / fondo oscuro
  950: "#020617",   // Fondo modo oscuro profundo
}
```

### Paleta semántica: Estados financieros

```typescript
// Verde — Saludable, ingresos, positivo
success: {
  50:  "#f0fdf4",
  100: "#dcfce7",
  500: "#22c55e",
  600: "#16a34a",  // ★
  700: "#15803d",
  900: "#14532d",
}

// Ámbar — Precaución, advertencia
warning: {
  50:  "#fffbeb",
  100: "#fef3c7",
  500: "#f59e0b",  // ★
  600: "#d97706",
  700: "#b45309",
  900: "#78350f",
}

// Naranja — En riesgo
danger: {
  50:  "#fff7ed",
  100: "#ffedd5",
  500: "#f97316",
  600: "#ea580c",  // ★
  700: "#c2410c",
  900: "#7c2d12",
}

// Rojo — Crítico, egresos, error
critical: {
  50:  "#fef2f2",
  100: "#fee2e2",
  500: "#ef4444",
  600: "#dc2626",  // ★
  700: "#b91c1c",
  900: "#7f1d1d",
}

// Azul — Informativo, neutral con peso
info: {
  50:  "#eff6ff",
  100: "#dbeafe",
  500: "#3b82f6",
  600: "#2563eb",  // ★
  700: "#1d4ed8",
  900: "#1e3a8a",
}
```

### Tipografía

**Familia tipográfica:** Inter (display y body) + JetBrains Mono (números y código)

Inter es la elección estándar para dashboards corporativos modernos: legibilidad superior, tabular figures para alinear números, soporte multi-idioma.

```typescript
fontFamily: {
  sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  display: ['Inter', 'system-ui', 'sans-serif'],
  mono:    ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
}
```

**Escala tipográfica (modular scale 1.25):**

| Token       | Tamaño          | Line height | Uso                      |
| ----------- | --------------- | ----------- | ------------------------ |
| `text-xs`   | 12px / 0.75rem  | 16px        | Labels, captions, badges |
| `text-sm`   | 14px / 0.875rem | 20px        | Texto secundario, tablas |
| `text-base` | 16px / 1rem     | 24px        | Cuerpo principal ★       |
| `text-lg`   | 18px / 1.125rem | 28px        | Subtítulos               |
| `text-xl`   | 20px / 1.25rem  | 28px        | H4                       |
| `text-2xl`  | 24px / 1.5rem   | 32px        | H3                       |
| `text-3xl`  | 30px / 1.875rem | 36px        | H2                       |
| `text-4xl`  | 36px / 2.25rem  | 40px        | H1                       |
| `text-5xl`  | 48px / 3rem     | 1           | KPI grande               |
| `text-6xl`  | 60px / 3.75rem  | 1           | Display hero             |

**Pesos:**

| Peso            | Valor | Uso                       |
| --------------- | ----- | ------------------------- |
| `font-normal`   | 400   | Cuerpo de texto ★         |
| `font-medium`   | 500   | Énfasis suave, labels     |
| `font-semibold` | 600   | Subtítulos, botones, KPIs |
| `font-bold`     | 700   | Títulos principales       |

**Tracking (letter-spacing):**

| Token             | Valor    | Uso                  |
| ----------------- | -------- | -------------------- |
| `tracking-tight`  | -0.025em | Headings grandes     |
| `tracking-normal` | 0        | Cuerpo ★             |
| `tracking-wide`   | 0.025em  | Labels en mayúsculas |

**Convención para números financieros:**

```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

Siempre usar `tabular-nums` en montos para alineación perfecta de columnas.

### Espaciado

Sistema basado en escala de 4px (estándar de la industria).

```typescript
spacing: {
  0:    "0px",
  px:   "1px",
  0.5:  "2px",
  1:    "4px",
  1.5:  "6px",
  2:    "8px",
  2.5:  "10px",
  3:    "12px",
  3.5:  "14px",
  4:    "16px",   // Espaciado base ★
  5:    "20px",
  6:    "24px",   // Espaciado entre secciones ★
  7:    "28px",
  8:    "32px",   // Espaciado entre bloques grandes
  10:   "40px",
  12:   "48px",   // Espaciado de página
  16:   "64px",
  20:   "80px",
  24:   "96px",
}
```

**Densidad "Comfortable" — reglas de uso:**

- Padding interno de cards: `p-6` (24px)
- Gap entre cards en grid: `gap-6` (24px)
- Margen entre secciones de página: `mb-8` (32px)
- Padding horizontal de páginas: `px-6 lg:px-8`
- Altura mínima de filas en tabla: `h-12` (48px)
- Altura de botones: `h-10` (40px)

### Bordes y radios

```typescript
borderRadius: {
  none:    "0",
  sm:      "4px",     // Inputs pequeños, badges
  base:    "6px",     // Botones, inputs ★
  md:      "8px",     // Cards pequeños
  lg:      "12px",    // Cards principales ★
  xl:      "16px",    // Cards destacados
  "2xl":   "24px",    // Modales
  full:    "9999px",  // Avatares, pills
}

borderWidth: {
  0:    "0px",
  1:    "1px",   // Default ★
  2:    "2px",
  4:    "4px",
}
```

### Sombras (elevación)

Sombras sutiles, profesionales, sin exageraciones:

```typescript
boxShadow: {
  // Sin sombra
  none: "none",

  // Sombras de elevación
  xs: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
  sm: "0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
  md: "0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
  lg: "0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.04)",
  xl: "0 20px 25px -5px rgb(15 23 42 / 0.08), 0 8px 10px -6px rgb(15 23 42 / 0.04)",

  // Sombras especiales
  card:        "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)",
  "card-hover": "0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
  popup:       "0 12px 28px -8px rgb(15 23 42 / 0.16)",

  // Focus rings (en lugar de outline)
  "focus":      "0 0 0 3px rgb(5 150 105 / 0.2)",
  "focus-error": "0 0 0 3px rgb(220 38 38 / 0.2)",
}
```

### Animaciones y transiciones

```typescript
transitionDuration: {
  fast:    "100ms",   // Hover instant feedback
  base:    "150ms",   // Default ★
  slow:    "250ms",   // Modales, drawers
  slower:  "400ms",   // Animaciones decorativas
}

transitionTimingFunction: {
  smooth:    "cubic-bezier(0.4, 0, 0.2, 1)",      // Default ★
  bounce:    "cubic-bezier(0.34, 1.56, 0.64, 1)", // Solo decorativo
  enter:     "cubic-bezier(0, 0, 0.2, 1)",        // Entrar
  exit:      "cubic-bezier(0.4, 0, 1, 1)",        // Salir
}
```

**Reglas:**

- Hovers de botones e inputs: `transition-colors duration-150`
- Aparición de modales: `duration-250`
- Cambios de números (KPIs): animación con `framer-motion` y `easeOut`

### Z-index (capas)

Sistema controlado para evitar conflictos:

```typescript
zIndex: {
  base:        "0",     // Contenido normal
  raised:      "10",    // Cards con hover
  dropdown:    "50",    // Menús desplegables
  sticky:      "100",   // Headers sticky
  drawer:      "200",   // Drawers laterales
  modal:       "300",   // Modales
  popover:     "400",   // Tooltips, popovers
  toast:       "500",   // Notificaciones toast
  loading:     "999",   // Loading overlays globales
}
```

---

## Modos claro y oscuro

Ambos disponibles con switcher en topbar. Por defecto: claro.

### Mapeo semántico (variables CSS)

```css
:root {
  /* Backgrounds */
  --background: var(--slate-50); /* Fondo principal */
  --foreground: var(--slate-900); /* Texto principal */
  --card: white; /* Fondo de cards */
  --card-foreground: var(--slate-900);
  --muted: var(--slate-100); /* Fondos secundarios */
  --muted-foreground: var(--slate-500);
  --border: var(--slate-200);
  --input: var(--slate-200);
  --ring: var(--jade-600);

  /* Marca */
  --primary: var(--jade-600);
  --primary-foreground: white;

  /* Sidebar */
  --sidebar: white;
  --sidebar-border: var(--slate-200);
  --sidebar-foreground: var(--slate-700);
  --sidebar-active: var(--jade-50);
  --sidebar-active-foreground: var(--jade-700);
}

.dark {
  --background: var(--slate-950);
  --foreground: var(--slate-50);
  --card: var(--slate-900);
  --card-foreground: var(--slate-50);
  --muted: var(--slate-800);
  --muted-foreground: var(--slate-400);
  --border: var(--slate-800);
  --input: var(--slate-800);
  --ring: var(--jade-500);

  --primary: var(--jade-500);
  --primary-foreground: var(--slate-950);

  --sidebar: var(--slate-900);
  --sidebar-border: var(--slate-800);
  --sidebar-foreground: var(--slate-300);
  --sidebar-active: var(--jade-950);
  --sidebar-active-foreground: var(--jade-300);
}
```

---

## Componentes base

### Buttons

**Variantes:**

| Variante            | Uso                              |
| ------------------- | -------------------------------- |
| `default` (primary) | Acción principal de página       |
| `secondary`         | Acción secundaria                |
| `outline`           | Acción terciaria, cancelar       |
| `ghost`             | Acciones de bajo peso, en tablas |
| `destructive`       | Eliminar, descartar              |
| `link`              | Navegación inline                |

**Tamaños:**

| Tamaño    | Altura | Padding | Uso                                  |
| --------- | ------ | ------- | ------------------------------------ |
| `sm`      | 32px   | px-3    | Acciones en filas, badges con acción |
| `default` | 40px   | px-4    | Acciones generales ★                 |
| `lg`      | 44px   | px-6    | CTAs principales                     |
| `icon`    | 40x40  | -       | Solo icono                           |

**Estados:**

- Default
- Hover (background -1 step)
- Active (background -2 steps)
- Disabled (opacity 50%, cursor not-allowed)
- Loading (spinner reemplaza icono o se muestra al inicio)
- Focus (ring de 3px)

### Cards

**Estructura base:**

```
┌─────────────────────────────┐
│ Header (opcional)           │ ← p-6 pb-0
│   Title                     │
│   Description               │
├─────────────────────────────┤
│ Content                     │ ← p-6
│   ...                       │
├─────────────────────────────┤
│ Footer (opcional)           │ ← p-6 pt-0
└─────────────────────────────┘
```

**Variantes:**

- `default`: borde sutil, fondo blanco
- `elevated`: con shadow-card, sin borde
- `outlined`: solo borde, sin fondo
- `interactive`: con hover state (cursor pointer, shadow-card-hover)

### Inputs

**Estados:**

- Default: borde slate-300, fondo blanco
- Hover: borde slate-400
- Focus: borde jade-600, ring jade-200
- Error: borde critical-600, ring critical-200
- Disabled: bg slate-100, cursor not-allowed
- Read-only: bg slate-50, sin borde de hover

**Tamaños:** sm (h-8), default (h-10), lg (h-12)

### Tables

**Reglas para tablas de datos financieros:**

- Header: bg slate-50, font-semibold, text-xs uppercase tracking-wide, slate-600
- Filas: bg white, hover bg slate-50
- Filas alternadas (zebra): bg-slate-50 cada 2 filas (opcional, configurable)
- Bordes: solo border-bottom slate-200
- Padding celdas: py-3 px-4
- Números: text-right tabular-nums
- Texto: text-left
- Acciones: text-right
- Sticky header al scrollear

**Componentes de tabla:**

- Toolbar (búsqueda, filtros)
- Tabla con sorting visual
- Footer con paginación
- Empty state cuando no hay datos
- Loading state con skeletons

### Badges (status indicators)

**Variantes semánticas:**

```
┌──────────────┐
│ ● Saludable  │  bg-success-50, text-success-700, border-success-200
│ ● Precaución │  bg-warning-50, text-warning-700, border-warning-200
│ ● En riesgo  │  bg-danger-50,  text-danger-700,  border-danger-200
│ ● Crítico    │  bg-critical-50,text-critical-700,border-critical-200
│ ● Neutral    │  bg-slate-100,  text-slate-700,   border-slate-200
└──────────────┘
```

Badges con punto al inicio para indicar estado de un solo vistazo.

### Empty states

Cada tabla y lista debe tener un empty state que incluya:

- Icono ilustrativo (Lucide outline, 48px)
- Título descriptivo
- Mensaje secundario
- CTA cuando aplique

### Loading states

- **Skeletons** (no spinners) para contenido que se está cargando
- **Spinners** solo para acciones puntuales (botón guardando)
- **Shimmer effect** sutil en skeletons

---

## Componentes específicos del producto

### KPI Card

El componente más importante del sistema. Aparece decenas de veces en dashboards.

```
┌────────────────────────────────────┐
│ INGRESOS DEL MES               ↗   │ ← label + trend icon
│                                    │
│ $1,247,500                         │ ← valor grande, font-mono tabular
│                                    │
│ ▲ 12.5% vs. mes anterior           │ ← comparativo, color según signo
└────────────────────────────────────┘
```

**Anatomía:**

- Label: text-xs uppercase tracking-wide font-medium slate-500
- Valor: text-3xl font-semibold tabular-nums (color según contexto)
- Comparativo: text-sm con icono de flecha
- Padding: p-6
- Border: 1px slate-200, radius lg

**Variantes:**

- `default`: valor en slate-900
- `success`: valor en success-700
- `warning`: valor en warning-700
- `critical`: valor en critical-700

### Semáforo (financial health indicator)

```
┌────────────────────────────────────┐
│  Salud financiera                  │
│                                    │
│  ●  ●  ●  ●                        │ ← 4 círculos, el activo brilla
│                                    │
│  ESTABLE                           │
│  El flujo está dentro del rango    │
│  saludable este mes.               │
└────────────────────────────────────┘
```

**Estados:**

- 🟢 Saludable (verde)
- 🟡 Precaución (amarillo)
- 🟠 En riesgo (naranja)
- 🔴 Crítico (rojo)

Animación suave de pulso en el círculo activo.

### Empresa Selector

Dropdown en topbar:

```
┌──────────────────────────────┐
│ ▼ MIHBAH                     │
└──────────────────────────────┘
        ↓ click
┌──────────────────────────────┐
│ 🏠 Todas las empresas        │
│ ─────────────────────────────│
│ ⚒  MIHBAH        ✓           │
│ 💎 YCDI                      │
│ 🌉 BM CORP                   │
└──────────────────────────────┘
```

Cada empresa con su icono. La activa con checkmark.

### Excel Drop Zone

Área grande con dashed border para drag and drop:

```
┌───────────────────────────────────────┐
│                                       │
│             📄 ↓                      │
│                                       │
│  Arrastra tu archivo Excel aquí       │
│  o haz clic para seleccionar         │
│                                       │
│  Formatos: .xlsx, .xls (max 10MB)    │
│                                       │
└───────────────────────────────────────┘
```

**Estados:**

- Idle: dashed border slate-300, bg slate-50
- Dragging over: border jade-600, bg jade-50, scale 1.02
- Uploading: progress bar
- Success: border success-600, checkmark verde
- Error: border critical-600, mensaje en rojo

### AI Chat Panel

Sidebar derecho colapsable, 400px de ancho:

```
┌─────────────────────────┐
│ 🤖 Asistente Jade   ✕   │ ← header
├─────────────────────────┤
│                         │
│  💬 Hola, ¿cómo va...   │ ← user message
│                         │
│  🤖 Este mes el flujo   │ ← AI message
│      de MIHBAH es...    │
│      [tabla de datos]   │
│                         │
│  💬 Y los proyectos?    │
│                         │
├─────────────────────────┤
│ ↗ Pregunta sobre...     │ ← input + actions
│ [Adjuntar Excel]        │
└─────────────────────────┘
```

### Sidebar Navigation

Sidebar izquierdo, 256px de ancho:

```
┌─────────────────────┐
│  [Logo Universo]    │
├─────────────────────┤
│  Empresa: MIHBAH ▼  │ ← Empresa selector embebido
├─────────────────────┤
│  📊 Dashboard       │
│  📈 Flujo de Caja   │
│  🏗  Proyectos      │
│  💰 Cuentas         │
│  📑 Reportes        │
│  📥 Cargas Excel    │
├─────────────────────┤
│  ⚙  Admin           │ ← solo SUPER_ADMIN
├─────────────────────┤
│  👤 Usuario         │
│  ⏻ Cerrar sesión    │
└─────────────────────┘
```

**Estados de items:**

- Default: text-slate-700
- Hover: bg-slate-100
- Active: bg-jade-50, text-jade-700, border-l-2 border-jade-600
- Disabled: opacity 50%

---

## Patterns de pantalla

### Layout autenticado

```
┌────────────────────────────────────────────────────┐
│  Topbar (h-16)                                     │
├──────┬─────────────────────────────────┬───────────┤
│      │                                 │           │
│ Side │  Main content                   │ AI Panel  │
│ bar  │                                 │ (collap-  │
│ 256px│  max-w-7xl                      │  sible)   │
│      │  px-6 lg:px-8 py-6              │ 400px     │
│      │                                 │           │
└──────┴─────────────────────────────────┴───────────┘
```

### Layout dashboard

```
┌────────────────────────────────────────────────────┐
│  Page Title + Period Filter                        │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │ ← 4 KPI cards
│  │ KPI  │ │ KPI  │ │ KPI  │ │ KPI  │               │
│  └──────┘ └──────┘ └──────┘ └──────┘               │
│                                                    │
│  ┌────────────────────────┐ ┌────────────────────┐ │
│  │  Gráfica principal     │ │  Semáforo + alerts │ │ ← 2/3 + 1/3
│  │                        │ │                    │ │
│  │                        │ │                    │ │
│  └────────────────────────┘ └────────────────────┘ │
│                                                    │
│  ┌────────────────────────────────────────────────┐│
│  │  Tabla de movimientos / proyectos              ││
│  │                                                ││
│  └────────────────────────────────────────────────┘│
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Iconografía

**Sistema:** Lucide React

**Tamaños estándar:**

- `size-3` (12px): inline en texto
- `size-4` (16px): botones pequeños, badges
- `size-5` (20px): default ★
- `size-6` (24px): headings, navegación principal
- `size-8` (32px): empty states
- `size-12` (48px): empty state hero icons

**Convención:**

- Ingresos: `TrendingUp`
- Egresos: `TrendingDown`
- Empresas: `Building2`
- Proyectos: `FolderKanban`
- Cuentas: `Wallet`
- Reportes: `FileBarChart`
- Cargas Excel: `FileSpreadsheet`
- IA: `Sparkles` o `Bot`
- Admin: `Settings`
- Usuario: `User`
- Cerrar sesión: `LogOut`
- Saludable: `CheckCircle2`
- Precaución: `AlertCircle`
- Crítico: `AlertOctagon`

---

## Grid y breakpoints

```typescript
screens: {
  sm:   "640px",   // Mobile landscape
  md:   "768px",   // Tablet
  lg:   "1024px",  // Desktop ★
  xl:   "1280px",
  "2xl":"1536px",
}
```

**Container widths:**

- Mobile: full width con `px-4`
- Tablet+: max-w-7xl (1280px)
- Páginas de detalle: max-w-5xl (1024px)
- Forms: max-w-2xl (672px)

**Grid de dashboard:**

- 1 columna en mobile
- 2 columnas en tablet
- 4 columnas en desktop (KPIs)
- Gap-6 (24px)

---

## Accesibilidad

### Contraste

- Texto normal: mínimo 4.5:1
- Texto grande (18px+ o 14px+ bold): mínimo 3:1
- Componentes UI: mínimo 3:1
- Verificación con: WebAIM Contrast Checker

### Foco visible

- Todos los elementos interactivos tienen focus ring
- Ring de 3px con color primario y opacity 20%
- Nunca usar `outline: none` sin reemplazo

### Navegación por teclado

- Tab order lógico
- Esc cierra modales y dropdowns
- Arrow keys navegan dropdowns y menús
- Enter/Space activan botones

### ARIA

- `aria-label` en iconos sin texto
- `aria-describedby` en inputs con descripción
- `aria-live` en notificaciones
- `role` en componentes custom

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Archivo de tokens centralizado

Todo lo anterior se concentra en **un solo archivo** para que cambiar la identidad visual del producto sea trivial.

Estructura del archivo `lib/design-tokens.ts`:

```typescript
export const designTokens = {
  brand: {
    name: 'Jade',
    primary: '#059669',
    primaryDark: '#047857',
    logo: '/logos/jade.svg',
  },

  colors: {
    jade: {
      /* ... */
    },
    slate: {
      /* ... */
    },
    success: {
      /* ... */
    },
    warning: {
      /* ... */
    },
    danger: {
      /* ... */
    },
    critical: {
      /* ... */
    },
    info: {
      /* ... */
    },
  },

  typography: {
    fontFamily: {
      /* ... */
    },
    fontSize: {
      /* ... */
    },
    fontWeight: {
      /* ... */
    },
    letterSpacing: {
      /* ... */
    },
  },

  spacing: {
    /* ... */
  },
  borderRadius: {
    /* ... */
  },
  borderWidth: {
    /* ... */
  },
  boxShadow: {
    /* ... */
  },
  transitionDuration: {
    /* ... */
  },
  transitionTimingFunction: {
    /* ... */
  },
  zIndex: {
    /* ... */
  },
  screens: {
    /* ... */
  },
} as const

export type DesignTokens = typeof designTokens
```

**Para cambiar la identidad visual completa**, solo se edita este archivo y todo el sistema se actualiza automáticamente porque:

1. `tailwind.config.ts` lo importa y lo expone como utilities
2. `globals.css` define variables CSS con sus valores
3. Componentes consumen las utilities de Tailwind o las variables CSS

---

## Convenciones de código UI

### Cómo nombrar variantes

Usamos `cva` (class-variance-authority) para variantes consistentes:

```typescript
const buttonVariants = cva('base classes', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      default: 'h-10 px-4',
      lg: 'h-12 px-6 text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
```

### Composición sobre props

Componentes pequeños y composables, no monolitos con 50 props:

```tsx
// ✅ Bueno
<Card>
  <CardHeader>
    <CardTitle>Ingresos</CardTitle>
    <CardDescription>Mes actual</CardDescription>
  </CardHeader>
  <CardContent>$1,247,500</CardContent>
</Card>

// ❌ Malo
<Card title="Ingresos" description="Mes actual" content="$1,247,500" />
```

### Tipos estrictos

Cada componente exporta sus tipos:

```typescript
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
  icon?: ReactNode
}
```

---

## Checklist de implementación

Cuando se construye un componente nuevo, debe cumplir:

- [ ] Usa solo tokens de diseño (no valores hardcoded)
- [ ] Soporta modo claro y oscuro
- [ ] Tiene focus visible
- [ ] Es accesible por teclado
- [ ] Tiene estados: default, hover, active, disabled, loading
- [ ] Tiene tipos TypeScript estrictos
- [ ] Tiene un test básico de renderizado
- [ ] Documentado en Storybook (futuro)
- [ ] Responsive en mobile, tablet, desktop

---

**Fin del Design System.**

Cualquier cambio de identidad visual debe hacerse editando `lib/design-tokens.ts`. Los componentes nunca usan valores hardcoded.
