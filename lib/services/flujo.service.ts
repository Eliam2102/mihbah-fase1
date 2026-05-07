// Re-export desde flujo/ para compatibilidad con imports existentes.
// migrations gradual: los imports de `@/lib/services/flujo.service` seguirán funcionando.
export * from './flujo/flujo.types'
export * from './flujo/flujo.service'
