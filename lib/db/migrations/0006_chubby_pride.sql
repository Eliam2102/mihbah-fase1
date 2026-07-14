CREATE TABLE "user_modulo_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"empresa_id" uuid NOT NULL,
	"modulo" text NOT NULL,
	"puede_ver" boolean DEFAULT true NOT NULL,
	"puede_editar" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "proyecto_nombre" text;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "categoria_nombre" text;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "grupo_nombre" text;--> statement-breakpoint
ALTER TABLE "user_modulo_access" ADD CONSTRAINT "user_modulo_access_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_modulo_access" ADD CONSTRAINT "user_modulo_access_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_modulo_empresa_unique" ON "user_modulo_access" USING btree ("user_id","empresa_id","modulo");--> statement-breakpoint
CREATE INDEX "user_modulo_tenant_idx" ON "user_modulo_access" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "mov_tenant_empresa_idx" ON "movimientos" USING btree ("tenant_id","empresa_id");--> statement-breakpoint
CREATE INDEX "mov_tenant_fecha_idx" ON "movimientos" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX "mov_tenant_empresa_fecha_idx" ON "movimientos" USING btree ("tenant_id","empresa_id","fecha");--> statement-breakpoint
CREATE INDEX "mov_upload_idx" ON "movimientos" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "mov_tipo_idx" ON "movimientos" USING btree ("tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "user_empresa_access_user_empresa_unique" ON "user_empresa_access" USING btree ("user_id","empresa_id");