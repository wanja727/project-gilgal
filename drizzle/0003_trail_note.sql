CREATE TABLE "trail_note" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trail_note_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"campaign" text NOT NULL,
	"day_no" smallint NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_by" text,
	CONSTRAINT "trail_note_day_no_chk" CHECK ("trail_note"."day_no" BETWEEN 1 AND 24),
	CONSTRAINT "trail_note_content_chk" CHECK (char_length(btrim("trail_note"."content")) BETWEEN 1 AND 40)
);
--> statement-breakpoint
ALTER TABLE "trail_note" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trail_note" ADD CONSTRAINT "trail_note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trail_note" ADD CONSTRAINT "trail_note_hidden_by_user_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trail_note_campaign_day_user_uq" ON "trail_note" USING btree ("campaign","day_no","user_id");--> statement-breakpoint
CREATE INDEX "trail_note_campaign_day_created_idx" ON "trail_note" USING btree ("campaign","day_no","created_at");--> statement-breakpoint
CREATE INDEX "trail_note_user_idx" ON "trail_note" USING btree ("user_id");