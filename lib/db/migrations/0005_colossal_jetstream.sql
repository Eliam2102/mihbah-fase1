CREATE TYPE "public"."estado_pago_bmcorp" AS ENUM('PENDIENTE', 'PARCIAL', 'PAGADO');--> statement-breakpoint
CREATE TYPE "public"."tipo_pago_bmcorp" AS ENUM('REPARTO_ALIANZA', 'COMISION_ASESOR');--> statement-breakpoint
ALTER TABLE "repartos_bmcorp" ADD COLUMN "venta_id" uuid;--> statement-breakpoint
ALTER TABLE "repartos_bmcorp" ADD COLUMN "afiliado_id" uuid;--> statement-breakpoint
ALTER TABLE "repartos_bmcorp" ADD COLUMN "monday_item_id" text;--> statement-breakpoint
ALTER TABLE "repartos_bmcorp" ADD COLUMN "tipo" "tipo_pago_bmcorp" DEFAULT 'REPARTO_ALIANZA' NOT NULL;--> statement-breakpoint
ALTER TABLE "repartos_bmcorp" ADD COLUMN "estado" "estado_pago_bmcorp" DEFAULT 'PENDIENTE' NOT NULL;--> statement-breakpoint
ALTER TABLE "repartos_bmcorp" ADD CONSTRAINT "repartos_bmcorp_venta_id_ventas_bmcorp_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas_bmcorp"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repartos_bmcorp" ADD CONSTRAINT "repartos_bmcorp_afiliado_id_afiliados_id_fk" FOREIGN KEY ("afiliado_id") REFERENCES "public"."afiliados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repartos_bmcorp_tenant_idx" ON "repartos_bmcorp" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repartos_bmcorp_monday_unique" ON "repartos_bmcorp" USING btree ("tenant_id","monday_item_id","tipo");--> statement-breakpoint
CREATE INDEX "repartos_bmcorp_venta_idx" ON "repartos_bmcorp" USING btree ("venta_id");--> statement-breakpoint
CREATE INDEX "repartos_bmcorp_fecha_idx" ON "repartos_bmcorp" USING btree ("fecha");