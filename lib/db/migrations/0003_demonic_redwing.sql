CREATE TYPE "public"."estado_comision" AS ENUM('PENDIENTE', 'PARCIAL', 'PAGADA');--> statement-breakpoint
CREATE TYPE "public"."estado_cx" AS ENUM('AL_CORRIENTE', 'VENCIDA', 'PROXIMA', 'PAGADA');--> statement-breakpoint
CREATE TYPE "public"."estado_reparto" AS ENUM('PENDIENTE', 'REALIZADO');--> statement-breakpoint
CREATE TYPE "public"."estado_venta" AS ENUM('EN_PROCESO', 'APROBADO_JURIDICO', 'FINALIZADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."fuente_datos" AS ENUM('EXCEL', 'MONDAY', 'MANUAL');--> statement-breakpoint
CREATE TABLE "accionistas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text,
	"nombre" text NOT NULL,
	"copropietario" text,
	"email" text,
	"telefono" text,
	"asesor" text,
	"tipo_accionista" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acuerdos_aportacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"accionista_id" uuid NOT NULL,
	"proyecto_id" uuid NOT NULL,
	"paquete" text,
	"numero_acciones" numeric(12, 2) NOT NULL,
	"precio_por_accion" numeric(15, 2) NOT NULL,
	"monto_total" numeric(15, 2) NOT NULL,
	"enganche" numeric(15, 2) DEFAULT '0' NOT NULL,
	"numero_mensualidades" integer NOT NULL,
	"mensualidad" numeric(15, 2),
	"fecha_apertura" date,
	"fecha_inicio" date,
	"estado" "estado_venta" DEFAULT 'EN_PROCESO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "afiliados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"contacto" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" text,
	"accion" text NOT NULL,
	"recurso_tipo" text NOT NULL,
	"recurso_id" text,
	"cambios" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "desarrollos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"desarrolladora" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"flag" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"configuracion" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"mensaje" text NOT NULL,
	"link" text,
	"leida" boolean DEFAULT false NOT NULL,
	"leida_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_aportacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"acuerdo_id" uuid NOT NULL,
	"numero_pago" integer NOT NULL,
	"fecha_programada" date NOT NULL,
	"fecha_pago" date,
	"monto_esperado" numeric(15, 2) NOT NULL,
	"monto_pagado" numeric(15, 2) DEFAULT '0' NOT NULL,
	"estado" "estado_cx" DEFAULT 'PROXIMA' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sincronizaciones_monday" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid,
	"tablero" text NOT NULL,
	"estado" text NOT NULL,
	"registros_creados" integer DEFAULT 0 NOT NULL,
	"registros_actualizados" integer DEFAULT 0 NOT NULL,
	"registros_errores" integer DEFAULT 0 NOT NULL,
	"errores" jsonb,
	"iniciada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizada_en" timestamp with time zone,
	"iniciada_por" text
);
--> statement-breakpoint
ALTER TABLE "accionistas" ADD CONSTRAINT "accionistas_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acuerdos_aportacion" ADD CONSTRAINT "acuerdos_aportacion_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acuerdos_aportacion" ADD CONSTRAINT "acuerdos_aportacion_accionista_id_accionistas_id_fk" FOREIGN KEY ("accionista_id") REFERENCES "public"."accionistas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acuerdos_aportacion" ADD CONSTRAINT "acuerdos_aportacion_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afiliados" ADD CONSTRAINT "afiliados_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desarrollos" ADD CONSTRAINT "desarrollos_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_aportacion" ADD CONSTRAINT "pagos_aportacion_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_aportacion" ADD CONSTRAINT "pagos_aportacion_acuerdo_id_acuerdos_aportacion_id_fk" FOREIGN KEY ("acuerdo_id") REFERENCES "public"."acuerdos_aportacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sincronizaciones_monday" ADD CONSTRAINT "sincronizaciones_monday_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sincronizaciones_monday" ADD CONSTRAINT "sincronizaciones_monday_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sincronizaciones_monday" ADD CONSTRAINT "sincronizaciones_monday_iniciada_por_users_id_fk" FOREIGN KEY ("iniciada_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accionistas_tenant_idx" ON "accionistas" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "acuerdos_tenant_idx" ON "acuerdos_aportacion" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "afiliados_tenant_nombre_unique" ON "afiliados" USING btree ("tenant_id","nombre");--> statement-breakpoint
CREATE INDEX "audit_tenant_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_fecha_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "desarrollos_tenant_nombre_unique" ON "desarrollos" USING btree ("tenant_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "flags_tenant_flag_unique" ON "feature_flags" USING btree ("tenant_id","flag");--> statement-breakpoint
CREATE INDEX "notif_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notif_leida_idx" ON "notifications" USING btree ("leida");--> statement-breakpoint
CREATE INDEX "pagos_aportacion_tenant_idx" ON "pagos_aportacion" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "pagos_aportacion_acuerdo_idx" ON "pagos_aportacion" USING btree ("acuerdo_id");--> statement-breakpoint
CREATE INDEX "syncs_tenant_idx" ON "sincronizaciones_monday" USING btree ("tenant_id");