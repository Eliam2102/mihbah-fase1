# Inventario y transferencia de accesos

Este documento registra responsables y estado, nunca contraseñas, tokens o claves privadas.

## Alerta de rotación

La página histórica “Infraestructura” de Notion contiene una clave privada SSH y un token de Monday.com expuestos en texto. Antes del handoff:

- [ ] Revocar la clave SSH expuesta del servidor.
- [ ] Crear una clave SSH individual para cada responsable autorizado.
- [ ] Revocar y regenerar el token de Monday.com.
- [ ] Actualizar `MONDAY_API_KEY` en el entorno seguro del servicio en el VPS.
- [ ] Confirmar que la sincronización funciona con el token nuevo.
- [ ] Eliminar los valores secretos de Notion o restringir y sanear esa página.
- [ ] Revisar logs de acceso y uso de Monday por actividad no reconocida.

## Matriz de accesos

| Sistema                            | Propósito                | Responsable actual | Receptor         | Estado               |
| ---------------------------------- | ------------------------ | ------------------ | ---------------- | -------------------- |
| GitHub `Eliam2102/mihbah-fase1`    | Código y versiones       | Por confirmar      | Por confirmar    | Pendiente            |
| DigitalOcean                       | Propiedad del VPS        | Por confirmar      | Por confirmar    | Pendiente            |
| Servicio del VPS                   | Deploy, variables y logs | Por confirmar      | Por confirmar    | Identificar gestor   |
| SSH al VPS                         | Diagnóstico de servidor  | Por confirmar      | Por confirmar    | Rotación obligatoria |
| Dominio/DNS `universodejade.cloud` | DNS y SSL                | Por confirmar      | Por confirmar    | Pendiente            |
| PostgreSQL producción              | Datos y migraciones      | Por confirmar      | Por confirmar    | Pendiente            |
| Monday.com BM CORP                 | Fuente de ventas         | Por confirmar      | Por confirmar    | Rotación obligatoria |
| Sentry `universo-jade/sig-jade`    | Errores y alertas        | Por confirmar      | Por confirmar    | Pendiente            |
| Cuenta super admin                 | Administración funcional | Por confirmar      | Por confirmar    | Pendiente            |
| Cuenta de demostración             | Sesión de entrega        | Por confirmar      | Usuario receptor | Validar              |
| Gestor de secretos                 | Transferencia segura     | Por confirmar      | Por confirmar    | Definir              |

## Principio de mínimo privilegio

- GitHub: otorgar el rol mínimo requerido y proteger `feat--socios`.
- DigitalOcean: usar cuentas personales, MFA y permisos auditables.
- VPS: usar una clave SSH individual por persona y documentar el gestor del servicio.
- SSH: una clave pública por persona; nunca compartir claves privadas.
- PostgreSQL: aplicación con usuario no-superuser; acceso administrativo separado.
- Monday: token de una cuenta de servicio o responsable definido.
- Sentry: acceso al proyecto, no necesariamente a toda la organización.
- Aplicación: asignar empresas y módulos explícitos según el rol.

## Cuenta para demostración

Antes de mostrar el sistema:

- [ ] Correo confirmado con la persona receptora.
- [ ] Contraseña temporal enviada por canal seguro.
- [ ] Cambio de contraseña exigido o acordado.
- [ ] Rol verificado.
- [ ] Empresas autorizadas verificadas.
- [ ] Módulos visibles verificados.
- [ ] No usar `super_admin_dev` salvo que la demostración lo requiera.
- [ ] Probar login en ventana privada.
- [ ] Confirmar que no expone datos fuera de su alcance.

## Registro de transferencia

| Fecha         | Sistema | Acción | Entrega | Recepción | Evidencia |
| ------------- | ------- | ------ | ------- | --------- | --------- |
| Por completar |         |        |         |           |           |
