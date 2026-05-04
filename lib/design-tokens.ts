/**
 * SIG Jade — Design Tokens
 *
 * Único archivo de identidad visual del producto.
 * Para cambiar la identidad completa, edita este archivo.
 *
 * Estos tokens se exponen via:
 * 1. `tailwind.config.ts` — utilities de Tailwind
 * 2. `app/globals.css` — variables CSS para temas
 * 3. Componentes — vía clases de Tailwind
 *
 * Reglas:
 * - NUNCA hardcodear colores en componentes
 * - SIEMPRE usar utilities de Tailwind o variables CSS
 * - Cambiar identidad = editar SOLO este archivo
 */

export const designTokens = {
  /**
   * Información de marca
   */
  brand: {
    name: 'SIG Jade',
    tagline: 'Sistema Integral de Gestión',
    primaryColor: '#059669',
    primaryColorDark: '#10b981',
    logoLight: '/logos/jade-light.svg',
    logoDark: '/logos/jade-dark.svg',
    favicon: '/favicon.ico',
  },

  /**
   * Paleta de marca: Jade
   * Verde corporativo que comunica crecimiento, salud, estabilidad
   */
  colors: {
    jade: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669', // Primario
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22',
    },

    /**
     * Slate — neutrales corporativos
     */
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },

    /**
     * Verde — Saludable, ingresos, positivo
     */
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },

    /**
     * Ámbar — Precaución, advertencia
     */
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },

    /**
     * Naranja — En riesgo
     */
    danger: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407',
    },

    /**
     * Rojo — Crítico, egresos, error
     */
    critical: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },

    /**
     * Azul — Informativo, neutral con peso
     */
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
  },

  /**
   * Tipografía
   * Inter para todo, JetBrains Mono solo para números/código
   */
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      display: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
    },

    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
    },
  },

  /**
   * Espaciado — sistema de 4px
   */
  spacing: {
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },

  /**
   * Border radius
   */
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    base: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  /**
   * Sombras corporativas
   */
  boxShadow: {
    none: 'none',
    xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
    sm: '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
    md: '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
    lg: '0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.04)',
    xl: '0 20px 25px -5px rgb(15 23 42 / 0.08), 0 8px 10px -6px rgb(15 23 42 / 0.04)',

    card: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
    cardHover: '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
    popup: '0 12px 28px -8px rgb(15 23 42 / 0.16)',

    focus: '0 0 0 3px rgb(5 150 105 / 0.2)',
    focusError: '0 0 0 3px rgb(220 38 38 / 0.2)',
  },

  /**
   * Animaciones
   */
  transitionDuration: {
    fast: '100ms',
    base: '150ms',
    slow: '250ms',
    slower: '400ms',
  },

  transitionTimingFunction: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },

  /**
   * Z-index controlado
   */
  zIndex: {
    base: '0',
    raised: '10',
    dropdown: '50',
    sticky: '100',
    drawer: '200',
    modal: '300',
    popover: '400',
    toast: '500',
    loading: '999',
  },

  /**
   * Breakpoints
   */
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const

export type DesignTokens = typeof designTokens
