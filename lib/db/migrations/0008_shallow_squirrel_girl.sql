CREATE TYPE "public"."metodo_pago_lider" AS ENUM('EFECTIVO', 'DEPOSITO', 'TRANSFERENCIA', 'OTRO');--> statement-breakpoint
ALTER TABLE "asesores" ALTER COLUMN "lider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lideres_alianza" ADD COLUMN "email_alterno" text;--> statement-breakpoint
ALTER TABLE "lideres_alianza" ADD COLUMN "metodo_pago" "metodo_pago_lider" DEFAULT 'EFECTIVO' NOT NULL;--> statement-breakpoint
ALTER TABLE "lideres_alianza" ADD COLUMN "coordina_pago" text;--> statement-breakpoint
ALTER TABLE "matriz_alianza_producto" ADD COLUMN "notas" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "descuento_desarrolladora_pct" numeric(5, 2) DEFAULT '5' NOT NULL;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "notas_internas" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "editado_en_sistema" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "editado_por" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "editado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD CONSTRAINT "ventas_bmcorp_editado_por_users_id_fk" FOREIGN KEY ("editado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispersiones_tipo_estado_idx" ON "dispersiones" USING btree ("tenant_id","tipo_beneficiario","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "esquemas_tenant_tipo_activo_unique" ON "esquemas_comision" USING btree ("tenant_id","tipo_producto") WHERE "esquemas_comision"."activo" = true AND "esquemas_comision"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "ventas_bmcorp_tenant_empresa_fecha_idx" ON "ventas_bmcorp" USING btree ("tenant_id","empresa_id","fecha");--> statement-breakpoint
CREATE INDEX "ventas_bmcorp_tenant_empresa_apertura_idx" ON "ventas_bmcorp" USING btree ("tenant_id","empresa_id","fecha_apertura");--> statement-breakpoint
CREATE INDEX "ventas_bmcorp_tenant_empresa_cierre_idx" ON "ventas_bmcorp" USING btree ("tenant_id","empresa_id","fecha_cierre");--> statement-breakpoint
CREATE INDEX "ventas_bmcorp_tenant_empresa_estado_idx" ON "ventas_bmcorp" USING btree ("tenant_id","empresa_id","estado_venta");--> statement-breakpoint
CREATE INDEX "ventas_bmcorp_afiliado_idx" ON "ventas_bmcorp" USING btree ("afiliado_id");--> statement-breakpoint
CREATE INDEX "ventas_bmcorp_desarrollo_idx" ON "ventas_bmcorp" USING btree ("desarrollo_id");