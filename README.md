# mihbah — Fase 1

SaaS multi-tenant app. Stack: Next.js 16, Tailwind v4, Drizzle ORM + Postgres 16, better-auth, React Query, Zustand.

## Requisitos

- Node.js 20+
- Docker + Docker Compose
- npm 10+

## Setup local

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Instalar dependencias
npm install

# 3. Levantar base de datos
npm run db:up

# 4. Aplicar schema
npm run db:push

# 5. Iniciar servidor de desarrollo
npm run dev
```

App disponible en http://localhost:3000

## Scripts

| Script                 | Descripción                                |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Servidor de desarrollo con Turbopack       |
| `npm run build`        | Build de producción                        |
| `npm run start`        | Servidor de producción                     |
| `npm run lint`         | Verificar errores de ESLint                |
| `npm run lint:fix`     | Corregir errores de ESLint automáticamente |
| `npm run type-check`   | Verificar tipos TypeScript                 |
| `npm run format`       | Formatear código con Prettier              |
| `npm run format:check` | Verificar formato sin modificar            |
| `npm run db:up`        | Levantar Postgres en Docker                |
| `npm run db:down`      | Detener Postgres                           |
| `npm run db:push`      | Aplicar schema a la base de datos          |
| `npm run db:generate`  | Generar migraciones SQL                    |
| `npm run db:migrate`   | Ejecutar migraciones pendientes            |
| `npm run db:studio`    | Abrir Drizzle Studio (GUI)                 |

## Variables de entorno

Ver `.env.example`. Mínimo requerido para desarrollo:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mihbah"
BETTER_AUTH_SECRET="tu-secreto-aquí"
BETTER_AUTH_URL="http://localhost:3000"
```

Generar `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Estructura del proyecto

```
app/             # Next.js App Router
components/
  ui/            # Componentes shadcn/ui
lib/
  db/
    index.ts     # Cliente Drizzle
    schema.ts    # Schema de base de datos
    migrations/  # Migraciones SQL generadas
  design-tokens.ts  # Tokens del sistema de diseño Jade
  utils.ts       # Utilidades (cn, etc.)
docs/
  SIG_Jade_Design_System.md  # Especificación del design system
```

## Commits

Formato Conventional Commits requerido:

```
feat: agregar autenticación con better-auth
fix: corregir validación de slug en tenants
chore: actualizar dependencias
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

## Épicas

- **Épica 0** ✅ Setup base
- **Épica 1** ✅ Multi-tenant base (tenants, organizaciones, empresas, proyectos, RLS)
- **Épica 2** _(pendiente)_
