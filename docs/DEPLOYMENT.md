# Despliegue y rollback

## Entorno oficial

- Proveedor: DigitalOcean.
- Operación: VPS administrado directamente.
- Gestor de proceso: por confirmar (PM2, Docker Compose o systemd).
- Rama desplegada: `feat--socios`.
- Admin: <https://universodejade.cloud>
- Portal: <https://universodejade.cloud/portal/login>
- Healthcheck esperado: <https://universodejade.cloud/api/health>

`render.yaml` es una configuración alternativa histórica y no representa el despliegue activo en DigitalOcean.

## Precondiciones

- Acceso personal a DigitalOcean y acceso SSH individual al VPS.
- Acceso de lectura al repositorio GitHub.
- Backup reciente de PostgreSQL y del volumen de comprobantes.
- Variables de producción verificadas contra `.env.example`.
- Ventana de cambio comunicada.
- Commit objetivo identificado y validado.

## Flujo de despliegue en el VPS

1. Entrar al VPS con la clave SSH individual autorizada.
2. Entrar al directorio del proyecto, cuya ruta debe confirmarse durante el handoff.
3. Confirmar que el remoto apunta a `Eliam2102/mihbah-fase1`.
4. Confirmar que la rama activa es `feat--socios`.
5. Registrar el commit actualmente desplegado.
6. Generar y verificar los respaldos descritos en `BACKUP-RESTORE.md`.
7. Actualizar la aplicación y construir el commit aprobado:

```bash
cd <RUTA_DEL_PROYECTO>
git status --short --branch
git fetch origin
git switch feat--socios
git pull --ff-only origin feat--socios
npm ci
npm run db:migrate
npm run db:rls-prod
npm run build
```

8. Reiniciar la aplicación con el gestor real del VPS. El comando debe confirmarse antes de la entrega; podría ser PM2, Docker Compose o systemd.
9. Revisar logs hasta confirmar que Next.js inició correctamente.
10. Ejecutar los smoke tests de `ACCEPTANCE-CHECKLIST.md`.

> No ejecutar `db:seed`, `db:seed-comisiones`, `db:push`, `clean-db` ni scripts con opción `--fix` en producción sin respaldo, revisión y autorización explícita.

## Variables mínimas de producción

| Variable                 | Uso                   | Tratamiento                                |
| ------------------------ | --------------------- | ------------------------------------------ |
| `DATABASE_URL`           | PostgreSQL            | Secreta                                    |
| `BETTER_AUTH_SECRET`     | Firma de sesiones     | Secreta; rotación cierra/invalida sesiones |
| `BETTER_AUTH_URL`        | URL pública           | `https://universodejade.cloud`             |
| `SECURE_COOKIES`         | Cookies HTTPS         | Debe activarse en producción               |
| `FIELD_ENCRYPTION_KEY`   | Cifrado de campos     | Secreta y crítica; no rotar sin migración  |
| `MONDAY_API_KEY`         | Integración Monday    | Secreta; rotar antes del handoff           |
| `MONDAY_BOARD_ID`        | Board principal       | Configuración                              |
| `COMPROBANTES_DIR`       | Archivos persistentes | Debe apuntar al volumen montado            |
| `NEXT_PUBLIC_SENTRY_DSN` | Telemetría            | Verificar proyecto `sig-jade`              |

## Smoke tests posteriores

```bash
curl --fail --silent --show-error https://universodejade.cloud/api/health
```

Después verificar manualmente:

- Login administrativo.
- Selección de MIHBAH, YCDI y BM CORP.
- Dashboard general.
- Sincronización Monday sin ejecutarla dos veces accidentalmente.
- Portal de socios y descarga CSV.
- Lectura de comprobantes existentes.
- Eventos y errores recientes en Sentry.

## Rollback de aplicación

1. Detener nuevos despliegues y registrar el incidente.
2. Identificar el último commit estable.
3. Volver a desplegar el último commit estable usando el procedimiento confirmado del VPS.
4. No revertir migraciones automáticamente.
5. Si hubo una migración incompatible, restaurar la base únicamente con el procedimiento aprobado.
6. Confirmar healthcheck, login, portal y funciones críticas.
7. Documentar hora, responsable, causa y resultado.

## Rollback de base de datos

Las migraciones no incluyen un rollback automático garantizado. Una restauración puede eliminar cambios posteriores al respaldo. Seguir `BACKUP-RESTORE.md` y obtener autorización explícita del responsable de datos.

## Datos por confirmar antes del handoff

- Ruta exacta del repositorio en el VPS.
- Gestor de proceso real y nombre exacto del servicio.
- Comandos exactos de reinicio, estado y logs.
- Ruta exacta del volumen persistente.
- Usuario Linux autorizado y política SSH.
- Nombre del servicio PostgreSQL y política de backups automáticos.
- Método exacto de despliegue automático/manual.
- Canal de incidentes y responsables de aprobación.
