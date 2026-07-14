ALTER TYPE "public"."estado_venta" ADD VALUE 'APROBADO_VENTAS';--> statement-breakpoint
ALTER TYPE "public"."estado_venta" ADD VALUE 'RECHAZADO';--> statement-breakpoint
ALTER TYPE "public"."estado_venta" ADD VALUE 'ESPERANDO_AUTORIZACION';--> statement-breakpoint
ALTER TYPE "public"."estado_venta" ADD VALUE 'LIBERADO';--> statement-breakpoint
ALTER TYPE "public"."estado_venta" ADD VALUE 'FINALIZADO_Y_LIQUIDADO';--> statement-breakpoint
CREATE TABLE "excel_upload_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"empresa_nombre" text NOT NULL,
	"filas_importadas" numeric(10, 0) DEFAULT '0' NOT NULL,
	"filas_error" numeric(10, 0) DEFAULT '0' NOT NULL,
	"filas_omitidas" numeric(10, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "excel_uploads" ALTER COLUMN "empresa_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ALTER COLUMN "monto" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "fuente_datos" "fuente_datos" DEFAULT 'EXCEL' NOT NULL;--> statement-breakpoint
ALTER TABLE "excel_uploads" ADD COLUMN "omitted_rows" numeric(10, 0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "monday_item_id" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "afiliado_id" uuid;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "desarrollo_id" uuid;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "asesor" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "financiamiento" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "enganche" numeric(18, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "estado_venta" "estado_venta" DEFAULT 'EN_PROCESO' NOT NULL;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "fecha_apertura" date;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "fecha_cierre" date;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "lote_acciones" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "paquete_accion" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "pipeline_group" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "operativo_apertura" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "operativo_cierre" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "comision_bmcorp" numeric(18, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "monday_board_id" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "correo" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "nacionalidad" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "residencia" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "sexo" text;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD COLUMN "fecha_nacimiento" date;--> statement-breakpoint
ALTER TABLE "excel_upload_summaries" ADD CONSTRAINT "excel_upload_summaries_upload_id_excel_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."excel_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_upload_summaries" ADD CONSTRAINT "excel_upload_summaries_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD CONSTRAINT "ventas_bmcorp_afiliado_id_afiliados_id_fk" FOREIGN KEY ("afiliado_id") REFERENCES "public"."afiliados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas_bmcorp" ADD CONSTRAINT "ventas_bmcorp_desarrollo_id_desarrollos_id_fk" FOREIGN KEY ("desarrollo_id") REFERENCES "public"."desarrollos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ventas_bmcorp_tenant_idx" ON "ventas_bmcorp" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ventas_bmcorp_monday_item_unique" ON "ventas_bmcorp" USING btree ("tenant_id","monday_item_id");