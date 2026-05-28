import { sql } from 'drizzle-orm'
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
  type AnyPgColumn,
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
  // Estados BM CORP (Monday "Estado de venta")
  'APROBADO_VENTAS',
  'RECHAZADO',
  'ESPERANDO_AUTORIZACION',
  'LIBERADO',
  'FINALIZADO_Y_LIQUIDADO',
])

export const estadoComisionEnum = pgEnum('estado_comision', ['PENDIENTE', 'PARCIAL', 'PAGADA'])

// Pagos BM CORP — repartos a alianzas + comisiones a asesores
export const estadoPagoBmcorpEnum = pgEnum('estado_pago_bmcorp', ['PENDIENTE', 'PARCIAL', 'PAGADO'])

export const tipoPagoBmcorpEnum = pgEnum('tipo_pago_bmcorp', ['REPARTO_ALIANZA', 'COMISION_ASESOR'])

export const estadoCxEnum = pgEnum('estado_cx', ['AL_CORRIENTE', 'VENCIDA', 'PROXIMA', 'PAGADA'])

export const estadoRepartoEnum = pgEnum('estado_reparto', ['PENDIENTE', 'REALIZADO'])

// ─── Comisiones BM CORP (Épica 14) ───────────────────────────────────────────
// Modelo basado en doc oficial: YESYUCAN_Esquema_de_Comisiones_v5.

// TERRENO = venta de terrenos (Grupo ARKA y Grupo RH), comisión total 20%
// ACCION = venta de acciones Yucandoit (Kooben/Huunal), comisión total 15%
export const tipoProductoComisionEnum = pgEnum('tipo_producto_comision', ['TERRENO', 'ACCION'])

// Tipo de esquema base
export const tipoEsquemaEnum = pgEnum('tipo_esquema_comision', [
  'ALIADOS_DEL_UNIVERSO', // Terrenos — 20% total, 15% bolsa comercial
  'YUCAN_PARTNERS', // YCD — 15% total, 12% bolsa comercial, líder topado 10%
])

export const estadoDispersionEnum = pgEnum('estado_dispersion', [
  'PENDIENTE', // Calculada, no enviada a aprobación
  'EN_REVISION', // Joana la incluyó en un corte y lo envió a aprobar
  'AUTORIZADA', // Jorge o Carla aprobaron → visible en portal lider/asesor
  'PARCIAL',
  'PAGADO',
  'DIFERIDO',
])

// Estado del corte de dispersión
export const estadoCorteEnum = pgEnum('estado_corte', [
  'BORRADOR', // Joana lo está armando, aún no se envía
  'EN_REVISION', // Enviado a aprobación, esperando Jorge/Carla
  'APROBADO', // Aprobado, dispersiones AUTORIZADAS
  'RECHAZADO', // Rechazado con motivo, dispersiones vuelven a PENDIENTE
])

// Día del corte según operación del negocio
export const tipoDiaCorteEnum = pgEnum('tipo_dia_corte', ['LUNES', 'JUEVES'])

// 9 tipos de beneficiario según cascada del doc §4
export const tipoBeneficiarioEnum = pgEnum('tipo_beneficiario_dispersion', [
  'OP_BMCORP', // 1% terrenos
  'OP_YESYUCAN', // 1% terrenos / 3% YCD
  'ASESOR', // Comisión estándar (8% terrenos / 7% YCD)
  'LIDER_SALDO', // Saldo del líder (afiliación − asesor)
  'SOCIO_BOLSA_JORGE', // Parte de Jorge en bolsa comercial (acumula mes)
  'SOCIO_BOLSA_KASS', // Parte de Kass en bolsa (libera ya)
  'SOCIO_BOLSA_DIANA', // Parte de Diana en bolsa (libera ya)
  'SOCIO_FIJO_JORGE', // 1.5% terrenos, pago mensual
  'SOCIO_FIJO_KASS', // 1.5% terrenos, pago mensual
])

// Nivel del aliado/partner — afecta SOLO bono, no comisión base
// Modelo HÍBRIDO: sistema calcula nivel_propuesto (promedio últimos 3 meses),
// Joana confirma nivel_efectivo (puede override con motivo).
// TODO: Confirmar con junta si hay override por vacaciones/post-parto.
export const nivelAlianzaEnum = pgEnum('nivel_alianza', ['JADE', 'TURQUESA', 'ONIX_NEGRO'])

// Modo de cálculo del bono — confirma cliente en junta
// NUMERICO: cumplió meta = ventas >= umbral (automático)
// MANUAL: cumplió meta = flag manual seteado por Joana o líder
export const modoBonoEnum = pgEnum('modo_bono', ['NUMERICO_AUTO', 'MANUAL'])

// Reglas especiales documentadas en §4
export const reglaEspecialAlianzaEnum = pgEnum('regla_especial_alianza', [
  'NINGUNA',
  'FLAMINGO_DIRECTO', // YESYUCAN dispersa directo al asesor (sin líder)
  'LGI_YCD_ACUMULA', // Comisiones YCD se acumulan, Kass define dispersión mes siguiente
])

export const rolPortalEnum = pgEnum('rol_portal', ['LIDER_ALIANZA', 'ADMINISTRATIVO', 'ASESOR'])

// Método con el que se le paga a cada líder (trazabilidad operativa).
// Default EFECTIVO según práctica actual confirmada por cliente 2026-05-20.
// Tanto efectivo como depósito requieren comprobante (foto/PDF).
export const metodoPagoLiderEnum = pgEnum('metodo_pago_lider', [
  'EFECTIVO',
  'DEPOSITO',
  'TRANSFERENCIA',
  'OTRO',
])

// Grupo al que pertenece una desarrolladora. Base de las reglas de bono umbral
// (Flamingo, Hackers/Diana, etc.). YCD = Yucandoit acciones; ARKA + RH = grupos
// terrenos; OTRO = cualquier otra desarrolladora externa.
export const grupoDesarrolladoraEnum = pgEnum('grupo_desarrolladora', ['YCD', 'ARKA', 'RH', 'OTRO'])

// Tipo de fuente para una regla de bono. PROPIA = sobre ventas del afiliado
// destinatario; OVERRIDE_AFILIADO = sobre ventas de otro afiliado (Diana sobre
// Flamingo es el caso real).
export const tipoFuenteBonoEnum = pgEnum('tipo_fuente_bono', ['PROPIA', 'OVERRIDE_AFILIADO'])

// Fórmula para calcular el bono cuando se cruza el umbral mensual. Los PDFs
// de Flamingo y Hackers/Diana tienen ejemplos ambiguos — esta enum permite a
// Joana/Carla escoger la fórmula correcta sin tocar código.
//   EXCEDENTE          → bono = bonoPct × max(0, totalAcumulado − umbral)
//   TOTAL_GRUPOS_APLICA → bono = bonoPct × suma(ventas en gruposAplicaBono)
//                         (sólo si totalAcumulado > umbral)
//   EXCEDENTE_CAP_GRUPOS → bono = bonoPct × min(excedente, suma(gruposAplicaBono))
export const formulaBonoEnum = pgEnum('formula_bono_umbral', [
  'EXCEDENTE',
  'TOTAL_GRUPOS_APLICA',
  'EXCEDENTE_CAP_GRUPOS',
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

export const movimientos = pgTable(
  'movimientos',
  {
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
    proyectoNombre: text('proyecto_nombre'),
    categoriaNombre: text('categoria_nombre'),
    grupoNombre: text('grupo_nombre'),
    referencia: text('referencia'),
    uploadId: uuid('upload_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantEmpresaIdx: index('mov_tenant_empresa_idx').on(t.tenantId, t.empresaId),
    tenantFechaIdx: index('mov_tenant_fecha_idx').on(t.tenantId, t.fecha),
    tenantEmpresaFechaIdx: index('mov_tenant_empresa_fecha_idx').on(
      t.tenantId,
      t.empresaId,
      t.fecha,
    ),
    uploadIdx: index('mov_upload_idx').on(t.uploadId),
    tipoIdx: index('mov_tipo_idx').on(t.tipo),
  }),
)

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

export const ventasBmcorp = pgTable(
  'ventas_bmcorp',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    // Monday.com sync key — used for idempotent upserts
    mondayItemId: text('monday_item_id'),
    // Core deal data
    cliente: text('cliente').notNull(),
    afiliadoId: uuid('afiliado_id').references(() => afiliados.id, { onDelete: 'set null' }),
    desarrolloId: uuid('desarrollo_id').references(() => desarrollos.id, { onDelete: 'set null' }),
    asesor: text('asesor'),
    monto: numeric('monto', { precision: 18, scale: 2 }).notNull().default('0'),
    financiamiento: text('financiamiento'), // CONTADO / CREDITO / etc
    enganche: numeric('enganche', { precision: 18, scale: 2 }).default('0'),
    estadoVenta: estadoVentaEnum('estado_venta').notNull().default('EN_PROCESO'),
    fechaApertura: date('fecha_apertura'),
    fechaCierre: date('fecha_cierre'),

    // Novedades de la inspección real de Monday
    loteAcciones: text('lote_acciones'),
    paqueteAccion: text('paquete_accion'),
    pipelineGroup: text('pipeline_group'),
    operativoApertura: text('operativo_apertura'),
    operativoCierre: text('operativo_cierre'),
    comisionBmcorp: numeric('comision_bmcorp', { precision: 18, scale: 2 }).default('0'),
    // Descuento que retiene la desarrolladora antes de entregar comisión a BM Corp.
    // Default 0% — Joana dispersa montos brutos (1% × venta total, etc.). Si algún
    // desarrollo en el futuro retiene un %, se configura por venta y la cascada
    // reduce el monto disponible para dispersar (no los techos de cada línea).
    descuentoDesarrolladoraPct: numeric('descuento_desarrolladora_pct', {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default('0'),
    mondayBoardId: text('monday_board_id'),

    // Datos personales
    telefono: text('telefono'),
    correo: text('correo'),
    nacionalidad: text('nacionalidad'),
    residencia: text('residencia'),
    sexo: text('sexo'),
    fechaNacimiento: date('fecha_nacimiento'),

    // Legacy / generic
    productoServicio: text('producto_servicio'),
    fecha: date('fecha').notNull(),
    descripcion: text('descripcion'),

    // Notas internas (solo SIG Jade — NO sincronizan a Monday)
    notasInternas: text('notas_internas'),
    // Flag: true si esta venta tuvo edición manual en el sistema (no solo sync Monday).
    // Sirve para conflict resolution futuro cuando sync Monday traiga cambios.
    editadoEnSistema: boolean('editado_en_sistema').notNull().default(false),
    editadoPor: text('editado_por').references(() => users.id, { onDelete: 'set null' }),
    editadoEn: timestamp('editado_en', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('ventas_bmcorp_tenant_idx').on(t.tenantId),
    mondayItemIdx: uniqueIndex('ventas_bmcorp_monday_item_unique').on(t.tenantId, t.mondayItemId),
    // Compuestos para queries dashboard (filtros tenant+empresa+rango fecha)
    tenantEmpresaFechaIdx: index('ventas_bmcorp_tenant_empresa_fecha_idx').on(
      t.tenantId,
      t.empresaId,
      t.fecha,
    ),
    tenantEmpresaAperturaIdx: index('ventas_bmcorp_tenant_empresa_apertura_idx').on(
      t.tenantId,
      t.empresaId,
      t.fechaApertura,
    ),
    tenantEmpresaCierreIdx: index('ventas_bmcorp_tenant_empresa_cierre_idx').on(
      t.tenantId,
      t.empresaId,
      t.fechaCierre,
    ),
    tenantEmpresaEstadoIdx: index('ventas_bmcorp_tenant_empresa_estado_idx').on(
      t.tenantId,
      t.empresaId,
      t.estadoVenta,
    ),
    afiliadoIdx: index('ventas_bmcorp_afiliado_idx').on(t.afiliadoId),
    desarrolloIdx: index('ventas_bmcorp_desarrollo_idx').on(t.desarrolloId),
  }),
)

// ─── Repartos BM Corp ────────────────────────────────────────────────────────

export const repartosBmcorp = pgTable(
  'repartos_bmcorp',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    // Sync con Monday — venta origen + idempotencia
    ventaId: uuid('venta_id').references(() => ventasBmcorp.id, { onDelete: 'set null' }),
    afiliadoId: uuid('afiliado_id').references(() => afiliados.id, { onDelete: 'set null' }),
    mondayItemId: text('monday_item_id'),
    // Tipo y estado del pago
    tipo: tipoPagoBmcorpEnum('tipo').notNull().default('REPARTO_ALIANZA'),
    estado: estadoPagoBmcorpEnum('estado').notNull().default('PENDIENTE'),
    // Datos del pago
    beneficiario: text('beneficiario').notNull(),
    monto: numeric('monto', { precision: 18, scale: 2 }).notNull(),
    fecha: date('fecha').notNull(),
    descripcion: text('descripcion'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('repartos_bmcorp_tenant_idx').on(t.tenantId),
    mondayItemIdx: uniqueIndex('repartos_bmcorp_monday_unique').on(
      t.tenantId,
      t.mondayItemId,
      t.tipo,
    ),
    ventaIdx: index('repartos_bmcorp_venta_idx').on(t.ventaId),
    fechaIdx: index('repartos_bmcorp_fecha_idx').on(t.fecha),
  }),
)

// ─── User Empresa Access ─────────────────────────────────────────────────────

export const userEmpresaAccess = pgTable(
  'user_empresa_access',
  {
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
  },
  (t) => ({
    userEmpresaUnique: uniqueIndex('user_empresa_access_user_empresa_unique').on(
      t.userId,
      t.empresaId,
    ),
  }),
)

// ─── User Módulo Access ──────────────────────────────────────────────────────
// Granular per-user, per-empresa, per-module permissions.
// If no row exists for a (userId, empresaId, modulo) combo → falls back to empresa-level rol.

export const userModuloAccess = pgTable(
  'user_modulo_access',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    modulo: text('modulo').notNull(),
    puedeVer: boolean('puede_ver').notNull().default(true),
    puedeEditar: boolean('puede_editar').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userEmpresaModuloUnique: uniqueIndex('user_modulo_empresa_unique').on(
      t.userId,
      t.empresaId,
      t.modulo,
    ),
    tenantIdx: index('user_modulo_tenant_idx').on(t.tenantId),
  }),
)

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
    // Nombre exacto del chip "Afiliado/Alianza" en Monday — usado para mapear sync automático
    mondayLabel: text('monday_label'),
    // Plantilla de esquema sugerida cuando se crea un nuevo esquema para esta alianza
    tipoEsquemaDefault: tipoEsquemaEnum('tipo_esquema_default'),
    activo: boolean('activo').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantNombreUnique: uniqueIndex('afiliados_tenant_nombre_unique').on(t.tenantId, t.nombre),
    mondayLabelIdx: index('afiliados_monday_label_idx').on(t.tenantId, t.mondayLabel),
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
    // Grupo al que pertenece la desarrolladora — alimenta las reglas de bono
    // umbral (Flamingo, Diana). Default OTRO; Joana clasifica desde UI.
    grupoDesarrolladora: grupoDesarrolladoraEnum('grupo_desarrolladora').notNull().default('OTRO'),
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

// ═══════════════════════════════════════════════════════════════════════════
// BM CORP — Módulo de Comisiones (Épica 14)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Líderes de Alianza ──────────────────────────────────────────────────────
// Un líder representa a una alianza ante BM Corp. BM Corp paga directo al líder.

export const lideresAlianza = pgTable(
  'lideres_alianza',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    afiliadoId: uuid('afiliado_id')
      .notNull()
      .references(() => afiliados.id, { onDelete: 'restrict' }),
    nombre: text('nombre').notNull(),
    email: text('email'),
    // Algunos líderes (Kass, Jorge) tienen un correo alterno para notificaciones.
    emailAlterno: text('email_alterno'),
    telefono: text('telefono'),
    // Método con el que se realiza el pago al líder. Default EFECTIVO.
    metodoPago: metodoPagoLiderEnum('metodo_pago').notNull().default('EFECTIVO'),
    // Datos bancarios — opcionales, solo si metodoPago = TRANSFERENCIA.
    // Cifrados AES-256-GCM en lib/crypto/field-encryption.ts.
    clabe: text('clabe'),
    banco: text('banco'),
    numeroCuenta: text('numero_cuenta'),
    // Nivel del aliado/partner según promedio mensual de ventas (doc §1 y §2)
    // Manual asignado por Joana hasta que se decida tracking automático (TODO cliente)
    nivel: nivelAlianzaEnum('nivel'),
    // Plan de pautas digitales asignado (informativo, NO entra al cálculo)
    presupuestoPautasMensual: numeric('presupuesto_pautas_mensual', {
      precision: 18,
      scale: 2,
    }).default('0'),
    // Quién coordina el pago de las comisiones de esta alianza.
    // OTTY: Grupo pagos LGI (LGI, KB, DREAM BIG, BM VIRTUAL)
    // DIRECTO: pago directo al líder
    // MAFF OCADIZ: alianzas de Jorge (SOMOS, IXCHE, ADARA, KUCHMOTS)
    // Otro: texto libre por flexibilidad
    coordinaPago: text('coordina_pago'),
    activo: boolean('activo').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('lideres_tenant_idx').on(t.tenantId),
    afiliadoIdx: index('lideres_afiliado_idx').on(t.afiliadoId),
  }),
)

// ─── Asesores ────────────────────────────────────────────────────────────────
// Un asesor trabaja bajo un líder. BM Corp NO le paga directo (el líder lo hace).
// El asesor SÍ tiene acceso al portal para ver sus comisiones.

export const asesores = pgTable(
  'asesores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    afiliadoId: uuid('afiliado_id')
      .notNull()
      .references(() => afiliados.id, { onDelete: 'restrict' }),
    // Líder responsable. NULL permitido — asesor puede entrar al sistema desde
    // Monday sync antes de que Joana asigne su líder. Cuenta portal requiere
    // tener líder asignado (validación en UI).
    liderId: uuid('lider_id').references(() => lideresAlianza.id, { onDelete: 'restrict' }),
    nombre: text('nombre').notNull(),
    email: text('email'),
    telefono: text('telefono'),
    // Cruce con la columna "Nombre"/asesor de Monday en ventas_bmcorp.asesor
    mondayNombre: text('monday_nombre'),
    activo: boolean('activo').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('asesores_tenant_idx').on(t.tenantId),
    afiliadoIdx: index('asesores_afiliado_idx').on(t.afiliadoId),
    liderIdx: index('asesores_lider_idx').on(t.liderId),
    mondayNombreIdx: index('asesores_monday_nombre_idx').on(t.tenantId, t.mondayNombre),
  }),
)

// ─── Esquemas de Comisión ────────────────────────────────────────────────────
// Plantilla GLOBAL (no por alianza): 2 esquemas — TERRENOS y YCD.
// Define costos operativos + estructura de bolsa comercial según doc §3.

export const esquemasComision = pgTable(
  'esquemas_comision',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    tipoEsquema: tipoEsquemaEnum('tipo_esquema').notNull(),
    tipoProducto: tipoProductoComisionEnum('tipo_producto').notNull(),
    // % total que paga el cliente (20 terrenos / 15 YCD)
    porcentajeTotalCliente: numeric('porcentaje_total_cliente', {
      precision: 5,
      scale: 2,
    }).notNull(),
    // Comisión operativa
    porcentajeOpBmcorp: numeric('porcentaje_op_bmcorp', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    porcentajeOpYesyucan: numeric('porcentaje_op_yesyucan', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    // Participación fija de socios (solo terrenos)
    porcentajeSocioFijoJorge: numeric('porcentaje_socio_fijo_jorge', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    porcentajeSocioFijoKass: numeric('porcentaje_socio_fijo_kass', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    // Bolsa comercial (15% terrenos / 12% YCD) — se reparte vía matrizAlianzaProducto
    porcentajeBolsaComercial: numeric('porcentaje_bolsa_comercial', {
      precision: 5,
      scale: 2,
    }).notNull(),
    // Comisión estándar del asesor (8% terrenos / 7% YCD)
    porcentajeAsesorEstandar: numeric('porcentaje_asesor_estandar', {
      precision: 5,
      scale: 2,
    }).notNull(),
    // Tope del líder en YCD (10% según doc; null para terrenos)
    porcentajeLiderTope: numeric('porcentaje_lider_tope', { precision: 5, scale: 2 }),
    // Razón social que factura (informativo)
    razonSocial: text('razon_social'),
    fechaInicio: date('fecha_inicio').notNull(),
    fechaFin: date('fecha_fin'),
    observaciones: text('observaciones'),
    activo: boolean('activo').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('esquemas_tenant_idx').on(t.tenantId),
    tipoProductoIdx: index('esquemas_tipo_producto_idx').on(t.tenantId, t.tipoProducto, t.activo),
    // Un solo esquema activo por (tenant, tipoProducto). Previene duplicados de seed.
    tenantTipoProductoActivoUnique: uniqueIndex('esquemas_tenant_tipo_activo_unique')
      .on(t.tenantId, t.tipoProducto)
      .where(sql`${t.activo} = true AND ${t.deletedAt} IS NULL`),
  }),
)

// ─── Matriz Alianza × Producto ───────────────────────────────────────────────
// Reemplaza reglasEsquema. Define, por (alianza, tipoProducto), cómo se reparte
// la bolsa comercial entre líder y socios (Jorge/Kass/Diana). Doc §3.1 y §3.2.

export const matrizAlianzaProducto = pgTable(
  'matriz_alianza_producto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    afiliadoId: uuid('afiliado_id')
      .notNull()
      .references(() => afiliados.id, { onDelete: 'restrict' }),
    tipoProducto: tipoProductoComisionEnum('tipo_producto').notNull(),
    // Líder responsable de la alianza para este tipo de producto
    liderId: uuid('lider_id').references(() => lideresAlianza.id, { onDelete: 'set null' }),
    // % afiliación = lo que recibe el líder de la bolsa comercial (de ahí paga al asesor)
    porcentajeAfiliacion: numeric('porcentaje_afiliacion', { precision: 5, scale: 2 }).notNull(),
    // Reparto a socios (parte de la bolsa que NO va al líder)
    porcentajeJorgeBolsa: numeric('porcentaje_jorge_bolsa', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    porcentajeKassBolsa: numeric('porcentaje_kass_bolsa', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    porcentajeDianaBolsa: numeric('porcentaje_diana_bolsa', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    reglaEspecial: reglaEspecialAlianzaEnum('regla_especial').notNull().default('NINGUNA'),
    // Si la alianza requiere configuración manual (e.g. está en Monday pero no en doc)
    requiereConfig: boolean('requiere_config').notNull().default(false),
    // Notas operativas — Joana puede dejar mensajes para validar después
    notas: text('notas'),
    activo: boolean('activo').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('matriz_tenant_idx').on(t.tenantId),
    afiliadoIdx: index('matriz_afiliado_idx').on(t.afiliadoId),
    liderIdx: index('matriz_lider_idx').on(t.liderId),
    // Una alianza tiene UN solo registro por tipoProducto
    afiliadoProductoUnique: uniqueIndex('matriz_afiliado_producto_unique').on(
      t.tenantId,
      t.afiliadoId,
      t.tipoProducto,
    ),
  }),
)

// ─── Override de matriz por NIVEL de membresía ───────────────────────────────
// La matriz base (matrizAlianzaProducto) = reparto SIN meta. Cuando la alianza
// alcanza un nivel (ÓNIX/TURQUESA/JADE), el bono cambia cómo se divide la bolsa:
// estas filas guardan la variante de reparto por nivel. El cliente las edita
// (config-driven) sin tocar código. Si no hay override para el nivel del mes,
// el motor usa la matriz base.
export const matrizNivelOverride = pgTable(
  'matriz_nivel_override',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    matrizId: uuid('matriz_id')
      .notNull()
      .references(() => matrizAlianzaProducto.id, { onDelete: 'cascade' }),
    nivel: nivelAlianzaEnum('nivel').notNull(),
    porcentajeAfiliacion: numeric('porcentaje_afiliacion', { precision: 5, scale: 2 }).notNull(),
    porcentajeJorgeBolsa: numeric('porcentaje_jorge_bolsa', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    porcentajeKassBolsa: numeric('porcentaje_kass_bolsa', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    porcentajeDianaBolsa: numeric('porcentaje_diana_bolsa', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('matriz_override_tenant_idx').on(t.tenantId),
    matrizNivelUnique: uniqueIndex('matriz_override_matriz_nivel_unique').on(
      t.tenantId,
      t.matrizId,
      t.nivel,
    ),
  }),
)

// ─── Comisiones Calculadas ───────────────────────────────────────────────────
// Snapshot del cálculo de comisión para una venta. Se recalcula si cambia enganchePagado.

export const comisionesCalculadas = pgTable(
  'comisiones_calculadas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    ventaId: uuid('venta_id')
      .notNull()
      .references(() => ventasBmcorp.id, { onDelete: 'restrict' }),
    esquemaId: uuid('esquema_id').references(() => esquemasComision.id, { onDelete: 'set null' }),
    matrizId: uuid('matriz_id').references(() => matrizAlianzaProducto.id, {
      onDelete: 'set null',
    }),
    // Snapshot del cálculo — congelado al momento de procesar la venta
    montoVenta: numeric('monto_venta', { precision: 18, scale: 2 }).notNull(),
    tipoProducto: tipoProductoComisionEnum('tipo_producto').notNull(),
    porcentajeTotalAplicado: numeric('porcentaje_total_aplicado', {
      precision: 5,
      scale: 2,
    }).notNull(),
    comisionBrutaTotal: numeric('comision_bruta_total', { precision: 18, scale: 2 }).notNull(),
    // Desglose por concepto (todos los montos)
    montoOpBmcorp: numeric('monto_op_bmcorp', { precision: 18, scale: 2 }).notNull().default('0'),
    montoOpYesyucan: numeric('monto_op_yesyucan', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    montoSocioFijoJorge: numeric('monto_socio_fijo_jorge', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    montoSocioFijoKass: numeric('monto_socio_fijo_kass', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    montoBolsaComercial: numeric('monto_bolsa_comercial', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    montoAsesor: numeric('monto_asesor', { precision: 18, scale: 2 }).notNull().default('0'),
    montoLiderSaldo: numeric('monto_lider_saldo', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    montoSocioBolsaJorge: numeric('monto_socio_bolsa_jorge', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    montoSocioBolsaKass: numeric('monto_socio_bolsa_kass', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    montoSocioBolsaDiana: numeric('monto_socio_bolsa_diana', { precision: 18, scale: 2 })
      .notNull()
      .default('0'),
    // Flujo y diferimiento
    enganchePagado: numeric('enganche_pagado', { precision: 18, scale: 2 }).notNull().default('0'),
    porcentajeEnganche: numeric('porcentaje_enganche', { precision: 5, scale: 2 }),
    montoLiberable: numeric('monto_liberable', { precision: 18, scale: 2 }).notNull(),
    montoDiferido: numeric('monto_diferido', { precision: 18, scale: 2 }).notNull(),
    esPrecalculo: boolean('es_precalculo').notNull().default(false),
    // Si la alianza requiere config (no estaba en doc), no se calcula hasta que Joana configure
    sinConfig: boolean('sin_config').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('comisiones_tenant_idx').on(t.tenantId),
    ventaUniqueIdx: uniqueIndex('comisiones_venta_unique').on(t.tenantId, t.ventaId),
    esquemaIdx: index('comisiones_esquema_idx').on(t.esquemaId),
    matrizIdx: index('comisiones_matriz_idx').on(t.matrizId),
  }),
)

// ─── Cortes de Dispersión ─────────────────────────────────────────────────────
// Cada lunes o jueves Joana abre un corte que agrupa pagos de ventas.
// Flujo: BORRADOR → EN_REVISION → APROBADO/RECHAZADO
// Al aprobar, las dispersiones del corte pasan a AUTORIZADA (visible en portal).

export const cortesDispersion = pgTable(
  'cortes_dispersion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    empresaId: uuid('empresa_id')
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    // Fecha del día del corte (el lunes o jueves correspondiente)
    fechaCorte: date('fecha_corte').notNull(),
    tipoDia: tipoDiaCorteEnum('tipo_dia').notNull(),
    estado: estadoCorteEnum('estado').notNull().default('BORRADOR'),
    // Suma total a dispersar en este corte (calculada al cerrar)
    totalADispersar: numeric('total_a_dispersar', { precision: 18, scale: 2 }).default('0'),
    // Notas de Joana para el corte
    notasJoana: text('notas_joana'),
    // Quién crea el corte (Joana)
    creadoPor: text('creado_por')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    // Quién aprueba o rechaza (Jorge o Carla)
    aprobadoPor: text('aprobado_por').references(() => users.id, { onDelete: 'set null' }),
    fechaAprobacion: timestamp('fecha_aprobacion', { withTimezone: true }),
    notasAprobador: text('notas_aprobador'),
    // Método de pago default del corte (Jorge/Carla pueden override por lider)
    metodoPagoDefault: metodoPagoLiderEnum('metodo_pago_default').default('EFECTIVO'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('cortes_tenant_idx').on(t.tenantId),
    empresaIdx: index('cortes_empresa_idx').on(t.empresaId),
    estadoIdx: index('cortes_estado_idx').on(t.tenantId, t.estado),
    fechaIdx: index('cortes_fecha_idx').on(t.tenantId, t.fechaCorte),
  }),
)

// ─── Ventas Pago Corte ────────────────────────────────────────────────────────
// Cada venta puede recibir uno o más pagos en distintos cortes.
// Joana registra aquí cuánto abonó el cliente en ese corte y el sistema
// calcula dispersiones proporcionales al % pagado.

export const ventasPagoCorte = pgTable(
  'ventas_pago_corte',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    corteId: uuid('corte_id')
      .notNull()
      .references(() => cortesDispersion.id, { onDelete: 'cascade' }),
    ventaId: uuid('venta_id')
      .notNull()
      .references(() => ventasBmcorp.id, { onDelete: 'restrict' }),
    // Cuánto abonó el cliente en este corte (en pesos)
    montoPagadoCliente: numeric('monto_pagado_cliente', { precision: 18, scale: 2 }).notNull(),
    // % del monto total de la venta (calculado: montoPagadoCliente / venta.monto * 100)
    porcentajePagado: numeric('porcentaje_pagado', { precision: 8, scale: 4 }).notNull(),
    // Total a dispersar en este corte (puede diferir si Joana ajusta manualmente)
    montoADispersar: numeric('monto_a_dispersar', { precision: 18, scale: 2 }).notNull(),
    // Notas de Joana para esta línea
    notasJoana: text('notas_joana'),
    // Cómo y cuándo abonó el cliente (captura manual; opcional). El método de
    // pago del beneficiario va en dispersiones/comprobantes, esto es del CLIENTE.
    metodoPagoCliente: metodoPagoLiderEnum('metodo_pago_cliente'),
    fechaPagoCliente: date('fecha_pago_cliente'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('ventas_pago_corte_tenant_idx').on(t.tenantId),
    corteIdx: index('ventas_pago_corte_corte_idx').on(t.corteId),
    ventaIdx: index('ventas_pago_corte_venta_idx').on(t.ventaId),
    // Una venta solo puede aparecer UNA vez por corte
    corteVentaUnique: uniqueIndex('ventas_pago_corte_unique').on(t.corteId, t.ventaId),
  }),
)

// ─── Dispersiones (líneas de pago a beneficiarios) ───────────────────────────
// Por cada comisión calculada se generan 4 dispersiones:
// OP_BMCORP, OP_YESYUCAN, LIDER, SOCIOS.

export const dispersiones = pgTable(
  'dispersiones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    comisionId: uuid('comision_id')
      .notNull()
      .references(() => comisionesCalculadas.id, { onDelete: 'restrict' }),
    // Corte al que pertenece esta dispersión (null si aún no fue incluida en ningún corte)
    corteId: uuid('corte_id').references(() => cortesDispersion.id, { onDelete: 'set null' }),
    // Pago de cliente que originó esta dispersión (trazabilidad)
    pagoCorteId: uuid('pago_corte_id').references(() => ventasPagoCorte.id, {
      onDelete: 'set null',
    }),
    // Líder dueño de la dispersión (null si ASESOR_FLAMINGO o socio fijo/bolsa)
    liderId: uuid('lider_id').references(() => lideresAlianza.id, { onDelete: 'set null' }),
    // Asesor cuando tipoBeneficiario = ASESOR (null en otros casos)
    asesorId: uuid('asesor_id').references(() => asesores.id, { onDelete: 'set null' }),
    tipoBeneficiario: tipoBeneficiarioEnum('tipo_beneficiario').notNull(),
    beneficiarioNombre: text('beneficiario_nombre').notNull(),
    montoTotal: numeric('monto_total', { precision: 18, scale: 2 }).notNull(),
    montoPagado: numeric('monto_pagado', { precision: 18, scale: 2 }).notNull().default('0'),
    montoDiferido: numeric('monto_diferido', { precision: 18, scale: 2 }).notNull().default('0'),
    estado: estadoDispersionEnum('estado').notNull().default('PENDIENTE'),
    // Método de pago seleccionado por Jorge/Carla al aprobar el corte
    metodoPago: metodoPagoLiderEnum('metodo_pago'),
    // Si acumulaMensual=true, no se paga al liberar — se agrupa fin de mes (doc §4 Jorge bolsa)
    acumulaMensual: boolean('acumula_mensual').notNull().default(false),
    fechaEstimadaPago: date('fecha_estimada_pago'),
    fechaPago: date('fecha_pago'),
    // Pago/comprobante que cubrió esta dispersión (null si aún no pagada). Flujo Tesorería.
    comprobanteId: uuid('comprobante_id').references((): AnyPgColumn => comprobantesPago.id, {
      onDelete: 'set null',
    }),
    pagadoPor: text('pagado_por').references(() => users.id, { onDelete: 'set null' }),
    aprobadoPor: text('aprobado_por').references(() => users.id, { onDelete: 'set null' }),
    fechaAprobacion: timestamp('fecha_aprobacion', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('dispersiones_tenant_idx').on(t.tenantId),
    comisionIdx: index('dispersiones_comision_idx').on(t.comisionId),
    corteIdx: index('dispersiones_corte_idx').on(t.corteId),
    estadoIdx: index('dispersiones_estado_idx').on(t.tenantId, t.estado),
    fechaIdx: index('dispersiones_fecha_pago_idx').on(t.fechaPago),
    liderIdx: index('dispersiones_lider_idx').on(t.liderId),
    asesorIdx: index('dispersiones_asesor_idx').on(t.asesorId),
    acumulaIdx: index('dispersiones_acumula_idx').on(t.tenantId, t.acumulaMensual, t.estado),
    // Para dashboard split (filtra por tipo + estado)
    tipoEstadoIdx: index('dispersiones_tipo_estado_idx').on(
      t.tenantId,
      t.tipoBeneficiario,
      t.estado,
    ),
    comisionTipoUnique: uniqueIndex('dispersiones_comision_tipo_unique')
      .on(t.comisionId, t.tipoBeneficiario)
      .where(sql`pago_corte_id IS NULL`),
  }),
)

// ─── Bonos al Líder por Meta Cumplida ────────────────────────────────────────
// Doc §1, §2 y nota operativa: bono % adicional cuando alianza alcanza meta
// mensual. Lo paga el líder (no afecta cálculo base). Joana lo registra manual.

export const bonosLider = pgTable(
  'bonos_lider',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    liderId: uuid('lider_id')
      .notNull()
      .references(() => lideresAlianza.id, { onDelete: 'cascade' }),
    afiliadoId: uuid('afiliado_id')
      .notNull()
      .references(() => afiliados.id, { onDelete: 'restrict' }),
    anio: integer('anio').notNull(),
    mes: integer('mes').notNull(),
    nivelAlcanzado: nivelAlianzaEnum('nivel_alcanzado').notNull(),
    promedioVentas: numeric('promedio_ventas', { precision: 18, scale: 2 }).notNull(),
    porcentajeBono: numeric('porcentaje_bono', { precision: 5, scale: 2 }).notNull(),
    montoBono: numeric('monto_bono', { precision: 18, scale: 2 }).notNull(),
    // Cálculo del bono SIEMPRE auto. Reconocimiento de meta puede ser numérico o manual:
    // NUMERICO_AUTO: cumplio_meta = (promedioVentas >= umbralNivel) sin intervención
    // MANUAL: Joana o líder setea cumplio_meta basado en criterio cualitativo
    modoBono: modoBonoEnum('modo_bono').notNull().default('NUMERICO_AUTO'),
    cumplioMeta: boolean('cumplio_meta').notNull().default(false),
    // Bono lo paga el LÍDER (no BMCorp). Esta marca refleja status de pago por parte del líder.
    pagado: boolean('pagado').notNull().default(false),
    fechaPago: date('fecha_pago'),
    registradoPor: text('registrado_por').references(() => users.id, { onDelete: 'set null' }),
    observaciones: text('observaciones'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('bonos_tenant_idx').on(t.tenantId),
    liderPeriodoUnique: uniqueIndex('bonos_lider_periodo_unique').on(
      t.tenantId,
      t.liderId,
      t.anio,
      t.mes,
    ),
  }),
)

// ─── Asesores Niveles (modelo híbrido auto + manual) ────────────────────────
// Sistema calcula nivel_propuesto del promedio últimos 3 meses.
// Joana confirma nivel_efectivo. Si override → motivo + audit trail.

export const asesoresNiveles = pgTable(
  'asesores_niveles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    asesorId: uuid('asesor_id')
      .notNull()
      .references(() => asesores.id, { onDelete: 'cascade' }),
    anio: integer('anio').notNull(),
    mes: integer('mes').notNull(),
    // Calculado por el sistema (promedio últimos 3 meses)
    nivelPropuesto: nivelAlianzaEnum('nivel_propuesto'),
    promedioVentasCalculado: numeric('promedio_ventas_calculado', {
      precision: 18,
      scale: 2,
    }).default('0'),
    // Confirmado o sobrescrito por Joana
    nivelEfectivo: nivelAlianzaEnum('nivel_efectivo').notNull(),
    motivoOverride: text('motivo_override'), // si difiere de propuesto
    confirmadoPor: text('confirmado_por').references(() => users.id, { onDelete: 'set null' }),
    confirmadoEn: timestamp('confirmado_en', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('asesores_niveles_tenant_idx').on(t.tenantId),
    asesorPeriodoUnique: uniqueIndex('asesores_niveles_periodo_unique').on(
      t.tenantId,
      t.asesorId,
      t.anio,
      t.mes,
    ),
  }),
)

// ─── Config de Niveles de Membresía (umbrales editables) ─────────────────────
// Define, por (nivel, tipoProducto), el rango de promedio mensual de ventas que
// otorga ese nivel y el % de bono. Hace el módulo de niveles dinámico: Joana
// edita umbrales/bonos sin tocar código. umbralMax null = nivel tope (sin techo).
export const nivelesMembresiaConfig = pgTable(
  'niveles_membresia_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nivel: nivelAlianzaEnum('nivel').notNull(),
    tipoProducto: tipoProductoComisionEnum('tipo_producto').notNull(),
    // Promedio mensual de ventas mínimo para alcanzar el nivel
    umbralMin: numeric('umbral_min', { precision: 18, scale: 2 }).notNull(),
    // Tope del rango (null = nivel más alto, sin techo)
    umbralMax: numeric('umbral_max', { precision: 18, scale: 2 }),
    // Bono % adicional al alcanzar el nivel
    porcentajeBono: numeric('porcentaje_bono', { precision: 5, scale: 2 }).notNull().default('0'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('niveles_config_tenant_idx').on(t.tenantId),
    nivelProductoUnique: uniqueIndex('niveles_config_nivel_producto_unique').on(
      t.tenantId,
      t.nivel,
      t.tipoProducto,
    ),
  }),
)

// ─── Pautas Digitales (compromiso vs ejecutado) ──────────────────────────────
// NO entra al cálculo de comisión. Métrica complementaria de compromiso de
// marketing budget: Jade→$15k/mes, Turquesa→$10k/mes, Onix→$5k/mes (doc §1 y §2).
// Alerta si gap entre compromiso y ejecutado > 20%.

export const pautasDigitales = pgTable(
  'pautas_digitales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    afiliadoId: uuid('afiliado_id')
      .notNull()
      .references(() => afiliados.id, { onDelete: 'restrict' }),
    liderId: uuid('lider_id').references(() => lideresAlianza.id, { onDelete: 'set null' }),
    anio: integer('anio').notNull(),
    mes: integer('mes').notNull(),
    nivelVigente: nivelAlianzaEnum('nivel_vigente').notNull(),
    // Compromiso según nivel (auto del esquema vigente)
    montoComprometido: numeric('monto_comprometido', { precision: 18, scale: 2 }).notNull(),
    // Ejecutado real (Joana/Marketing lo captura desde Excel/Drive)
    montoEjecutado: numeric('monto_ejecutado', { precision: 18, scale: 2 }).notNull().default('0'),
    // Gap calculado para semáforo. > 20% = alerta
    porcentajeGap: numeric('porcentaje_gap', { precision: 5, scale: 2 }),
    capturadoPor: text('capturado_por').references(() => users.id, { onDelete: 'set null' }),
    observaciones: text('observaciones'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('pautas_tenant_idx').on(t.tenantId),
    afiliadoPeriodoUnique: uniqueIndex('pautas_afiliado_periodo_unique').on(
      t.tenantId,
      t.afiliadoId,
      t.anio,
      t.mes,
    ),
  }),
)

// ─── Comprobantes de Pago ────────────────────────────────────────────────────
// Archivos (PDF/imagen) que acreditan que se pagó una dispersión.

// Evento de pago: un comprobante cubre el pago a UN beneficiario en UN corte
// (puede abarcar varias dispersiones de ese beneficiario). Las dispersiones cubiertas
// apuntan aquí vía dispersiones.comprobanteId. `dispersionId` queda legacy/nullable.
export const comprobantesPago = pgTable(
  'comprobantes_pago',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // Corte y beneficiario del pago (flujo Tesorería agrupado)
    corteId: uuid('corte_id').references(() => cortesDispersion.id, { onDelete: 'restrict' }),
    liderId: uuid('lider_id').references(() => lideresAlianza.id, { onDelete: 'set null' }),
    asesorId: uuid('asesor_id').references(() => asesores.id, { onDelete: 'set null' }),
    beneficiarioTipo: tipoBeneficiarioEnum('beneficiario_tipo'),
    beneficiarioNombre: text('beneficiario_nombre'),
    metodoPago: metodoPagoLiderEnum('metodo_pago'),
    montoPagado: numeric('monto_pagado', { precision: 18, scale: 2 }),
    fechaPago: date('fecha_pago'),
    // Legacy: vínculo directo 1↔1 (marcado individual). Nullable desde flujo agrupado.
    dispersionId: uuid('dispersion_id').references(() => dispersiones.id, { onDelete: 'restrict' }),
    nombre: text('nombre').notNull(),
    rutaArchivo: text('ruta_archivo').notNull(),
    mimeType: text('mime_type').notNull(),
    tamanioBytes: integer('tamanio_bytes').notNull(),
    subidoPor: text('subido_por')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dispersionIdx: index('comprobantes_dispersion_idx').on(t.dispersionId),
    corteIdx: index('comprobantes_corte_idx').on(t.corteId),
    tenantIdx: index('comprobantes_tenant_idx').on(t.tenantId),
  }),
)

// ─── Usuarios del Portal ─────────────────────────────────────────────────────
// Puente entre users (Better Auth) y entidad del portal (líder o asesor).

export const usuariosPortal = pgTable(
  'usuarios_portal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rolPortal: rolPortalEnum('rol_portal').notNull(),
    // Exactamente uno tendrá valor según el rolPortal
    liderId: uuid('lider_id').references(() => lideresAlianza.id, { onDelete: 'cascade' }),
    asesorId: uuid('asesor_id').references(() => asesores.id, { onDelete: 'cascade' }),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUniqueIdx: uniqueIndex('usuarios_portal_user_unique').on(t.userId),
    tenantIdx: index('usuarios_portal_tenant_idx').on(t.tenantId),
    liderIdx: index('usuarios_portal_lider_idx').on(t.liderId),
    asesorIdx: index('usuarios_portal_asesor_idx').on(t.asesorId),
  }),
)

// ─── NPS Registros (captura trimestral interna) ──────────────────────────────

export const npsRegistros = pgTable(
  'nps_registros',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    empresaEncuestada: text('empresa_encuestada').notNull(),
    anio: integer('anio').notNull(),
    trimestre: integer('trimestre').notNull(),
    puntuacion: integer('puntuacion').notNull(),
    respondientes: integer('respondientes').notNull().default(0),
    promotores: integer('promotores').notNull().default(0),
    detractores: integer('detractores').notNull().default(0),
    comentarios: text('comentarios'),
    capturadoPor: text('capturado_por').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantPeriodoUnique: uniqueIndex('nps_tenant_periodo_unique').on(
      t.tenantId,
      t.empresaEncuestada,
      t.anio,
      t.trimestre,
    ),
  }),
)

// ─── Bonos por umbral mensual (Flamingo, Hackers/Diana) ──────────────────────
// Reglas config-driven para que Joana/Carla añadan acuerdos especiales sin
// tocar código. Casos reales validados con PDFs de abril 2026:
//   • Flamingo (Alberto López): 11% base ARKA+RH + 0.5% sobre excedente al
//     cruzar $10M acumulados (YCD+ARKA+RH del afiliado en el mes).
//   • Hackers (Diana) F1: 12% base + 0.5% sobre excedente al cruzar $10M.
//   • Hackers (Diana) F2: 1% override sobre TODAS las ventas de Flamingo +
//     0.5% sobre excedente ARKA+RH al cruzar $10M de Flamingo.
//
// El bono umbral se paga a más tardar el día 15 del mes siguiente al cierre.

export const bonosUmbralConfig = pgTable(
  'bonos_umbral_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // Etiqueta humana ("Flamingo umbral 10M", "Diana override Flamingo")
    nombre: text('nombre').notNull(),
    // Afiliado que RECIBE el bono / override
    afiliadoDestinatarioId: uuid('afiliado_destinatario_id')
      .notNull()
      .references(() => afiliados.id, { onDelete: 'cascade' }),
    tipoFuente: tipoFuenteBonoEnum('tipo_fuente').notNull(),
    // Afiliado cuyas ventas alimentan el cálculo (NULL si PROPIA = mismo destinatario)
    afiliadoOrigenId: uuid('afiliado_origen_id').references(() => afiliados.id, {
      onDelete: 'restrict',
    }),
    // % override sobre TODAS las ventas del afiliadoOrigen (caso Diana 1% sobre
    // Flamingo). NULL si PROPIA (no hay override, sólo bono al cruzar umbral).
    overridePct: numeric('override_pct', { precision: 5, scale: 2 }),
    // Umbral acumulado mensual (USD/MXN) que dispara el bono extra
    umbralAcumuladoMensual: numeric('umbral_acumulado_mensual', {
      precision: 18,
      scale: 2,
    }).notNull(),
    bonoPct: numeric('bono_pct', { precision: 5, scale: 2 }).notNull(),
    // Grupos cuyas ventas SUMAN al acumulado (ej. ['YCD','ARKA','RH'])
    gruposAcumulan: jsonb('grupos_acumulan').notNull(),
    // Grupos sobre los que se calcula el bono % (ej. ['ARKA','RH'] — excluye YCD)
    gruposAplicaBono: jsonb('grupos_aplica_bono').notNull(),
    // Fórmula a usar — default EXCEDENTE (caso Diana, más conservador). Joana
    // la cambia desde UI por regla si necesita otra interpretación.
    formulaCalculo: formulaBonoEnum('formula_calculo').notNull().default('EXCEDENTE'),
    activo: boolean('activo').notNull().default(true),
    vigenteDesde: date('vigente_desde').notNull(),
    vigenteHasta: date('vigente_hasta'),
    notas: text('notas'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('bonos_umbral_config_tenant_idx').on(t.tenantId),
    destinatarioIdx: index('bonos_umbral_config_destinatario_idx').on(
      t.tenantId,
      t.afiliadoDestinatarioId,
    ),
    activoIdx: index('bonos_umbral_config_activo_idx').on(t.tenantId, t.activo),
  }),
)

// Snapshot del cálculo mensual. Una fila por (config × año × mes). Idempotente.
export const bonosUmbralCalculados = pgTable(
  'bonos_umbral_calculados',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    configId: uuid('config_id')
      .notNull()
      .references(() => bonosUmbralConfig.id, { onDelete: 'cascade' }),
    anio: integer('anio').notNull(),
    mes: integer('mes').notNull(),
    // Volumen agregado por grupo (snapshot del momento del cálculo)
    ventasYcd: numeric('ventas_ycd', { precision: 18, scale: 2 }).notNull().default('0'),
    ventasArka: numeric('ventas_arka', { precision: 18, scale: 2 }).notNull().default('0'),
    ventasRh: numeric('ventas_rh', { precision: 18, scale: 2 }).notNull().default('0'),
    ventasOtro: numeric('ventas_otro', { precision: 18, scale: 2 }).notNull().default('0'),
    totalAcumulado: numeric('total_acumulado', { precision: 18, scale: 2 }).notNull(),
    // Excedente sobre el umbral (max(0, totalAcumulado − umbral))
    excedente: numeric('excedente', { precision: 18, scale: 2 }).notNull().default('0'),
    // Componente override (1% × ventas del origen, sólo si OVERRIDE_AFILIADO)
    montoOverride: numeric('monto_override', { precision: 18, scale: 2 }).notNull().default('0'),
    // Componente bono umbral (bonoPct × excedente aplicable a gruposAplicaBono)
    montoBono: numeric('monto_bono', { precision: 18, scale: 2 }).notNull().default('0'),
    montoTotal: numeric('monto_total', { precision: 18, scale: 2 }).notNull(),
    // Corte donde se va a pagar (NULL hasta que Joana lo agregue al corte)
    corteId: uuid('corte_id').references(() => cortesDispersion.id, { onDelete: 'set null' }),
    pagado: boolean('pagado').notNull().default(false),
    fechaPago: date('fecha_pago'),
    notas: text('notas'),
    calculadoEn: timestamp('calculado_en', { withTimezone: true }).notNull().defaultNow(),
    calculadoPor: text('calculado_por').references(() => users.id, { onDelete: 'set null' }),
    // Comprobante de pago del bono (FK a comprobantesPago, nullable hasta pagar)
    comprobanteId: uuid('comprobante_id').references(() => comprobantesPago.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('bonos_umbral_calc_tenant_idx').on(t.tenantId),
    configPeriodoUnique: uniqueIndex('bonos_umbral_calc_config_periodo_unique').on(
      t.tenantId,
      t.configId,
      t.anio,
      t.mes,
    ),
    corteIdx: index('bonos_umbral_calc_corte_idx').on(t.corteId),
  }),
)
