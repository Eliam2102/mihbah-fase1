CREATE TYPE "public"."estado_excel_upload" AS ENUM('PROCESANDO', 'COMPLETADO', 'ERROR');--> statement-breakpoint
ALTER TYPE "public"."tipo_movimiento" ADD VALUE 'SALIDA';--> statement-breakpoint
ALTER TYPE "public"."tipo_movimiento" ADD VALUE 'INTERNO';--> statement-breakpoint
ALTER TYPE "public"."tipo_movimiento" ADD VALUE 'PRESTAMO';--> statement-breakpoint
CREATE TABLE "excel_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"empresa_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"file_size" numeric(18, 0),
	"total_rows" numeric(10, 0) DEFAULT '0' NOT NULL,
	"valid_rows" numeric(10, 0) DEFAULT '0' NOT NULL,
	"error_rows" numeric(10, 0) DEFAULT '0' NOT NULL,
	"duplicate_rows" numeric(10, 0) DEFAULT '0' NOT NULL,
	"imported_rows" numeric(10, 0) DEFAULT '0' NOT NULL,
	"estado" "estado_excel_upload" DEFAULT 'PROCESANDO' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "anio" numeric(4, 0);--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "mes" numeric(2, 0);--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "nombre" text;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "concepto" text;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "comentarios" text;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "upload_id" uuid;--> statement-breakpoint
ALTER TABLE "excel_uploads" ADD CONSTRAINT "excel_uploads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_uploads" ADD CONSTRAINT "excel_uploads_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;