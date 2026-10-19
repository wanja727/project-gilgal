CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bible_verse" (
	"translation" text NOT NULL,
	"book" text NOT NULL,
	"chapter" smallint NOT NULL,
	"verse" smallint NOT NULL,
	"section_heading" text,
	"text" text NOT NULL,
	CONSTRAINT "bible_verse_translation_book_chapter_verse_pk" PRIMARY KEY("translation","book","chapter","verse")
);
--> statement-breakpoint
ALTER TABLE "bible_verse" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cell" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cell_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "cell" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"kakao_id" text NOT NULL,
	"real_name" text,
	"cell_id" integer,
	"onboarding_status" text DEFAULT 'pending' NOT NULL,
	"name_match_attempts" smallint DEFAULT 0 NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"avatar_style" text DEFAULT 'marbles' NOT NULL,
	"avatar_seed" text NOT NULL,
	"avatar_options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_kakao_id_unique" UNIQUE("kakao_id"),
	CONSTRAINT "profile_avatar_seed_unique" UNIQUE("avatar_seed"),
	CONSTRAINT "profile_onboarding_status_chk" CHECK ("profile"."onboarding_status" IN ('pending','matched','manual'))
);
--> statement-breakpoint
ALTER TABLE "profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reading_progress_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"campaign" text NOT NULL,
	"day_no" smallint NOT NULL,
	"user_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_progress_user_campaign_day_uq" UNIQUE("user_id","campaign","day_no"),
	CONSTRAINT "reading_progress_day_no_chk" CHECK ("reading_progress"."day_no" BETWEEN 1 AND 24)
);
--> statement-breakpoint
ALTER TABLE "reading_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "roster_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"kakao_id" text,
	"real_name" text NOT NULL,
	"cell_id" integer NOT NULL,
	"source" text NOT NULL,
	"claimed_by" text,
	"claimed_at" timestamp with time zone,
	"claim_method" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roster_entry_kakao_id_unique" UNIQUE("kakao_id"),
	CONSTRAINT "roster_entry_claimed_by_unique" UNIQUE("claimed_by"),
	CONSTRAINT "roster_entry_real_name_cell_id_uq" UNIQUE("real_name","cell_id"),
	CONSTRAINT "roster_entry_source_chk" CHECK ("roster_entry"."source" IN ('selah_member','selah_roster','manual','admin')),
	CONSTRAINT "roster_entry_claim_method_chk" CHECK ("roster_entry"."claim_method" IN ('kakao_id','real_name'))
);
--> statement-breakpoint
ALTER TABLE "roster_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "verificationToken" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_cell_id_cell_id_fk" FOREIGN KEY ("cell_id") REFERENCES "public"."cell"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_entry" ADD CONSTRAINT "roster_entry_cell_id_cell_id_fk" FOREIGN KEY ("cell_id") REFERENCES "public"."cell"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roster_entry" ADD CONSTRAINT "roster_entry_claimed_by_user_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "profile_cell_id_idx" ON "profile" USING btree ("cell_id");--> statement-breakpoint
CREATE INDEX "reading_progress_campaign_day_idx" ON "reading_progress" USING btree ("campaign","day_no");--> statement-breakpoint
CREATE INDEX "reading_progress_campaign_completed_idx" ON "reading_progress" USING btree ("campaign","completed_at");--> statement-breakpoint
CREATE INDEX "roster_entry_real_name_idx" ON "roster_entry" USING btree ("real_name");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId");