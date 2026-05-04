export const jade = {
  50: '#f0fdf6',
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
} as const

export const slate = {
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
} as const

export const status = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const

export const radius = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
} as const

export const fontFamily = {
  sans: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  mono: 'var(--font-geist-mono), ui-monospace, monospace',
} as const

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
} as const

export const shadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const

export const cssVars = {
  light: {
    '--background': '#ffffff',
    '--foreground': slate[900],
    '--surface': slate[50],
    '--surface-2': slate[100],
    '--border': slate[200],
    '--input': slate[200],
    '--ring': jade[600],
    '--primary': jade[600],
    '--primary-foreground': '#ffffff',
    '--secondary': slate[100],
    '--secondary-foreground': slate[900],
    '--muted': slate[100],
    '--muted-foreground': slate[500],
    '--accent': jade[50],
    '--accent-foreground': jade[900],
    '--destructive': status.error,
    '--destructive-foreground': '#ffffff',
    '--popover': '#ffffff',
    '--popover-foreground': slate[900],
    '--card': '#ffffff',
    '--card-foreground': slate[900],
    '--radius': radius.lg,
  },
  dark: {
    '--background': '#0a0f0e',
    '--foreground': slate[50],
    '--surface': '#111917',
    '--surface-2': '#1a2620',
    '--border': '#1f2d2a',
    '--input': '#1f2d2a',
    '--ring': jade[400],
    '--primary': jade[400],
    '--primary-foreground': jade[950],
    '--secondary': '#1f2d2a',
    '--secondary-foreground': slate[50],
    '--muted': '#1a2620',
    '--muted-foreground': slate[400],
    '--accent': '#1a2620',
    '--accent-foreground': jade[300],
    '--destructive': '#7f1d1d',
    '--destructive-foreground': '#fca5a5',
    '--popover': '#111917',
    '--popover-foreground': slate[50],
    '--card': '#111917',
    '--card-foreground': slate[50],
    '--radius': radius.lg,
  },
} as const
