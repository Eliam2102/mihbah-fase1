# Deploy — Módulo de Comisiones BM CORP a Easypanel

> Pasos para levantar el módulo en producción. Una sola vez por instalación. Reglas críticas señaladas con ⚠️.

---

## 1. Pre-flight

- [ ] Repositorio sincronizado con `master` (no `fix--features`)
- [ ] `npm run build` pasa local
- [ ] `npm test` pasa (20+ verdes)
- [ ] `npm run type-check` pasa
- [ ] Doc YESYUCAN v5 actualizado en `/Applications/YESYUCAN_Esquema_de_Comisiones_v5.md`

---

## 2. Variables de entorno requeridas (Easypanel)

```bash
# Existentes
DATABASE_URL="postgresql://..."          # ⚠️ NO usar role SUPERUSER (ver §5)
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="https://prod.tu-dominio.com"
NEXT_PUBLIC_BETTER_AUTH_URL="https://prod.tu-dominio.com"
MONDAY_API_KEY="..."
MONDAY_BOARD_ID="3017199126"             # validar antes deploy

# Nuevo para comisiones
COMPROBANTES_STORAGE_PATH="/data/comprobantes"  # volumen montado
```

---

## 3. Volumen persistente para comprobantes

En Easypanel, configurar:

- **Mount path**: `/data/comprobantes`
- **Size**: 10 GB inicial (los PDFs/imágenes de comprobantes)
- **Backup**: semanal

Verificación post-deploy:

```bash
# Desde el contenedor
mkdir -p /data/comprobantes/test
echo "ok" > /data/comprobantes/test/probe.txt
ls /data/comprobantes/test/  # debe listar probe.txt
```

---

## 4. Migración de DB

```bash
# Desde shell de Easypanel (con DATABASE_URL apuntando a prod)
npm run db:migrate         # aplica todas las migraciones incluido 0007_overjoyed_doctor_faustus
npm run db:rls             # aplica políticas RLS
npm run db:seed            # solo si DB vacía (revisa antes)
npm run db:seed-comisiones # 15 alianzas + 2 esquemas + matrices
```

⚠️ Si `db:migrate` falla por journal vacío (caso replicado en dev local), usar:

```bash
echo "y" | npm run db:push
```

---

## 5. Role de DB no-SUPERUSER ⚠️ CRÍTICO

> **Local ya provisionado (2026-05-19):** existe `mihbah_app` en local con grants completos pero sin SUPERUSER/BYPASSRLS. Los tests RLS pasan. Para deploy a Easypanel, replicar misma configuración con password seguro.

**Problema:** RLS no aplica a roles superuser. Si el role app es SUPERUSER, todo el aislamiento multi-tenant queda **inoperante** a nivel DB.

**Setup correcto:**

```sql
-- Conectado como bootstrap user (postgres)
CREATE USER mihbah_app WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Grants mínimos para la app
GRANT CONNECT ON DATABASE mihbah_prod TO mihbah_app;
GRANT USAGE ON SCHEMA public TO mihbah_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mihbah_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mihbah_app;

-- Para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mihbah_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO mihbah_app;

-- ⚠️ NO darle SUPERUSER ni BYPASSRLS
-- Verificar:
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'mihbah_app';
-- Debe ser: f | f
```

Cambia `DATABASE_URL` en Easypanel para que use `mihbah_app` en lugar del role bootstrap.

**Validación:** después del cambio, corre `tests/integration/tenant-isolation.test.ts` y debe pasar (quitar el `describe.skip`).

---

## 6. Crear primer admin del cliente

```sql
-- Vía sql directo. Ajusta email/nombre/password hash.
INSERT INTO users (id, name, email, email_verified, role, tenant_id)
VALUES (
  gen_random_uuid()::text,
  'Joana Piña Ávila',
  'joana@vilostudio.ai',
  true,
  'super_admin',
  (SELECT id FROM tenants WHERE slug = 'universo-jade')
);
-- Password se setea desde /login → "Olvidé mi password"
```

---

## 7. Validación post-deploy

Recorrer en orden:

1. Login admin → `/login` → sesión OK
2. Cambiar empresa a **BM CORP**
3. Click **Comisiones** en sidebar → landing carga con KPIs
4. **Alianzas** → ve 15 alianzas configuradas (LGI, Flamingo, etc.)
5. **Esquemas** → ve TERRENOS y YCD
6. **Sincronización Monday** → corre sync → ver ventas
7. **Ventas con comisión** → ver 50 con cálculo correcto
8. Marca una dispersión como pagada → verifica notificación en topbar
9. **Usuarios del portal** → crea cuenta de prueba (líder y asesor)
10. Cierra sesión → `/portal/login` → entra con la cuenta de prueba
11. Verifica dashboard portal correcto y aislado

---

## 8. Capacitación a Joana

- Sesión 30 min: recorrido por `docs/comisiones-operativo.md`
- Demostración: crear líder, asesor, matriz, marcar pago
- Acceso compartido a manual operativo

---

## 9. Bloqueantes resueltos

| Bloqueante        | Estado                                       |
| ----------------- | -------------------------------------------- |
| Doc YESYUCAN v5   | ✓ cliente entregó                            |
| Plan operativo    | ✓ pendiente junta para refinar (4 preguntas) |
| Volumen Easypanel | ⏳ Eliam provisiona en deploy                |
| Role no-superuser | ⏳ §5 arriba — ANTES de exponer prod         |

---

## 10. Soporte post-deploy

- Slack: #sig-jade-soporte
- Email Eliam: operaciones@vilostudio.ai
- Manual operativo: `docs/comisiones-operativo.md`
- Issues técnicos: GitHub

---

_Deploy guide v1.0 — Mayo 2026 · SIG Jade · Universo Jade_
