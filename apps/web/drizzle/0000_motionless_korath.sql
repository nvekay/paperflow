CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"visitor_id" text NOT NULL,
	"source" text NOT NULL,
	"sample_id" text,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"file" "bytea" NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"invoice" jsonb,
	"checks" jsonb,
	"decision" jsonb,
	"duplicate_of" text,
	"usage" jsonb,
	"cost_usd" numeric(10, 6),
	"resume_url" text,
	"sheet_row" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"source" text NOT NULL,
	"step" text NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"decision" text NOT NULL,
	"corrections" jsonb,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_visitor_created_idx" ON "documents" USING btree ("visitor_id","created_at");--> statement-breakpoint
CREATE INDEX "documents_sha256_idx" ON "documents" USING btree ("visitor_id","sha256");--> statement-breakpoint
CREATE INDEX "events_document_idx" ON "events" USING btree ("document_id","id");