# SIG Jade — Contexto del Proyecto

> Archivo leído automáticamente por Claude Code, Antigravity, Cursor y otros agentes de IA. Mantiene el contexto del proyecto entre sesiones. **No borrar ni mover.**

---

## 1. Identidad del proyecto

### Qué es SIG Jade

Plataforma SaaS multitenant de gestión integral financiera para grupos empresariales. El cliente típico es un dueño/CEO con múltiples empresas hermanas que necesita centralizar visibilidad financiera para tomar decisiones cruzadas.

### Cliente piloto

**Universo Jade** con 3 empresas:

- **MIHBAH** — Constructora de obras
- **YCDI** (You Can Do It) — Levantamiento de capital
- **BM CORP** (Bridge Makers) — Ventas y comisiones inmobiliarias

### Visión SaaS

El sistema NO es solo para 3 empresas. Está diseñado para escalar a:

- N tenants (clientes finales del SaaS)
- N organizaciones por tenant (grupos empresariales)
- N empresas por organización
- N usuarios por organización con accesos granulares
  **Multi-tenant desde el día 1, sin atajos.**

---

## 2. Filosofía del producto (CRÍTICO)

### Solo lectura, no CRUDs

El sistema NO captura datos manualmente. Los datos entran por:

1. **Carga de Excel** (drag and drop) — para MIHBAH y YCDI
2. **Sincronización con Monday.com** — para BM CORP
   Todo lo demás es **visualización**: dashboards, módulos, reportes.

**Esto significa:**

- ❌ No hay formularios de creación de movimientos
- ❌ No hay edición manual de cuentas
- ❌ No hay botón "marcar como pagado" en UI (eso viene en el siguiente Excel)
- ✅ Solo lectura, gráficas, tablas, exportación

### Multi-tenant real

Cada tenant ve únicamente sus datos. Aislamiento garantizado por:

1. Filtro `tenantId` en cada query (capa aplicación)
2. Row Level Security en Postgres (capa DB, última línea)
3. Tests automatizados que verifican aislamiento

---

## 3. Stack técnico

```yaml
Framework: Next.js 15 (App Router) + TypeScript estricto
Database: Postgres 16 (Docker local, Easypanel prod)
ORM: Drizzle ORM + Drizzle Kit
Auth: Better Auth
UI: Tailwind CSS v4 + shadcn/ui + Radix
State: TanStack Query + Zustand + nuqs
Excel: ExcelJS + SheetJS
Reports: react-pdf
Validation: Zod
Lint: ESLint + Prettier + Husky + Commitlint
Testing: Vitest + Testing Library + Playwright
Monitoring: Sentry + PostHog
i18n: next-intl (preparado, solo es-MX en Fase 1)
```

**Importante:** No hay IA, RAG, ni Anthropic SDK en Fase 1. Eso es Fase 2+.

---

## 4. Reglas de oro (NO violar nunca)

### Código

1. **TypeScript strict mode.** Nunca `any`, usa `unknown` y narrow types.
2. **Server-first.** Server Components por defecto. Client Components solo cuando necesites interactividad.
3. **Server Actions** para mutaciones. Nunca crees endpoints REST a menos que sea webhook externo.
4. **Validación con Zod** en toda entrada externa.
5. **Drizzle queries** tipadas. Nunca SQL crudo.
6. **Toda mutación pasa por un servicio** en `lib/services/`.
7. **Toda query pasa por un servicio.**
8. **Tenant ID siempre.** Cada query filtra por `tenantId` automáticamente vía helper `requireTenant()`.
9. **Soft delete por defecto.** Usa `deletedAt`.
10. **Tests críticos.** Auth, multi-tenant, importación Excel y sincronización Monday tienen tests.

### Diseño visual

11. **Solo tokens del Design System.** Nunca colores hardcoded.
12. **Solo componentes shadcn/ui** o composiciones de ellos.
13. **Cada componente soporta modo claro y oscuro.**
14. **Densidad "comfortable".** Padding generoso, espaciado de 24px entre cards.
15. **Tabular nums en montos financieros.**
16. **Inter como tipografía** para todo. JetBrains Mono solo para números/código.

### Multi-tenant

17. **`tenantId` en todas las tablas relevantes.**
18. **RLS policies** en Postgres como última línea de defensa.
19. **Helper `requireTenant()`** retorna el tenant del usuario autenticado o lanza error.
20. **Tests de aislamiento** verifican que un tenant no puede ver datos de otro.

### Performance

21. **Paginación obligatoria** en listas de más de 50 items.
22. **Índices en queries frecuentes** (tenantId, fecha, empresaId).
23. **Suspense boundaries** para data fetching paralelo.

### Lo que NO debes hacer

- ❌ NO instales `@supabase/supabase-js` ni Supabase
- ❌ NO uses Prisma (usamos Drizzle)
- ❌ NO uses NextAuth (usamos Better Auth)
- ❌ NO uses fetch + useEffect para cargar datos (Server Components o TanStack Query)
- ❌ NO uses localStorage para sesión (Better Auth lo maneja)
- ❌ NO uses CSS-in-JS (Tailwind only)
- ❌ NO crees API routes REST si no es webhook externo (Server Actions)
- ❌ NO uses `any` en TypeScript
- ❌ NO hardcodees valores que estén en design tokens
- ❌ NO instales librerías sin justificarlas en el commit
- ❌ NO mezcles lógica de negocio con componentes (todo va a servicios)

---

## 5. Roles del sistema

Solo 3 roles en Fase 1:

| Rol           | Acceso                                                         |
| ------------- | -------------------------------------------------------------- |
| `SUPER_ADMIN` | Ve todo, gestiona usuarios, configura sistema                  |
| `ADMIN`       | Ve empresas asignadas, puede cargar Excel y sincronizar Monday |
| `VIEWER`      | Solo lectura de empresas asignadas                             |

---

## 6. Módulos por empresa (sidebar dinámico)

| Módulo                | Todas | MIHBAH | YCDI |   BM CORP    |
| --------------------- | :---: | :----: | :--: | :----------: |
| Dashboard             |   ✓   |   ✓    |  ✓   |      ✓       |
| Flujo de Caja         |   ✓   |   ✓    |  ✓   | ✓ (semanal)  |
| Proyectos             |   ✓   |   ✓    |  ✓+  | ✓ (vendidos) |
| Cuentas (CXC/CXP)     |   ✓   |   ✓    |  ✓   |      ✓       |
| Reportes              |   ✓   |   ✓    |  ✓   |      ✓       |
| Cargas Excel          |   ✗   |   ✓    |  ✓   |      ✗       |
| Sincronización Monday |   ✗   |   ✗    |  ✗   |      ✓       |

---

## 7. Indicadores específicos por dashboard

### MIHBAH — Constructora, foco en obras

- Semáforo de colchón financiero
- Ingresos y egresos del periodo
- Cuentas por cobrar
- Cuentas por pagar
- Flujo mensual
- Avance por proyecto
- Presupuestado vs gastado por actividad
- Avance de obra medido por gasto

### BM CORP — Comercial, foco en ventas

**Lado izquierdo:**

- Cuánto llevo vendido
- Quién vende más (ranking)
- Qué proyectos tienen más flujo
  **Lado derecho:**
- Repartos realizados y pendientes
- Ingreso y egreso (flujo semanal)
- Remanentes estimados
  **Otros:**
- Métricas de alianzas
- Top de alianzas
- Comisiones (cuánto se paga a cada quien, conciliado)
- Semáforo por colores
  **Datos vienen de Monday.com**

### YCDI — Capital, foco en aportaciones

- Tabla por conceptos y proyectos
- Ingresos y egresos
- Cuentas por cobrar
- Cuentas por pagar
- Flujo mensual
- % levantamiento de capital
- Cantidad de acciones colocadas
- Cuánto ya ingresó vs falta por ingresar
- Cuánto ya gastó vs falta por gastar
- Precio promedio por acción

### Dashboard General — Consolidado

- Resumen general (sin "Margen")
- Correlación entre las 3 empresas
- Cuentas cobradas vs pendientes (consolidado)
- MIHBAH: estimado vs avance del mes
- "Resumen del resumen": ventas BM correlacionadas con YCDI
- Permitir ver qué pasa en todas las empresas

---

## 8. Modelo de datos clave

### Jerarquía multi-tenant

```
TENANT (cliente del SaaS)
  └── ORGANIZATION (grupo empresarial)
        └── EMPRESA (MIHBAH, YCDI, BM CORP)
              ├── PROYECTOS
              ├── CUENTAS BANCARIAS
              ├── MOVIMIENTOS (de Excel)
              ├── CUENTAS PENDIENTES (CXC/CXP)
              ├── VENTAS BM CORP (de Monday)
              └── REPARTOS BM CORP (de Monday)
```

### Convenciones de schema

- Primary keys: `uuid` con `defaultRandom()`
- Timestamps: `createdAt` y `updatedAt` con `withTimezone: true`
- Foreign keys: `onDelete: "restrict"` para datos críticos
- Soft delete: campo `deletedAt: timestamp`
- Multi-tenant: `tenantId: uuid` en todas las tablas relevantes

---

## 9. Comandos importantes

```bash
# Desarrollo
npm run dev              # Next.js dev server
npm run build            # Build de producción

# Base de datos
npm run db:up            # Levanta Postgres en Docker
npm run db:down          # Apaga Postgres
npm run db:push          # Aplica schema sin migraciones (solo dev)
npm run db:generate      # Genera migración SQL
npm run db:migrate       # Aplica migraciones pendientes
npm run db:studio        # Abre Drizzle Studio
npm run db:seed          # Carga datos de prueba

# Testing
npm test                 # Vitest
npm run test:e2e         # Playwright

# Calidad
npm run lint             # ESLint
npm run format           # Prettier
npm run type-check       # tsc --noEmit
```

---

## 10. Plan de desarrollo Fase 1 (4 semanas)

### Semana 1: Fundamentos

**Épica 0** — Setup del proyecto Next.js 15
**Épica 1** — Multi-tenant base (schemas, RLS, helpers)
**Épica 2** — Auth con Better Auth (login, recuperación)
**Épica 3** — Layout autenticado (sidebar, topbar, selector empresa)

### Semana 2: Datos y dashboards core

**Épica 4** — Cargas Excel (wizard, validación, importación)
**Épica 5** — Dashboard MIHBAH completo
**Épica 6** — Dashboard YCDI completo

### Semana 3: BM CORP y módulos transversales

**Épica 7** — Sincronización con Monday
**Épica 8** — Dashboard BM CORP completo
**Épica 9** — Dashboard General consolidado
**Épica 10** — Módulos transversales (Flujo, Proyectos, Cuentas, Reportes)

### Semana 4: Pulido y deploy

**Épica 11** — Tests críticos
**Épica 12** — Deploy a Easypanel
**Épica 13** — Onboarding cliente y capacitación

---

## 11. Convenciones de código

### Naming

- Archivos: kebab-case (`empresa-selector.tsx`)
- Componentes: PascalCase (`EmpresaSelector`)
- Hooks: camelCase con prefijo use (`useEmpresaActiva`)
- Servicios: camelCase (`getMovimientosByEmpresa`)
- Tipos: PascalCase (`type Empresa`)
- Constantes: SCREAMING_SNAKE_CASE (`MAX_UPLOAD_SIZE`)

### Commits (Conventional Commits)

- `feat: agregar dashboard de MIHBAH`
- `fix: corregir cálculo de flujo mensual`
- `refactor: extraer lógica de KPIs a servicio`
- `docs: actualizar README`
- `test: agregar tests de excel importer`
- `chore: actualizar dependencias`

---

## 12. Cuando NO sepas algo

Si necesitas información que no está aquí:

1. Revisa `docs/SIG_Jade_TDD.md` — casos de uso, planeación detallada
2. Revisa `docs/SIG_Jade_Design_System.md` — tokens, componentes, accesibilidad
3. Revisa `lib/design-tokens.ts` — valores exactos de colores, tipografía
4. Revisa `lib/db/schema.ts` — modelo de datos
5. **Pregunta al usuario antes de inventar comportamiento de negocio**

---

## 13. Lo que es CRÍTICO

- **Aislamiento multi-tenant.** Si por error un tenant ve datos de otro, es bug crítico de seguridad.
- **Integridad de datos financieros.** Nunca permitas que se pierdan movimientos importados. Soft delete o nada.
- **Performance en cargas grandes.** Excel de 5,000 filas debe cargarse en menos de 30s.
- **Auditoría completa.** Cada acción importante queda registrada en `audit_logs`.
- **Sincronización Monday idempotente.** Si se corre 2 veces no debe duplicar registros.

---

## 14. Lo que VIENE en Fase 2 (preparar terreno, no construir)

Para que el código sea escalable a Fase 2 sin reescribir, el schema y arquitectura ya contemplan:

- Asistente IA con RAG semántico
- Módulo de comisiones BM CORP detallado
- Webhooks de Monday en tiempo real
- Internacionalización completa
- 2FA para roles administrativos
- Onboarding wizard para nuevos clientes
- Notificaciones por email
- Roles personalizados
- Reportes programados (mensuales automáticos)
- Pronóstico fiscal
- Portal para asesores BM CORP
- Accionistas YCDI: cobranza y fase
  **No las construyas en Fase 1, pero el código debe permitir agregarlas sin refactor masivo.**

---

## 15. Documentos relacionados

- `docs/SIG_Jade_TDD.md` — Technical Design Document
- `docs/SIG_Jade_Design_System.md` — Sistema de diseño
- `lib/design-tokens.ts` — Tokens centralizados
- `lib/db/schema.ts` — Schema de base de datos

---

**Versión:** 0.1.0
**Última actualización:** Mayo 2026
**Stack:** Next.js 15 + TypeScript + Drizzle + Postgres + Better Auth + Tailwind v4
