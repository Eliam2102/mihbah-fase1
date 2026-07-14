CREATE TYPE "public"."estado_incidencia" AS ENUM('ABIERTA', 'EN_PROCESO', 'RESUELTA', 'CERRADA');--> statement-breakpoint
CREATE TYPE "public"."formula_bono_umbral" AS ENUM('EXCEDENTE', 'TOTAL_GRUPOS_APLICA', 'EXCEDENTE_CAP_GRUPOS');--> statement-breakpoint
CREATE TYPE "public"."grupo_desarrolladora" AS ENUM('YCD', 'ARKA', 'RH', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_fuente_bono" AS ENUM('PROPIA', 'OVERRIDE_AFILIADO');--> statement-breakpoint
ALTER TYPE "public"."rol_portal" ADD VALUE 'ADMINISTRATIVO' BEFORE 'ASESOR';--> statement-breakpoint
CREATE TABLE "bonos_umbral_calculados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"config_id" uuid NOT NULL,
	"anio" integer NOT NULL,
	"mes" integer NOT NULL,
	"ventas_ycd" numeric(18, 2) DEFAULT '0' NOT NULL,
	"ventas_arka" numeric(18, 2) DEFAULT '0' NOT NULL,
	"ventas_rh" numeric(18, 2) DEFAULT '0' NOT NULL,
	"ventas_otro" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_acumulado" numeric(18, 2) NOT NULL,
	"excedente" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_override" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_bono" numeric(18, 2) DEFAULT '0' NOT NULL,
	"monto_total" numeric(18, 2) NOT NULL,
	"corte_id" uuid,
	"pagado" boolean DEFAULT false NOT NULL,
	"fecha_pago" date,
	"notas" text,
	"calculado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"calculado_por" text,
	"comprobante_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonos_umbral_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"afiliado_destinatario_id" uuid NOT NULL,
	"tipo_fuente" "tipo_fuente_bono" NOT NULL,
	"afiliado_origen_id" uuid,
	"override_pct" numeric(5, 2),
	"umbral_acumulado_mensual" numeric(18, 2) NOT NULL,
	"bono_pct" numeric(5, 2) NOT NULL,
	"grupos_acumulan" jsonb NOT NULL,
	"grupos_aplica_bono" jsonb NOT NULL,
	"formula_calculo" "formula_bono_umbral" DEFAULT 'EXCEDENTE' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"creado_por" text,
	"creado_por_nombre" text NOT NULL,
	"asignada_a" text,
	"empresa_id" uuid,
	"venta_id" uuid,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"estado" "estado_incidencia" DEFAULT 'ABIERTA' NOT NULL,
	"resolucion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matriz_nivel_override" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"matriz_id" uuid NOT NULL,
	"nivel" "nivel_alianza" NOT NULL,
	"porcentaje_afiliacion" numeric(5, 2) NOT NULL,
	"porcentaje_jorge_bolsa" numeric(5, 2) DEFAULT '0' NOT NULL,
	"porcentaje_kass_bolsa" numeric(5, 2) DEFAULT '0' NOT NULL,
	"porcentaje_diana_bolsa" numeric(5, 2) DEFAULT '0' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niveles_membresia_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nivel" "nivel_alianza" NOT NULL,
	"tipo_producto" "tipo_producto_comision" NOT NULL,
	"umbral_min" numeric(18, 2) NOT NULL,
	"umbral_max" numeric(18, 2),
	"porcentaje_bono" numeric(5, 2) DEFAULT '0' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "dispersiones_comision_tipo_unique";--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ALTER COLUMN "dispersion_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ALTER COLUMN "descuento_desarrolladora_pct" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD COLUMN "corte_id" uuid;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD COLUMN "lider_id" uuid;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD COLUMN "asesor_id" uuid;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD COLUMN "beneficiario_tipo" "tipo_beneficiario_dispersion";--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD COLUMN "beneficiario_nombre" text;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD COLUMN "metodo_pago" "metodo_pago_lider";--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD COLUMN "monto_pagado" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD COLUMN "fecha_pago" date;--> statement-breakpoint
ALTER TABLE "desarrollos" ADD COLUMN "grupo_desarrolladora" "grupo_desarrolladora" DEFAULT 'OTRO' NOT NULL;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD COLUMN "comprobante_id" uuid;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD COLUMN "pagado_por" text;--> statement-breakpoint
ALTER TABLE "esquemas_comision" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "esquemas_comision" ADD COLUMN "creado_por" text;--> statement-breakpoint
ALTER TABLE "esquemas_comision" ADD COLUMN "autorizado_por" text;--> statement-breakpoint
ALTER TABLE "matriz_alianza_producto" ADD COLUMN "porcentaje_socio_fijo_jorge_override" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "matriz_alianza_producto" ADD COLUMN "porcentaje_socio_fijo_kass_override" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "tipo_producto_override" "tipo_producto_comision";--> statement-breakpoint
ALTER TABLE "ventas_pago_corte" ADD COLUMN "metodo_pago_cliente" "metodo_pago_lider";--> statement-breakpoint
ALTER TABLE "ventas_pago_corte" ADD COLUMN "fecha_pago_cliente" date;--> statement-breakpoint
ALTER TABLE "bonos_umbral_calculados" ADD CONSTRAINT "bonos_umbral_calculados_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_umbral_calculados" ADD CONSTRAINT "bonos_umbral_calculados_config_id_bonos_umbral_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."bonos_umbral_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_umbral_calculados" ADD CONSTRAINT "bonos_umbral_calculados_corte_id_cortes_dispersion_id_fk" FOREIGN KEY ("corte_id") REFERENCES "public"."cortes_dispersion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_umbral_calculados" ADD CONSTRAINT "bonos_umbral_calculados_calculado_por_users_id_fk" FOREIGN KEY ("calculado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_umbral_calculados" ADD CONSTRAINT "bonos_umbral_calculados_comprobante_id_comprobantes_pago_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."comprobantes_pago"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_umbral_config" ADD CONSTRAINT "bonos_umbral_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_umbral_config" ADD CONSTRAINT "bonos_umbral_config_afiliado_destinatario_id_afiliados_id_fk" FOREIGN KEY ("afiliado_destinatario_id") REFERENCES "public"."afiliados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonos_umbral_config" ADD CONSTRAINT "bonos_umbral_config_afiliado_origen_id_afiliados_id_fk" FOREIGN KEY ("afiliado_origen_id") REFERENCES "public"."afiliados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_creado_por_users_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_asignada_a_users_id_fk" FOREIGN KEY ("asignada_a") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_venta_id_ventas_bmcorp_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas_bmcorp"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriz_nivel_override" ADD CONSTRAINT "matriz_nivel_override_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriz_nivel_override" ADD CONSTRAINT "matriz_nivel_override_matriz_id_matriz_alianza_producto_id_fk" FOREIGN KEY ("matriz_id") REFERENCES "public"."matriz_alianza_producto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "niveles_membresia_config" ADD CONSTRAINT "niveles_membresia_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bonos_umbral_calc_tenant_idx" ON "bonos_umbral_calculados" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bonos_umbral_calc_config_periodo_unique" ON "bonos_umbral_calculados" USING btree ("tenant_id","config_id","anio","mes");--> statement-breakpoint
CREATE INDEX "bonos_umbral_calc_corte_idx" ON "bonos_umbral_calculados" USING btree ("corte_id");--> statement-breakpoint
CREATE INDEX "bonos_umbral_config_tenant_idx" ON "bonos_umbral_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bonos_umbral_config_destinatario_idx" ON "bonos_umbral_config" USING btree ("tenant_id","afiliado_destinatario_id");--> statement-breakpoint
CREATE INDEX "bonos_umbral_config_activo_idx" ON "bonos_umbral_config" USING btree ("tenant_id","activo");--> statement-breakpoint
CREATE INDEX "incidencias_tenant_idx" ON "incidencias" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "incidencias_estado_idx" ON "incidencias" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "incidencias_creado_por_idx" ON "incidencias" USING btree ("creado_por");--> statement-breakpoint
CREATE INDEX "matriz_override_tenant_idx" ON "matriz_nivel_override" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matriz_override_matriz_nivel_unique" ON "matriz_nivel_override" USING btree ("tenant_id","matriz_id","nivel");--> statement-breakpoint
CREATE INDEX "niveles_config_tenant_idx" ON "niveles_membresia_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "niveles_config_nivel_producto_unique" ON "niveles_membresia_config" USING btree ("tenant_id","nivel","tipo_producto");--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD CONSTRAINT "comprobantes_pago_corte_id_cortes_dispersion_id_fk" FOREIGN KEY ("corte_id") REFERENCES "public"."cortes_dispersion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD CONSTRAINT "comprobantes_pago_lider_id_lideres_alianza_id_fk" FOREIGN KEY ("lider_id") REFERENCES "public"."lideres_alianza"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobantes_pago" ADD CONSTRAINT "comprobantes_pago_asesor_id_asesores_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."asesores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_comprobante_id_comprobantes_pago_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."comprobantes_pago"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_pagado_por_users_id_fk" FOREIGN KEY ("pagado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esquemas_comision" ADD CONSTRAINT "esquemas_comision_creado_por_users_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "esquemas_comision" ADD CONSTRAINT "esquemas_comision_autorizado_por_users_id_fk" FOREIGN KEY ("autorizado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comprobantes_corte_idx" ON "comprobantes_pago" USING btree ("corte_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dispersiones_comision_tipo_unique" ON "dispersiones" USING btree ("comision_id","tipo_beneficiario") WHERE pago_corte_id IS NULL;