CREATE TABLE "reading_comment_like" (
	"comment_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_comment_like_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "reading_comment_like" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reading_comment" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reading_comment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"campaign" text NOT NULL,
	"day_no" smallint NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"hidden_at" timestamp with time zone,
	"hidden_by" text,
	CONSTRAINT "reading_comment_day_no_chk" CHECK ("reading_comment"."day_no" BETWEEN 1 AND 24),
	CONSTRAINT "reading_comment_content_chk" CHECK (char_length(btrim("reading_comment"."content")) BETWEEN 1 AND 1000)
);
--> statement-breakpoint
ALTER TABLE "reading_comment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reading_comment_like" ADD CONSTRAINT "reading_comment_like_comment_id_reading_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."reading_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_comment_like" ADD CONSTRAINT "reading_comment_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_comment" ADD CONSTRAINT "reading_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_comment" ADD CONSTRAINT "reading_comment_hidden_by_user_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reading_comment_like_user_idx" ON "reading_comment_like" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_comment_campaign_day_created_idx" ON "reading_comment" USING btree ("campaign","day_no","created_at");--> statement-breakpoint
CREATE INDEX "reading_comment_campaign_created_idx" ON "reading_comment" USING btree ("campaign","created_at");--> statement-breakpoint
CREATE INDEX "reading_comment_user_idx" ON "reading_comment" USING btree ("user_id");