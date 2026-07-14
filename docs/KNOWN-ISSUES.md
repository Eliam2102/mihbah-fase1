# Estado conocido, riesgos y pendientes

## Seguridad crítica

1. **Secretos expuestos en Notion.** Existe una clave privada SSH y un token de Monday en una página histórica. Deben rotarse antes de la transferencia.
2. **RLS depende del usuario PostgreSQL.** La aplicación debe conectarse con un rol no-superuser; un superusuario puede omitir las protecciones esperadas.
3. **`FIELD_ENCRYPTION_KEY` es irreversible sin migración.** Cambiarla directamente puede impedir descifrar datos existentes.

## Repositorio y calidad

1. `npm run lint` pasa con 64 advertencias, principalmente imports/variables sin uso y dependencias de hooks.
2. `npm run format:check` reportó formato pendiente en `docker-compose.yml`, `eslint.config.mjs`, `postcss.config.mjs` y `render.yaml` durante la auditoría previa.
3. Las pruebas de integración requieren PostgreSQL preparado, migraciones y seeds; no forman parte de una ejecución aislada sin BD.
4. `npx vitest run tests/unit` también puede descubrir copias bajo `.next/standalone` después de un build y duplicar el conteo. Limpiar `.next` o excluir esa ruta para una medición exacta.
5. El build genera una advertencia de trazado NFT relacionada con `lib/storage/comprobantes.ts` y operaciones dinámicas de filesystem.
6. Next.js advierte sobre `Cache-Control` personalizado para `/_next/static/:path*`.
7. Si `BETTER_AUTH_SECRET` no está configurado, el build puede registrar advertencias de Better Auth aunque finalice.

## Configuración inconsistente

1. `.env.example` describe PostgreSQL local en el puerto `5433`, mientras `docker-compose.yml` publica `5432`.
2. `render.yaml` describe Render, pero el entorno activo es un VPS en DigitalOcean.
3. Falta confirmar si el proceso se administra con PM2, Docker Compose o systemd, junto con los comandos exactos de reinicio y logs.
4. Confirmar el nombre exacto del volumen de comprobantes y que persista entre despliegues.
5. Confirmar que los backups automáticos existen; Notion los lista como entregable, no como evidencia de ejecución.

## Operación y alcance

1. La fuente de verdad de producción es `feat--socios`.
2. Los módulos manejan tres empresas: MIHBAH, YCDI y BM CORP.
3. MIHBAH/YCDI se alimentan principalmente mediante Excel; BM CORP usa Monday.com.
4. La documentación histórica de alcance contiene fases futuras y supuestos que no deben presentarse automáticamente como funcionalidades entregadas.
5. Kaptal aparece en Notion como contacto/intermediario principal; confirmar el canal de comunicación posterior al handoff.

## Pendientes de aceptación

- [ ] Rotar secretos expuestos.
- [ ] Verificar backups automáticos y prueba de restauración.
- [ ] Confirmar usuario no-superuser de PostgreSQL.
- [ ] Completar pruebas de integración con BD preparada.
- [ ] Completar smoke tests con la cuenta receptora.
- [ ] Confirmar responsables y periodo de soporte.
- [ ] Crear etiqueta de versión de entrega.
- [ ] Decidir si se conserva `render.yaml` o se mueve a documentación histórica.
- [ ] Corregir puerto local documentado.
- [ ] Resolver o aceptar formalmente las advertencias de lint/build.
