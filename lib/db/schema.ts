import { boolean, date, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const tipoEmpresaEnum = pgEnum('tipo_empresa', ['CONSTRUCTORA', 'CAPITAL', 'COMERCIAL'])

export const tipoMovimientoEnum = pgEnum('tipo_movimiento', ['INGRESO', 'EGRESO', 'TRASPASO'])

export const tipoCategoriaEnum = pgEnum('tipo_categoria', ['INGRESO', 'EGRESO'])

export const tipoCuentaPendienteEnum = pgEnum('tipo_cuenta_pendiente', ['POR_COBRAR', 'POR_PAGAR'])

export const estadoCuentaPendienteEnum = pgEnum('estado_cuenta_pendiente', [
  'PENDIENTE',
  'PARCIAL',
  'LIQUIDADA',
])

// ─── Tenants ─────────────────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Organizaciones ──────────────────────────────────────────────────────────

export const organizaciones = pgTable('organizaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Empresas ────────────────────────────────────────────────────────────────

export const empresas = pgTable('empresas', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  organizacionId: uuid('organizacion_id')
    .notNull()
    .references(() => organizaciones.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tipo: tipoEmpresaEnum('tipo').notNull(),
  rfc: text('rfc'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Proyectos ───────────────────────────────────────────────────────────────

export const proyectos = pgTable('proyectos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  descripcion: text('descripcion'),
  activo: boolean('activo').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Cuentas Bancarias ───────────────────────────────────────────────────────

export const cuentasBancarias = pgTable('cuentas_bancarias', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  banco: text('banco'),
  numeroCuenta: text('numero_cuenta'),
  activa: boolean('activa').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Grupos ──────────────────────────────────────────────────────────────────

export const grupos = pgTable('grupos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  orden: numeric('orden', { precision: 5, scale: 0 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Categorias ──────────────────────────────────────────────────────────────

export const categorias = pgTable('categorias', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  grupoId: uuid('grupo_id')
    .notNull()
    .references(() => grupos.id, { onDelete: 'restrict' }),
  nombre: text('nombre').notNull(),
  tipo: tipoCategoriaEnum('tipo').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Movimientos ─────────────────────────────────────────────────────────────

export const movimientos = pgTable('movimientos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, {
    onDelete: 'set null',
  }),
  cuentaBancariaId: uuid('cuenta_bancaria_id').references(() => cuentasBancarias.id, {
    onDelete: 'set null',
  }),
  categoriaId: uuid('categoria_id').references(() => categorias.id, {
    onDelete: 'set null',
  }),
  grupoId: uuid('grupo_id').references(() => grupos.id, {
    onDelete: 'set null',
  }),
  fecha: date('fecha').notNull(),
  tipo: tipoMovimientoEnum('tipo').notNull(),
  monto: numeric('monto', { precision: 18, scale: 2 }).notNull(),
  descripcion: text('descripcion'),
  referencia: text('referencia'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Cuentas Pendientes ──────────────────────────────────────────────────────

export const cuentasPendientes = pgTable('cuentas_pendientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  tipo: tipoCuentaPendienteEnum('tipo').notNull(),
  tercero: text('tercero').notNull(),
  monto: numeric('monto', { precision: 18, scale: 2 }).notNull(),
  montoPagado: numeric('monto_pagado', { precision: 18, scale: 2 }).default('0').notNull(),
  fechaVencimiento: date('fecha_vencimiento'),
  descripcion: text('descripcion'),
  estado: estadoCuentaPendienteEnum('estado').default('PENDIENTE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Ventas BM Corp ──────────────────────────────────────────────────────────

export const ventasBmcorp = pgTable('ventas_bmcorp', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  cliente: text('cliente').notNull(),
  productoServicio: text('producto_servicio'),
  monto: numeric('monto', { precision: 18, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  descripcion: text('descripcion'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Repartos BM Corp ────────────────────────────────────────────────────────

export const repartosBmcorp = pgTable('repartos_bmcorp', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  beneficiario: text('beneficiario').notNull(),
  monto: numeric('monto', { precision: 18, scale: 2 }).notNull(),
  fecha: date('fecha').notNull(),
  descripcion: text('descripcion'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── User Empresa Access ─────────────────────────────────────────────────────

export const userEmpresaAccess = pgTable('user_empresa_access', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  rol: text('rol').notNull().default('VIEWER'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Auth: Users ─────────────────────────────────────────────────────────────
// Better Auth manages this table. IDs are text (not UUID) per better-auth convention.

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  // admin plugin fields
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),
  // tenant link (custom additional field)
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Auth: Sessions ──────────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  impersonatedBy: text('impersonated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Auth: Accounts ──────────────────────────────────────────────────────────
// Stores credentials (email/password) and OAuth tokens

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Auth: Verifications (password_reset_tokens) ─────────────────────────────

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
