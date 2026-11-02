CREATE TABLE "daily_visit" (
	"campaign" text NOT NULL,
	"visit_date" date NOT NULL,
	"user_id" text NOT NULL,
	"first_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_visit_campaign_visit_date_user_id_pk" PRIMARY KEY("campaign","visit_date","user_id")
);
--> statement-breakpoint
ALTER TABLE "daily_visit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "daily_visit" ADD CONSTRAINT "daily_visit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_visit_user_idx" ON "daily_visit" USING btree ("user_id");