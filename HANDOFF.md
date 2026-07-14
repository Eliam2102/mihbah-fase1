# Handoff técnico — MIHBAH Fase 1

**Fecha de preparación:** 13 de julio de 2026  
**Repositorio:** `Eliam2102/mihbah-fase1`  
**Rama de referencia y despliegue:** `feat--socios`  
**Commit base validado:** `fe36765`  
**Aplicación administrativa:** <https://universodejade.cloud>  
**Portal de socios:** <https://universodejade.cloud/portal/login>

## 1. Objetivo de la entrega

Entregar la operación técnica de la plataforma SIG Jade/MIHBAH Fase 1. El sistema centraliza información de MIHBAH, YCDI y BM CORP, con aislamiento multi-tenant, cargas Excel, sincronización con Monday.com, dashboards, módulos financieros, comisiones y portal de socios.

## 2. Fuente de verdad

- Toda actualización de producción debe partir de `feat--socios`.
- `fix--csv` fue integrado en `feat--socios` el 13 de julio de 2026.
- Las ramas remotas existentes fueron sincronizadas con la rama de referencia.
- No desplegar una rama distinta sin aprobación y validación previa.
- Crear una etiqueta de versión antes de la entrega formal. Sugerencia: `v1.0.0-handoff`.

## 3. Infraestructura conocida

| Componente            | Estado conocido                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------- |
| VPS                   | DigitalOcean; acceso administrado fuera del repositorio                                       |
| Operación             | VPS administrado directamente; gestor de proceso por confirmar                                |
| Dominio               | `universodejade.cloud` con HTTPS                                                              |
| Aplicación            | Next.js 16, salida `standalone`                                                               |
| Base de datos         | PostgreSQL 16 con Drizzle ORM y RLS                                                           |
| Archivos              | Volumen persistente configurado mediante `COMPROBANTES_DIR`                                   |
| Datos BM CORP         | Sincronización con Monday.com                                                                 |
| Observabilidad        | Sentry, proyecto `sig-jade`                                                                   |
| Alternativa histórica | `render.yaml` permanece en el repositorio, pero no representa el despliegue activo confirmado |

## 4. Entregables incluidos

- [README técnico](README.md)
- [Guía de despliegue](docs/DEPLOYMENT.md)
- [Respaldo y restauración](docs/BACKUP-RESTORE.md)
- [Inventario de accesos](docs/ACCESS-INVENTORY.md)
- [Problemas conocidos](docs/KNOWN-ISSUES.md)
- [Checklist de aceptación](docs/ACCEPTANCE-CHECKLIST.md)
- `.env.example` sin valores secretos
- Migraciones Drizzle y políticas RLS versionadas
- Documentación operativa del módulo de comisiones en `docs/`

## 5. Seguridad antes de entregar

> **Acción obligatoria:** la documentación histórica de infraestructura en Notion contiene una clave privada SSH y un token de Monday.com en texto visible. Ambos deben revocarse y rotarse antes de transferir accesos.

- No copiar secretos a Git, tickets, correos o documentos compartidos.
- Entregar valores mediante un gestor de contraseñas con acceso individual y auditable.
- Usar una clave SSH independiente por persona; no compartir claves privadas.
- Validar que la aplicación de producción usa un usuario PostgreSQL sin privilegios de superusuario para que RLS sea efectivo.
- Confirmar `FIELD_ENCRYPTION_KEY` antes de operar datos bancarios cifrados. No rotarla sin una migración de datos.

## 6. Validación técnica realizada

En la rama consolidada se verificó:

- `npm run build`: aprobado.
- `npm run type-check`: aprobado.
- `npm run lint`: sin errores, con advertencias pendientes documentadas.
- Pruebas unitarias: aprobadas.
- Pruebas de integración: requieren PostgreSQL preparado y datos seed; deben repetirse durante la aceptación.

## 7. Responsabilidades por confirmar

| Responsabilidad                        | Responsable                  |
| -------------------------------------- | ---------------------------- |
| Propiedad del repositorio GitHub       | Por confirmar                |
| Administración del VPS en DigitalOcean | Por confirmar                |
| Administración de dominio y DNS        | Por confirmar                |
| Backups y restauraciones               | Por confirmar                |
| Administración de Monday.com           | Por confirmar                |
| Monitoreo y alertas de Sentry          | Por confirmar                |
| Soporte funcional                      | Kaptal/MIHBAH, por confirmar |
| Soporte técnico posterior al handoff   | Por confirmar                |

## 8. Cierre del handoff

La entrega se considera aceptada cuando:

1. Los accesos rotados han sido transferidos de forma segura.
2. La persona receptora puede entrar a GitHub, DigitalOcean/VPS, Sentry y Monday según su responsabilidad.
3. Se completa el checklist funcional en producción.
4. Se obtiene y verifica un respaldo de base de datos y del volumen de comprobantes.
5. Se demuestra un rollback controlado o se revisa su procedimiento.
6. Se registran por escrito pendientes, responsables y periodo de soporte.
7. Las partes firman o confirman el acta de entrega.

## 9. Fuentes utilizadas

Este documento se preparó contrastando el repositorio con las páginas de Notion “MIHBAH”, “Infraestructura”, “Despliegue”, “Documento alcance de Fases”, “Manual de usuarios” y el plan de desarrollo por épicas. Ante diferencias, la configuración observada en producción y el repositorio desplegado deben verificarse antes de ejecutar cambios.
