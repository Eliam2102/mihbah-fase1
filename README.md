# MIHBAH — Fase 1

Plataforma SaaS multi-tenant para gestión financiera, comisiones y portal de socios
del grupo **Universo Jade**. Construida con Next.js 16 (App Router) + React 19,
PostgreSQL con Drizzle ORM y `_Row-Level Security_` para aislamiento de tenants.

> **Rama de entrega:** `feat--socios`
> Remote: `https://github.com/Eliam2102/mihbah-fase1.git`

---

## 1. Stack

| Capa           | Tecnología                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| Framework      | Next.js 16.2.4 (App Router, Turbopack)                                         |
| UI             | React 19, Tailwind v4, shadcn/ui, Base UI, Recharts, lucide-react              |
| Estado/Form    | Zustand, TanStack Query, react-hook-form, Zod                                  |
| Auth           | better-auth 1.6 (plugin `admin` + control de acceso por roles)                 |
| DB             | PostgreSQL 16 (`pgvector/pgvector:pg16`) + Drizzle ORM 0.45                    |
| Seguridad DB   | Row-Level Security (`lib/db/rls.sql`) por `tenant_id`                          |
| Cifrado        | `@node-rs/argon2` (passwords) + AES-256-GCM (`lib/crypto/field-encryption.ts`) |
| Observabilidad | Sentry (`@sentry/nextjs`, edge + server)                                       |
| Testing        | Vitest (unit) + Playwright (e2e)                                               |
| Tooling        | Husky + commitlint (Conventional Commits), ESLint, Prettier                    |
| Deploy         | Render (`render.yaml`) — standby Easyplan/Docker compose en local              |

---

## 2. Requisitos previos

- **Node.js ≥ 20** (recomendado 22+)
- **PostgreSQL 16** local (vía `docker-compose.yml`) o remoto
- **`psql`** instalado (lo usa `db:rls` para aplicar las políticas RLS)
- **npm** (Hay lockfile en `package-lock.json`; no usar otros gestores)

---

## 3. Puesta a punto (setup local)

```bash
# 1) Clonar y entrar
git clone https://github.com/Eliam2102/mihbah-fase1.git
cd mihbah-fase1
git checkout feat--socios   # rama de entrega

# 2) Instalar dependencias
npm ci

# 3) Variables de entorno
cp .env.example .env
# Edita .env con: DATABASE_URL, BETTER_AUTH_SECRET, MONDAY_API_KEY, MONDAY_BOARD_ID
# Genera BETTER_AUTH_SECRET y (en prod) FIELD_ENCRYPTION_KEY con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4) Levantar Postgres local (puerto 5432 por defecto — ver docker-compose.yml)
npm run db:up
#   o:  docker compose up -d

# 5) Migrar y aplicar RLS
npm run db:migrate    # drizzle-kit migrate
npm run db:rls        # psql -f lib/db/rls.sql

# 6) Seed mínimo (tenant "universo-jade" + usuarios/empresas demo)
npm run db:seed

# 7) Levantar el dev server (Turbopack)
npm run dev
#  →  http://localhost:3000
```

### Atajos útiles

| Script                         | Acción                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `npm run db:studio`            | Abre Drizzle Studio (GUI para inspeccionar la BD)          |
| `npm run db:generate`          | Genera migración a partir de cambios en `lib/db/schema.ts` |
| `npm run db:push`              | Aplica el schema directamente (solo dev, sin migración)    |
| `npm run db:seed-comisiones`   | Seed de matriz de comisiones                               |
| `npm run audit:comisiones`     | Reporte de consistencia de comisiones (read-only)          |
| `npm run audit:comisiones:fix` | Idem + intenta reparar inconsistencias                     |
| `npm run lint`                 | ESLint flat config                                         |
| `npm run type-check`           | `tsc --noEmit`                                             |
| `npm run test`                 | Vitest en modo run                                         |
| `npm run test:e2e`             | Playwright (requiere app corriendo)                        |

---

## 4. Estructura del repositorio

```
mihbah-fase1/
├── app/
│   ├── (auth)/                 # Login / recuperación (sin sesión)
│   ├── (app)/                  # App administrativa (con sesión, multi-tenant)
│   │   ├── dashboard/  cuentas/  empresa/  proyectos/
│   │   ├── cargas/  cargas-excel/  monday/
│   │   ├── comisiones/  configuracion/  reportes/  super-admin/
│   │   └── flujo/  super-admin/
│   ├── (portal)/               # Portal externo de socios (líderes/asesores)
│   ├── actions/                # Server Actions (auth + db calls)
│   └── api/                    # Routes: auth, comisiones, comprobantes, cargas, health
├── components/                 # shadcn/ui + componentes de dominio
├── lib/
│   ├── auth/                   # better-auth config + helpers + guards
│   ├── crypto/                 # field-encryption (AES-GCM)
│   ├── db/                     # schema.ts, migrations/, rls.sql, apply-rls.ts, seed.ts
│   ├── services/               # Lógica de dominio por módulo (comisiones, cuentas, ...)
│   ├── storage/                # comprobantes upload
│   ├── validations/            # Zod schemas
│   ├── monday/                  # clientes monday.com
│   └── modules.ts, modulos-config.ts   # matriz módulos ↔ tipo de empresa
├── stores/                     # Zustand stores del front
├── scripts/                    # utilidades CLI: audit, RLS prod, usuarios, seeds
├── tests/                      # tests e2e (Playwright) y unit (Vitest)
├── docs/                       # documentación operativa (no subida al repo)
├── drizzle.config.ts
├── docker-compose.yml          # Postgres local (pgvector/pg16) puerto 5432
├── render.yaml                 # blueprint de deploy en Render
├── proxy.ts                    # middleware NextRequest → redirige /portal/* y /(app)/* a login
├── sentry.edge.config.ts
├── sentry.server.config.ts
└── next.config.ts
```

---

## 5. Arquitectura

### 5.1 Multi-tenant con RLS

Cada tabla de negocio lleva `tenant_id UUID`. El aislamiento se garantiza en BD
mediante **Row-Level Security** aplicada en `lib/db/rls.sql`:

```sql
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON empresas
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (...);
```

La aplicación setea la GUC `app.current_tenant_id` por transacción
(`SET LOCAL`) — ver `lib/db/index.ts` y la `seed.ts` para el patrón.

⚠️ **Nunca** ejecutes queries de negocio sin setear el contexto de tenant.
RLS bloquea silenciosamente filas ajenas, pero las operaciones `INSERT/UPDATE`
fallarán si el `tenant_id` no coincide.

### 5.2 Auth y roles (better-auth)

Definidos en `lib/auth/config.ts`:

- **SaaS app (admin):** `user` · `admin` · `super_admin` · `super_admin_dev`
- **Portal externo:** `lider_alianza` · `asesor` · `administrativo` · `tesoreria` · `viewer`

El access control declara permisos finos sobre `user`, `session`, `portal`,
`comisiones` y `comprobantes` (ver `createAccessControl`).

Helpers de uso en Server Components / Server Actions:

| Helper                      | Qué hace                                      |
| --------------------------- | --------------------------------------------- |
| `requireUser()`             | Lanza `UnauthenticatedError` si no hay sesión |
| `isSuperAdminOrAbove(role)` | `super_admin` ó `super_admin_dev`             |
| `isAdminOrAbove(role)`      | Incluye `admin`                               |
| `isViewer(role)`            | `viewer` ó `user`                             |

Hay también guards por empresa (`lib/auth/empresa-guards.ts`) y rate-limit
(`lib/auth/rate-limiter.ts`).

### 5.3 Módulos por tipo de empresa

`lib/modulos-config.ts` define canónicamente qué módulos se habilitan por
tipo de empresa:

- **CONSTRUCTORA / CAPITAL:** dashboard, flujo, proyectos, cuentas, reportes, cargas
- **COMERCIAL:** añade `ventas`, `monday`, `comisiones`
- **DEFAULT:** solo el bloque base

Cada empresa puede tener además permisos granulares por usuario y por módulo
(`userModuloAccess` / `userEmpresaAccess` en el schema).

### 5.4 Server Actions

Las acciones viven en `app/actions/*` y son el canal preferido para escribir
datos. Toman el contexto de sesión (`requireUser`) sin necesidad de exponer
endpoints. Para casos que requieren streaming/parseo de archivos pesados se
mantienen routes en `app/api/` (cargas, comprobantes, export-excel, health).

---

## 6. Modelo de datos

`lib/db/schema.ts` define ~48 tablas con Drizzle. Grupos principales:

- **Tenancy:** `tenants`, `organizaciones`, `empresas`, `userEmpresaAccess`, `userModuloAccess`
- **Financiero clásico:** `cuentasBancarias`, `grupos`, `categorias`, `movimientos`,
  `cuentasPendientes`, `excelUploads`, `excelUploadSummaries`
- **Proyectos / aportaciones:** `proyectos`, `accionistas`, `acuerdosApostación`,
  `pagosAportación`, `desarrollos`
- **Comercial BM CORP:** `ventasBmcorp`, `repartosBmcorp`, `pautasDigitales`
- **Comisiones (núcleo Fase 1):** `afiliados`, `lideresAlianza`, `asesores`,
  `asesoresNiveles`, `nivelesMembresiaConfig`, `esquemasComision`,
  `matrizAlianzaProducto`, `matrizNivelOverride`, `comisionesCalculadas`,
  `cortesDispersion`, `ventasPagoCorte`, `dispersiones`, `bonosLider`,
  `bonosUmbralConfig`, `bonosUmbralCalculados`, `incidencias`, `comprobantesPago`
- **Monday sync:** `sincronizacionesMonday`
- **Plataforma:** `users`, `sessions`, `accounts`, `verifications`,
  `usuariosPortal`, `auditLogs`, `notifications`, `featureFlags`, `npsRegistros`

Para inspeccionar relaciones recomiendo Drizzle Studio (`npm run db:studio`).

---

## 7. Pruebas

```bash
# Unitarias
npm run test                # vitest run
npm run test:watch

# e2e (necesita la app levantada en localhost:3000)
npm run test:e2e
npm run test:e2e:ui         # modo visual interactivo
```

---

## 8. Calidad de código

- **ESLint** flat config (`eslint.config.mjs`) + preset `eslint-config-next`
- **Prettier** con `prettier-plugin-tailwindcss`
- **TypeScript** estricto (`tsconfig.json`); alias `@/*` apunta a la raíz
- **Husky** + **commitlint** (Conventional Commits) en `.husky/`
  - `pre-commit`: lint-staged (ESLint + Prettier sobre archivos staged)
  - `commit-msg`: valida el formato del mensaje
- **lint-staged** corre ESLint y Prettier sobre archivos staged

Antes de hacer commit:

```bash
npm run lint
npm run type-check
npm run test
```

---

## 9. Deploy (Render)

`render.yaml` define:

- **Database:** `mihbah-postgres` (PostgreSQL gestionado)
- **Web service:** `mihbah-fase1`
  - Build: `npm ci --include=dev && npm run build`
  - Start: `npm run db:migrate && npx tsx scripts/apply-rls-prod.ts && npm start`
  - `output: 'standalone'` activado en `next.config.ts` (imagen más liviana)

> Para Easyplan: usar Dockerfile autogen de Next.js standalone o volumenes
> montados en `COMPROBANTES_DIR` para los comprobantes.

### Variables de entorno en producción (Render dashboard)

Obligatorias:

- `DATABASE_URL` (desde la database interna de Render)
- `BETTER_AUTH_SECRET` (`generateValue: true` en render.yaml)
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL` = URL pública del deploy
- `MONDAY_API_KEY`, `MONDAY_BOARD_ID`
- `FIELD_ENCRYPTION_KEY` (32 bytes hex — ver `.env.example`)
- `SECURE_COOKIES=true`
- `NEXT_PUBLIC_SENTRY_DSN` y token del CLI Sentry en `.env.sentry-build-plugin`

El script de arranque aplica migraciones y **aplica RLS automáticamente** vía
`scripts/apply-rls-prod.ts` (no olvidar este paso al cambiar de host).

---

## 10. Seguridad — checklist

- [x] `.env*` gitignored; solo `.env.example` se versiona
- [x] `.mcp.json` gitignored (contiene el slug del workspace Sentry);
      referencia en `.mcp.example.json`
- [x] `.env.sentry-build-plugin` gitignored
- [x] RLS aplicado en todas las tablas de negocio (`npm run db:rls`)
- [x] Argon2 para hashes de password (`@node-rs/argon2`)
- [x] Cifrado AES-256-GCM para campos sensibles (`lib/crypto/field-encryption.ts`)
- [x] Rate limiting en auth (`lib/auth/rate-limiter.ts`)
- [x] middlewares de sesión (`proxy.ts`): `/portal/*` y `(app)/*` requieren sesión
- [x] Sentry activo en edge y server

Si rotas `FIELD_ENCRYPTION_KEY` tenés que migrar los datos previamente cifrados
antes de cambiar la variable — _no hay rotación automática_.

---

## 11. Notas para mantenimiento

- **Scripts one-off** (ejecución puntual): en `scripts/` están todas las utilidades CLI
  (audit-cruce-monday, recalc-todas-comisiones, setup-usuarios-bm, crear-cuentas-portal-bm…).
  Antes de correrlos en prod, leer el header del archivo.
- **Archivos locales (no subidos al repo):** `.claude/`, `.codex/`, `CLAUDE.md`,
  `AGENTS.md`, `docs/screenshots/`, `*.docx`, dumps `monday-*.json`.
  Ver `.gitignore` para la lista completa.
- **Logs/auditoría:** `auditLogs` captura acciones sensibles (creación/modificación
  de usuarios, empresas, comisiones, comprobantes). Usar para trazabilidad.
- **Detección de drift de comisiones:** `npm run audit:comisiones` semanalmente
  recomendado; reporta incosistencias entre `comisionesCalculadas` y dispersiones.

---

## 12. Roadmap (post-entrega)

- [ ] Merge `feat--socios` → `master` una vez aprobada la entrega
- [ ] Documentación operativa en `docs/` (hoy no se versiona — `*.md` está
      ignorado; ver política en `.gitignore`)
- [ ] Cobertura de tests e2e del portal (login + reportes CSV actualmente cubiertos)
- [ ] Rotación planificada de `FIELD_ENCRYPTION_KEY`
- [ ] Backups/restore procedimiento en prod

---

## 13. Contacto / Issues

Cualquier incidencia abrirla en el repo GitHub con plantilla:

```
Contexto: [admin | portal | api | deploy]
Módulo: [dashboard | comisiones | cargas | ...]
Pasos para reproducir:
Comportamiento esperado:
Logs/screenshots:
```

Para temas sensibles (secrets, RLS, datos) contactar al maintainer fuera del repo.
