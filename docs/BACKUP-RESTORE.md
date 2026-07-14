# Respaldo y restauración

## Alcance

La continuidad del sistema depende de dos respaldos independientes:

1. PostgreSQL: configuración, usuarios y datos de negocio.
2. Volumen `COMPROBANTES_DIR`: archivos de comprobantes subidos.

Respaldar solo uno de los dos deja la recuperación incompleta.

## Reglas de seguridad

- Ejecutar comandos desde una sesión SSH individual y autorizada en el VPS.
- No guardar respaldos permanentemente dentro del repositorio o contenedor de la aplicación.
- Cifrar los archivos antes de trasladarlos fuera del VPS.
- Limitar acceso por persona y conservar un registro de descargas/restauraciones.
- Nunca escribir `DATABASE_URL` en comandos que queden visibles en documentación o historial compartido.

## Respaldo de PostgreSQL

Con `DATABASE_URL` disponible en la sesión segura:

```bash
mkdir -p /tmp/mihbah-backup
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" --file=/tmp/mihbah-backup/mihbah.dump
pg_restore --list /tmp/mihbah-backup/mihbah.dump > /tmp/mihbah-backup/mihbah.contents.txt
```

Verificaciones mínimas:

- `pg_dump` termina con código 0.
- El archivo no está vacío.
- `pg_restore --list` puede leerlo.
- El respaldo se copia a la ubicación cifrada y administrada definida por el responsable.

## Respaldo del volumen de comprobantes

Confirmar primero el valor real de `COMPROBANTES_DIR`:

```bash
test -n "$COMPROBANTES_DIR"
test -d "$COMPROBANTES_DIR"
tar -czf /tmp/mihbah-backup/comprobantes.tar.gz -C "$COMPROBANTES_DIR" .
tar -tzf /tmp/mihbah-backup/comprobantes.tar.gz > /tmp/mihbah-backup/comprobantes.contents.txt
```

## Restauración en un entorno aislado

La prueba de restauración debe realizarse primero en una base vacía que no sea producción:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$RESTORE_DATABASE_URL" /ruta/segura/mihbah.dump
```

Después:

1. Aplicar las políticas RLS correspondientes al commit restaurado.
2. Restaurar los comprobantes en un volumen de prueba.
3. Levantar la aplicación con variables de prueba.
4. Validar login, tenants, empresas, reportes y acceso a comprobantes.
5. Registrar fecha, resultado y responsable.

## Restauración en producción

Requiere autorización explícita porque puede reemplazar datos posteriores al respaldo:

- [ ] Incidente y alcance documentados.
- [ ] Hora de corte acordada.
- [ ] Servicios de escritura detenidos.
- [ ] Respaldo adicional del estado actual.
- [ ] Archivo de respaldo verificado.
- [ ] Restauración ejecutada por responsable autorizado.
- [ ] Políticas RLS verificadas.
- [ ] Volumen de comprobantes reconciliado.
- [ ] Smoke tests aprobados.
- [ ] Usuarios informados.

## Política por definir

- Frecuencia: diaria recomendada para BD; confirmar con el propietario.
- Retención: por confirmar.
- Destino cifrado externo al VPS: por confirmar.
- Responsable de supervisar fallos: por confirmar.
- Prueba periódica de restauración: mensual recomendada; por confirmar.
- RPO y RTO contractuales: por confirmar.
