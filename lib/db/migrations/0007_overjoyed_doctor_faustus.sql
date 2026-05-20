CREATE TYPE "public"."estado_dispersion" AS ENUM('PENDIENTE', 'PARCIAL', 'PAGADO', 'DIFERIDO');--> statement-breakpoint
CREATE TYPE "public"."modo_bono" AS ENUM('NUMERICO_AUTO', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."nivel_alianza" AS ENUM('JADE', 'TURQUESA', 'ONIX_NEGRO');--> statement-breakpoint
CREATE TYPE "public"."regla_especial_alianza" AS ENUM('NINGUNA', 'FLAMINGO_DIRECTO', 'LGI_YCD_ACUMULA');--> statement-breakpoint
CREATE TYPE "public"."rol_portal" AS ENUM('LIDER_ALIANZA', 'ASESOR');--> statement-breakpoint
CREATE TYPE "public"."tipo_beneficiario_dispersion" AS ENUM('OP_BMCORP', 'OP_YESYUCAN', 'ASESOR', 'LIDER_SALDO', 'SOCIO_BOLSA_JORGE', 'SOCIO_BOLSA_KASS', 'SOCIO_BOLSA_DIANA', 'SOCIO_FIJO_JORGE', 'SOCIO_FIJO_KASS');--> statement-breakpoint
CREATE TYPE "public"."tipo_esquema_comision" AS ENUM('ALIADOS_DEL_UNIVERSO', 'YUCAN_PARTNERS');--> statement-breakpoint
CREATE TYPE "public"."tipo_producto_comision" AS ENUM('TERRENO', 'ACCION');--> statement-breakpoint
CREATE TABLE "asesores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"afiliado_id" uuid NOT NULL,
	"lider_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text,
	"telefono" text,
	"monday_nombre" text,
	"activo" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asesores_niveles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asesor_id" uuid NOT NULL,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"nivel_propuesto" "nivel_alianza",
	"promedio_ventas_calculado" numeric(18, 2) DEFAULT '0',
	"nivel_efectivo" "nivel_alianza" NOT NULL,
	"motivo_override" text,
	"confirmado_por" text,
	"confirmado_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonos_lider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lider_id" uuid NOT NULL,
	"afiliado_id" uuid NOT NULL,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"nivel_alcanzado" "nivel_alianza" NOT NULL,
	"promedio_ventas" numeric(18, 2) NOT NULL,
	"porcentaje_bono" numeric(5, 2) NOT NULL,
	"monto_bono" numeric(18, 2) NOT NULL,
	"modo_bono" "modo_bono" DEFAULT 'NUMERICO_AUTO' NOT NULL,
	"cumplio_meta" boolean DEFAULT false NOT NULL,
	"pagado" boolean DEFAULT false NOT NULL,
	"fecha_pago" date,
	"registrado_por" text,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comisiones_calculadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"venta_id" uuid NOT NULL,
	"esquema_id" uuid,
	"matriz_id" uuid,
	"monto_venta" numeric(18, 2) NOT NULL,
	"tipo_producto" "tipo_producto_comision" NOT NULL,
	"porcentaje_total_aplicado" numeric(5, 2) NOT NULL,
	"comision_bruta_total" numeric(18, 2) NOT NULL,
	"monto_op_bmcorp" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_op_yesyucan" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_socio_fijo_jorge" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_socio_fijo_kass" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_bolsa_comercial" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_asesor" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_lider_saldo" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_socio_bolsa_jorge" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_socio_bolsa_kass" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_socio_bolsa_diana" numeric(18, 2) DEFAULT '0' NOT NULL,
	"enganche_pagado" numeric(18, 2) DEFAULT '0' NOT NULL,
	"porcentaje_enganche" numeric(5, 2),
	"monto_liberable" numeric(18, 2) NOT NULL,
	"monto_diferido" numeric(18, 2) NOT NULL,
	"es_precalculo" boolean DEFAULT false NOT NULL,
	"sin_config" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comprobantes_pago" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"dispersion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"ruta_archivo" text NOT NULL,
	"mime_type" text NOT NULL,
	"tamanio_bytes" integer NOT NULL,
	"subido_por" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispersiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"comision_id" uuid NOT NULL,
	"lider_id" uuid,
	"asesor_id" uuid,
	"tipo_beneficiario" "tipo_beneficiario_dispersion" NOT NULL,
	"beneficiario_nombre" text NOT NULL,
	"monto_total" numeric(18, 2) NOT NULL,
	"monto_pagado" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_diferido" numeric(18, 2) DEFAULT '0' NOT NULL,
	"estado" "estado_dispersion" DEFAULT 'PENDIENTE' NOT NULL,
	"acumula_mensual" boolean DEFAULT false NOT NULL,
	"fecha_estimada_pago" date,
	"fecha_pago" date,
	"aprobado_por" text,
	"fecha_aprobacion" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "esquemas_comision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo_esquema" "tipo_esquema_comision" NOT NULL,
	"tipo_producto" "tipo_producto_comision" NOT NULL,
	"porcentaje_total_cliente" numeric(5, 2) NOT NULL,
	"porcentaje_op_bmcorp" numeric(5, 2) DEFAULT '0' NOT NULL,
	"porcentaje_op_yesyucan" numeric(5, 2) DEFAULT '0' NOT NULL,
	"porcentaje_socio_fijo_jorge" numeric(5, 2) DEFAULT '0' NOT NULL,
	"porcentaje_socio_fijo_kass" numeric(5, 2) DEFAULT '0' NOT NULL,
	"porcentaje_bolsa_comercial" numeric(5, 2) NOT NULL,
	"porcentaje_asesor_estandar" numeric(5, 2) NOT NULL,
	"porcentaje_lider_tope" numeric(5, 2),
	"razon_social" text,
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date,
	"observaciones" text,
	"activo" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lideres_alianza" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"afiliado_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"email" text,
	"telefono" text,
	"clabe" text,
	"banco" text,
	"numero_cuenta" text,
	"nivel" "nivel_alianza",
	"presupuesto_pautas_mensual" numeric(18, 2) DEFAULT '0',
	"activo" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matriz_alianza_producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"afiliado_id" uuid NOT NULL,
	"tipo_producto" "tipo_producto_comision" NOT NULL,
	"lider_id" uuid,
	"porcentaje_afiliacion" numeric(5, 2) NOT NULL,
	"porcentaje_jorge_bolsa" numeric(5, 2) DEFAULT '0' NOT NULL,
	"porcentaje_kass_bolsa" numeric(5, 2) DEFAULT '0' NOT NULL,
	"porcentaje_diana_bolsa" numeric(5, 2) DEFAULT '0' NOT NULL,
	"regla_especial" "regla_especial_alianza" DEFAULT 'NINGUNA' NOT NULL,
	"requiere_config" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nps_registros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_encuestada" text NOT NULL,
	"anio" integer NOT NULL,
	"trimestre" integer NOT NULL,
	"puntuacion" integer NOT NULL,
	"respondientes" integer DEFAULT 0 NOT NULL,
	"promotores" integer DEFAULT 0 NOT NULL,
	"detractores" integer DEFAULT 0 NOT NULL,
	"comentarios" text,
	"capturado_por" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pautas_digitales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"afiliado_id" uuid NOT NULL,
	"lider_id" uuid,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"nivel_vigente" "nivel_alianza" NOT NULL,
	"monto_comprometido" numeric(18, 2) NOT NULL,
	"monto_ejecutado" numeric(18, 2) DEFAULT '0' NOT NULL,
	"porcentaje_gap" numeric(5, 2),
	"capturado_por" text,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios_portal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rol_portal" "rol_portal" NOT NULL,
	"lider_id" uuid,
	"asesor_id" uuid,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "afiliados" ADD COLUMN "monday_label" text;--> statement-breakpoint
ALTER TABLE "afiliados" ADD COLUMN "tipo_esquema_default" "tipo_esquema_comision";--> statement-breakpoint
ALTER TABLE "afiliados" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "afiliados" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "asesores" ADD CONSTRAINT "asesores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesores" ADD CONSTRAINT "asesores_afiliado_id_afiliados_id_fk" FOREIGN KEY ("afiliado_id") REFERENCES "public"."afiliados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesores" ADD CONSTRAINT "asesores_lider_id_lideres_alianza_id_fk" FOREIGN KEY ("lider_id") REFERENCES "public"."lideres_alianza"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesores_niveles" ADD CONSTRAINT "asesores_niveles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesores_niveles" ADD CONSTRAINT "asesores_niveles_asesor_id_asesores_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."asesores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesores_niveles" ADD CONSTRAINT "asesores_niveles_confirmado_por_users_id_fk" FOREIGN KEY ("confirmado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_lider" ADD CONSTRAINT "bonos_lider_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_lider" ADD CONSTRAINT "bonos_lider_lider_id_lideres_alianza_id_fk" FOREIGN KEY ("lider_id") REFERENCES "public"."lideres_alianza"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_lider" ADD CONSTRAINT "bonos_lider_afiliado_id_afiliados_id_fk" FOREIGN KEY ("afiliado_id") REFERENCES "public"."afiliados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_lider" ADD CONSTRAINT "bonos_lider_registrado_por_users_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comisiones_calculadas" ADD CONSTRAINT "comisiones_calculadas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comisiones_calculadas" ADD CONSTRAINT "comisiones_calculadas_venta_id_ventas_bmcorp_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas_bmcorp"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comisiones_calculadas" ADD CONSTRAINT "comisiones_calculadas_esquema_id_esquemas_comision_id_fk" FOREIGN KEY ("esquema_id") REFERENCES "public"."esquemas_comision"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comisiones_calculadas" ADD CONSTRAINT "comisiones_calculadas_matriz_id_matriz_alianza_producto_id_fk" FOREIGN KEY ("matriz_id") REFERENCES "public"."matriz_alianza_producto"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD CONSTRAINT "comprobantes_pago_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD CONSTRAINT "comprobantes_pago_dispersion_id_dispersiones_id_fk" FOREIGN KEY ("dispersion_id") REFERENCES "public"."dispersiones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD CONSTRAINT "comprobantes_pago_subido_por_users_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_comision_id_comisiones_calculadas_id_fk" FOREIGN KEY ("comision_id") REFERENCES "public"."comisiones_calculadas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_lider_id_lideres_alianza_id_fk" FOREIGN KEY ("lider_id") REFERENCES "public"."lideres_alianza"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_asesor_id_asesores_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."asesores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_aprobado_por_users_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esquemas_comision" ADD CONSTRAINT "esquemas_comision_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lideres_alianza" ADD CONSTRAINT "lideres_alianza_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lideres_alianza" ADD CONSTRAINT "lideres_alianza_afiliado_id_afiliados_id_fk" FOREIGN KEY ("afiliado_id") REFERENCES "public"."afiliados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriz_alianza_producto" ADD CONSTRAINT "matriz_alianza_producto_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriz_alianza_producto" ADD CONSTRAINT "matriz_alianza_producto_afiliado_id_afiliados_id_fk" FOREIGN KEY ("afiliado_id") REFERENCES "public"."afiliados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriz_alianza_producto" ADD CONSTRAINT "matriz_alianza_producto_lider_id_lideres_alianza_id_fk" FOREIGN KEY ("lider_id") REFERENCES "public"."lideres_alianza"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_registros" ADD CONSTRAINT "nps_registros_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_registros" ADD CONSTRAINT "nps_registros_capturado_por_users_id_fk" FOREIGN KEY ("capturado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pautas_digitales" ADD CONSTRAINT "pautas_digitales_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pautas_digitales" ADD CONSTRAINT "pautas_digitales_afiliado_id_afiliados_id_fk" FOREIGN KEY ("afiliado_id") REFERENCES "public"."afiliados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pautas_digitales" ADD CONSTRAINT "pautas_digitales_lider_id_lideres_alianza_id_fk" FOREIGN KEY ("lider_id") REFERENCES "public"."lideres_alianza"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pautas_digitales" ADD CONSTRAINT "pautas_digitales_capturado_por_users_id_fk" FOREIGN KEY ("capturado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_portal" ADD CONSTRAINT "usuarios_portal_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_portal" ADD CONSTRAINT "usuarios_portal_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_portal" ADD CONSTRAINT "usuarios_portal_lider_id_lideres_alianza_id_fk" FOREIGN KEY ("lider_id") REFERENCES "public"."lideres_alianza"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_portal" ADD CONSTRAINT "usuarios_portal_asesor_id_asesores_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."asesores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asesores_tenant_idx" ON "asesores" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "asesores_afiliado_idx" ON "asesores" USING btree ("afiliado_id");--> statement-breakpoint
CREATE INDEX "asesores_lider_idx" ON "asesores" USING btree ("lider_id");--> statement-breakpoint
CREATE INDEX "asesores_monday_nombre_idx" ON "asesores" USING btree ("tenant_id","monday_nombre");--> statement-breakpoint
CREATE INDEX "asesores_niveles_tenant_idx" ON "asesores_niveles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "asesores_niveles_periodo_unique" ON "asesores_niveles" USING btree ("tenant_id","asesor_id","anio","mes");--> statement-breakpoint
CREATE INDEX "bonos_tenant_idx" ON "bonos_lider" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bonos_lider_periodo_unique" ON "bonos_lider" USING btree ("tenant_id","lider_id","anio","mes");--> statement-breakpoint
CREATE INDEX "comisiones_tenant_idx" ON "comisiones_calculadas" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comisiones_venta_unique" ON "comisiones_calculadas" USING btree ("tenant_id","venta_id");--> statement-breakpoint
CREATE INDEX "comisiones_esquema_idx" ON "comisiones_calculadas" USING btree ("esquema_id");--> statement-breakpoint
CREATE INDEX "comisiones_matriz_idx" ON "comisiones_calculadas" USING btree ("matriz_id");--> statement-breakpoint
CREATE INDEX "comprobantes_dispersion_idx" ON "comprobantes_pago" USING btree ("dispersion_id");--> statement-breakpoint
CREATE INDEX "comprobantes_tenant_idx" ON "comprobantes_pago" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dispersiones_tenant_idx" ON "dispersiones" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "dispersiones_comision_idx" ON "dispersiones" USING btree ("comision_id");--> statement-breakpoint
CREATE INDEX "dispersiones_estado_idx" ON "dispersiones" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "dispersiones_fecha_pago_idx" ON "dispersiones" USING btree ("fecha_pago");--> statement-breakpoint
CREATE INDEX "dispersiones_lider_idx" ON "dispersiones" USING btree ("lider_id");--> statement-breakpoint
CREATE INDEX "dispersiones_asesor_idx" ON "dispersiones" USING btree ("asesor_id");--> statement-breakpoint
CREATE INDEX "dispersiones_acumula_idx" ON "dispersiones" USING btree ("tenant_id","acumula_mensual","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "dispersiones_comision_tipo_unique" ON "dispersiones" USING btree ("comision_id","tipo_beneficiario");--> statement-breakpoint
CREATE INDEX "esquemas_tenant_idx" ON "esquemas_comision" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "esquemas_tipo_producto_idx" ON "esquemas_comision" USING btree ("tenant_id","tipo_producto","activo");--> statement-breakpoint
CREATE INDEX "lideres_tenant_idx" ON "lideres_alianza" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lideres_afiliado_idx" ON "lideres_alianza" USING btree ("afiliado_id");--> statement-breakpoint
CREATE INDEX "matriz_tenant_idx" ON "matriz_alianza_producto" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "matriz_afiliado_idx" ON "matriz_alianza_producto" USING btree ("afiliado_id");--> statement-breakpoint
CREATE INDEX "matriz_lider_idx" ON "matriz_alianza_producto" USING btree ("lider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matriz_afiliado_producto_unique" ON "matriz_alianza_producto" USING btree ("tenant_id","afiliado_id","tipo_producto");--> statement-breakpoint
CREATE UNIQUE INDEX "nps_tenant_periodo_unique" ON "nps_registros" USING btree ("tenant_id","empresa_encuestada","anio","trimestre");--> statement-breakpoint
CREATE INDEX "pautas_tenant_idx" ON "pautas_digitales" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pautas_afiliado_periodo_unique" ON "pautas_digitales" USING btree ("tenant_id","afiliado_id","anio","mes");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_portal_user_unique" ON "usuarios_portal" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "usuarios_portal_tenant_idx" ON "usuarios_portal" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "usuarios_portal_lider_idx" ON "usuarios_portal" USING btree ("lider_id");--> statement-breakpoint
CREATE INDEX "usuarios_portal_asesor_idx" ON "usuarios_portal" USING btree ("asesor_id");--> statement-breakpoint
CREATE INDEX "afiliados_monday_label_idx" ON "afiliados" USING btree ("tenant_id","monday_label");