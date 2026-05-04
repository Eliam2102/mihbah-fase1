import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const tipoEmpresaEnum = pgEnum('tipo_empresa', ['CONSTRUCTORA', 'CAPITAL', 'COMERCIAL'])

export const tipoMovimientoEnum = pgEnum('tipo_movimiento', [
  'INGRESO',
  'EGRESO',
  'TRASPASO',
  'SALIDA',
  'INTERNO',
  'PRESTAMO',
])

export const estadoExcelUploadEnum = pgEnum('estado_excel_upload', [
  'PROCESANDO',
  'COMPLETADO',
  'ERROR',
])

export const tipoCategoriaEnum = pgEnum('tipo_categoria', ['INGRESO', 'EGRESO'])

export const tipoCuentaPendienteEnum = pgEnum('tipo_cuenta_pendiente', ['POR_COBRAR', 'POR_PAGAR'])

export const estadoCuentaPendienteEnum = pgEnum('estado_cuenta_pendiente', [
  'PENDIENTE',
  'PARCIAL',
  'LIQUIDADA',
])

export const fuenteDatosEnum = pgEnum('fuente_datos', ['EXCEL', 'MONDAY', 'MANUAL'])

export const estadoVentaEnum = pgEnum('estado_venta', [
  'EN_PROCESO',
  'APROBADO_JURIDICO',
  'FINALIZADA',
  'CANCELADA',
])

export const estadoComisionEnum = pgEnum('estado_comision', ['PENDIENTE', 'PARCIAL', 'PAGADA'])

export const estadoCxEnum = pgEnum('estado_cx', ['AL_CORRIENTE', 'VENCIDA', 'PROXIMA', 'PAGADA'])

export const estadoRepartoEnum = pgEnum('estado_reparto', ['PENDIENTE', 'REALIZADO'])

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
  // EXCEL = datos vienen de carga masiva / MONDAY = sync Monday.com / MANUAL = captura directa
  fuenteDatos: fuenteDatosEnum('fuente_datos').default('EXCEL').notNull(),
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
  anio: numeric('anio', { precision: 4, scale: 0 }),
  mes: numeric('mes', { precision: 2, scale: 0 }),
  tipo: tipoMovimientoEnum('tipo').notNull(),
  monto: numeric('monto', { precision: 18, scale: 2 }).notNull(),
  nombre: text('nombre'),
  concepto: text('concepto'),
  comentarios: text('comentarios'),
  descripcion: text('descripcion'),
  referencia: text('referencia'),
  uploadId: uuid('upload_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Excel Uploads ───────────────────────────────────────────────────────────

export const excelUploads = pgTable('excel_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  // nullable → upload maestro que toca múltiples empresas
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  filename: text('filename').notNull(),
  fileSize: numeric('file_size', { precision: 18, scale: 0 }),
  totalRows: numeric('total_rows', { precision: 10, scale: 0 }).default('0').notNull(),
  validRows: numeric('valid_rows', { precision: 10, scale: 0 }).default('0').notNull(),
  errorRows: numeric('error_rows', { precision: 10, scale: 0 }).default('0').notNull(),
  duplicateRows: numeric('duplicate_rows', { precision: 10, scale: 0 }).default('0').notNull(),
  importedRows: numeric('imported_rows', { precision: 10, scale: 0 }).default('0').notNull(),
  omittedRows: numeric('omitted_rows', { precision: 10, scale: 0 }).default('0').notNull(),
  estado: estadoExcelUploadEnum('estado').default('PROCESANDO').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Excel Upload Summary (desglose por empresa) ─────────────────────────────
// Para uploads maestros con múltiples empresas en el mismo archivo.

export const excelUploadSummaries = pgTable('excel_upload_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  uploadId: uuid('upload_id')
    .notNull()
    .references(() => excelUploads.id, { onDelete: 'cascade' }),
  empresaId: uuid('empresa_id')
    .notNull()
    .references(() => empresas.id, { onDelete: 'cascade' }),
  empresaNombre: text('empresa_nombre').notNull(),
  filasImportadas: numeric('filas_importadas', { precision: 10, scale: 0 }).default('0').notNull(),
  filasError: numeric('filas_error', { precision: 10, scale: 0 }).default('0').notNull(),
  filasOmitidas: numeric('filas_omitidas', { precision: 10, scale: 0 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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

// ═══════════════════════════════════════════════════════════════════════════
// YCDI — Aportaciones de capital
// ═══════════════════════════════════════════════════════════════════════════

export const accionistas = pgTable(
  'accionistas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    codigo: text('codigo'),
    nombre: text('nombre').notNull(),
    copropietario: text('copropietario'),
    email: text('email'),
    telefono: text('telefono'),
    asesor: text('asesor'),
    tipoAccionista: text('tipo_accionista'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('accionistas_tenant_idx').on(t.tenantId),
  }),
)

export const acuerdosAportacion = pgTable(
  'acuerdos_aportacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    accionistaId: uuid('accionista_id')
      .notNull()
      .references(() => accionistas.id, { onDelete: 'cascade' }),
    proyectoId: uuid('proyecto_id')
      .notNull()
      .references(() => proyectos.id, { onDelete: 'restrict' }),
    paquete: text('paquete'),
    numeroAcciones: numeric('numero_acciones', { precision: 12, scale: 2 }).notNull(),
    precioPorAccion: numeric('precio_por_accion', { precision: 15, scale: 2 }).notNull(),
    montoTotal: numeric('monto_total', { precision: 15, scale: 2 }).notNull(),
    enganche: numeric('enganche', { precision: 15, scale: 2 }).notNull().default('0'),
    numeroMensualidades: integer('numero_mensualidades').notNull(),
    mensualidad: numeric('mensualidad', { precision: 15, scale: 2 }),
    fechaApertura: date('fecha_apertura'),
    fechaInicio: date('fecha_inicio'),
    estado: estadoVentaEnum('estado').notNull().default('EN_PROCESO'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('acuerdos_tenant_idx').on(t.tenantId),
  }),
)

export const pagosAportacion = pgTable(
  'pagos_aportacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    acuerdoId: uuid('acuerdo_id')
      .notNull()
      .references(() => acuerdosAportacion.id, { onDelete: 'cascade' }),
    numeroPago: integer('numero_pago').notNull(),
    fechaProgramada: date('fecha_programada').notNull(),
    fechaPago: date('fecha_pago'),
    montoEsperado: numeric('monto_esperado', { precision: 15, scale: 2 }).notNull(),
    montoPagado: numeric('monto_pagado', { precision: 15, scale: 2 }).notNull().default('0'),
    estado: estadoCxEnum('estado').notNull().default('PROXIMA'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('pagos_aportacion_tenant_idx').on(t.tenantId),
    acuerdoIdx: index('pagos_aportacion_acuerdo_idx').on(t.acuerdoId),
  }),
)

// ═══════════════════════════════════════════════════════════════════════════
// BM CORP — Afiliados, desarrollos y sincronización Monday
// ═══════════════════════════════════════════════════════════════════════════

export const afiliados = pgTable(
  'afiliados',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    contacto: text('contacto'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantNombreUnique: uniqueIndex('afiliados_tenant_nombre_unique').on(t.tenantId, t.nombre),
  }),
)

export const desarrollos = pgTable(
  'desarrollos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    desarrolladora: text('desarrolladora'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantNombreUnique: uniqueIndex('desarrollos_tenant_nombre_unique').on(t.tenantId, t.nombre),
  }),
)

export const sincronizacionesMonday = pgTable(
  'sincronizaciones_monday',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'set null' }),
    tablero: text('tablero').notNull(),
    estado: text('estado').notNull(),
    registrosCreados: integer('registros_creados').notNull().default(0),
    registrosActualizados: integer('registros_actualizados').notNull().default(0),
    registrosErrores: integer('registros_errores').notNull().default(0),
    errores: jsonb('errores'),
    iniciadaEn: timestamp('iniciada_en', { withTimezone: true }).notNull().defaultNow(),
    finalizadaEn: timestamp('finalizada_en', { withTimezone: true }),
    iniciadaPor: text('iniciada_por').references(() => users.id),
  },
  (t) => ({
    tenantIdx: index('syncs_tenant_idx').on(t.tenantId),
  }),
)

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA — Auditoría, notificaciones y feature flags
// ═══════════════════════════════════════════════════════════════════════════

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    accion: text('accion').notNull(),
    recursoTipo: text('recurso_tipo').notNull(),
    recursoId: text('recurso_id'),
    cambios: jsonb('cambios'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('audit_tenant_idx').on(t.tenantId),
    userIdx: index('audit_user_idx').on(t.userId),
    fechaIdx: index('audit_fecha_idx').on(t.createdAt),
  }),
)

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    mensaje: text('mensaje').notNull(),
    link: text('link'),
    leida: boolean('leida').notNull().default(false),
    leidaEn: timestamp('leida_en', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('notif_user_idx').on(t.userId),
    leidaIdx: index('notif_leida_idx').on(t.leida),
  }),
)

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    flag: text('flag').notNull(),
    enabled: boolean('enabled').notNull().default(false),
    configuracion: jsonb('configuracion'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantFlagUnique: uniqueIndex('flags_tenant_flag_unique').on(t.tenantId, t.flag),
  }),
)
