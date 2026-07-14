# Checklist de aceptación y demostración

**Fecha:** **\*\*\*\***\_\_\_\_**\*\*\*\***  
**Versión/commit:** **\*\*\*\***\_\_\_\_**\*\*\*\***  
**Persona que entrega:** **\*\*\*\***\_\_\_\_**\*\*\*\***  
**Persona que recibe:** **\*\*\*\***\_\_\_\_**\*\*\*\***

## 1. Seguridad y accesos

- [ ] Clave SSH histórica revocada y reemplazada.
- [ ] Token Monday histórico revocado y reemplazado.
- [ ] MFA habilitado donde esté disponible.
- [ ] Acceso GitHub confirmado.
- [ ] Acceso DigitalOcean y SSH individual al VPS confirmado.
- [ ] Acceso Sentry confirmado.
- [ ] Acceso Monday confirmado.
- [ ] Cuenta de aplicación receptora confirmada.
- [ ] Responsables registrados en `ACCESS-INVENTORY.md`.

## 2. Infraestructura

- [ ] `universodejade.cloud` resuelve correctamente.
- [ ] HTTPS y certificado válidos.
- [ ] `/api/health` responde correctamente.
- [ ] El repositorio del VPS despliega desde `feat--socios`.
- [ ] Gestor y nombre del proceso documentados.
- [ ] Commit desplegado coincide con la versión entregada.
- [ ] PostgreSQL está saludable.
- [ ] Usuario de aplicación PostgreSQL no es superuser.
- [ ] Volumen de comprobantes está montado y persiste.
- [ ] Sentry recibe errores/eventos del entorno correcto.

## 3. Respaldo y recuperación

- [ ] Backup de PostgreSQL generado.
- [ ] Contenido del dump verificado con `pg_restore --list`.
- [ ] Backup del volumen de comprobantes generado.
- [ ] Copia cifrada almacenada fuera del VPS.
- [ ] Responsable y retención definidos.
- [ ] Restauración probada en entorno aislado o programada con fecha.

## 4. Cuenta receptora

- [ ] Login correcto.
- [ ] Cambio de contraseña realizado/acordado.
- [ ] Rol correcto.
- [ ] Empresas correctas.
- [ ] Módulos correctos.
- [ ] No puede ver datos no autorizados.
- [ ] Cierre de sesión correcto.
- [ ] Recuperación de contraseña explicada/probada.

## 5. Funcionalidad administrativa

- [ ] Dashboard general carga.
- [ ] Selector de empresa funciona.
- [ ] Dashboard MIHBAH carga.
- [ ] Dashboard YCDI carga.
- [ ] Dashboard BM CORP carga.
- [ ] Módulo de flujo carga.
- [ ] Proyectos y detalle cargan.
- [ ] Cuentas CXC/CXP cargan.
- [ ] Reportes se visualizan/exportan.
- [ ] Historial y carga Excel se explican sin modificar producción accidentalmente.
- [ ] Sincronización Monday se explica y valida de manera controlada.

## 6. Comisiones y portal

- [ ] Ventas visibles y filtros correctos.
- [ ] Esquemas/niveles/matrices accesibles según rol.
- [ ] Cortes y tesorería visibles según rol.
- [ ] Portal de socios abre.
- [ ] Usuario del portal solo ve sus datos autorizados.
- [ ] Incidencias del portal funcionan.
- [ ] Comprobantes existentes pueden consultarse.
- [ ] Reporte CSV descarga datos y columnas esperadas.

## 7. Documentación y operación

- [ ] `README.md` revisado.
- [ ] `HANDOFF.md` revisado.
- [ ] Procedimiento de despliegue revisado.
- [ ] Procedimiento de rollback revisado.
- [ ] Procedimiento de backup/restauración revisado.
- [ ] Problemas conocidos aceptados y asignados.
- [ ] Manual de usuario de Notion/PDF compartido con el receptor.
- [ ] Canal de soporte definido.
- [ ] Duración del soporte inicial definida.

## 8. Resultado

- [ ] Aceptado sin observaciones.
- [ ] Aceptado con pendientes registrados.
- [ ] Requiere nueva validación.

### Pendientes, responsables y fecha compromiso

| Pendiente | Responsable | Fecha | Estado |
| --------- | ----------- | ----- | ------ |
|           |             |       |        |

### Confirmación

**Entrega:** **\*\*\*\***\_\_\_\_**\*\*\*\***  
**Recepción:** **\*\*\*\***\_\_\_\_**\*\*\*\***  
**Fecha:** **\*\*\*\***\_\_\_\_**\*\*\*\***
