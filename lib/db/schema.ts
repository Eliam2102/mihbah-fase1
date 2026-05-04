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
