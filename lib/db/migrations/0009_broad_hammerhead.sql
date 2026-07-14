CREATE TYPE "public"."estado_corte" AS ENUM('BORRADOR', 'EN_REVISION', 'APROBADO', 'RECHAZADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_dia_corte" AS ENUM('LUNES', 'JUEVES');--> statement-breakpoint
ALTER TYPE "public"."estado_dispersion" ADD VALUE 'EN_REVISION' BEFORE 'PARCIAL';--> statement-breakpoint
ALTER TYPE "public"."estado_dispersion" ADD VALUE 'AUTORIZADA' BEFORE 'PARCIAL';--> statement-breakpoint
CREATE TABLE "cortes_dispersion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fecha_corte" date NOT NULL,
	"tipo_dia" "tipo_dia_corte" NOT NULL,
	"estado" "estado_corte" DEFAULT 'BORRADOR' NOT NULL,
	"total_a_dispersar" numeric(18, 2) DEFAULT '0',
	"notas_joana" text,
	"creado_por" text NOT NULL,
	"aprobado_por" text,
	"fecha_aprobacion" timestamp with time zone,
	"notas_aprobador" text,
	"metodo_pago_default" "metodo_pago_lider" DEFAULT 'EFECTIVO',
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ventas_pago_corte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"corte_id" uuid NOT NULL,
	"venta_id" uuid NOT NULL,
	"monto_pagado_cliente" numeric(18, 2) NOT NULL,
	"porcentaje_pagado" numeric(8, 4) NOT NULL,
	"monto_a_dispersar" numeric(18, 2) NOT NULL,
	"notas_joana" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispersiones" ADD COLUMN "corte_id" uuid;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD COLUMN "pago_corte_id" uuid;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD COLUMN "metodo_pago" "metodo_pago_lider";--> statement-breakpoint
ALTER TABLE "cortes_dispersion" ADD CONSTRAINT "cortes_dispersion_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cortes_dispersion" ADD CONSTRAINT "cortes_dispersion_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cortes_dispersion" ADD CONSTRAINT "cortes_dispersion_creado_por_users_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cortes_dispersion" ADD CONSTRAINT "cortes_dispersion_aprobado_por_users_id_fk" FOREIGN KEY ("aprobado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas_pago_corte" ADD CONSTRAINT "ventas_pago_corte_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas_pago_corte" ADD CONSTRAINT "ventas_pago_corte_corte_id_cortes_dispersion_id_fk" FOREIGN KEY ("corte_id") REFERENCES "public"."cortes_dispersion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas_pago_corte" ADD CONSTRAINT "ventas_pago_corte_venta_id_ventas_bmcorp_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas_bmcorp"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cortes_tenant_idx" ON "cortes_dispersion" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cortes_empresa_idx" ON "cortes_dispersion" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "cortes_estado_idx" ON "cortes_dispersion" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "cortes_fecha_idx" ON "cortes_dispersion" USING btree ("tenant_id","fecha_corte");--> statement-breakpoint
CREATE INDEX "ventas_pago_corte_tenant_idx" ON "ventas_pago_corte" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ventas_pago_corte_corte_idx" ON "ventas_pago_corte" USING btree ("corte_id");--> statement-breakpoint
CREATE INDEX "ventas_pago_corte_venta_idx" ON "ventas_pago_corte" USING btree ("venta_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ventas_pago_corte_unique" ON "ventas_pago_corte" USING btree ("corte_id","venta_id");--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_corte_id_cortes_dispersion_id_fk" FOREIGN KEY ("corte_id") REFERENCES "public"."cortes_dispersion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispersiones" ADD CONSTRAINT "dispersiones_pago_corte_id_ventas_pago_corte_id_fk" FOREIGN KEY ("pago_corte_id") REFERENCES "public"."ventas_pago_corte"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispersiones_corte_idx" ON "dispersiones" USING btree ("corte_id");