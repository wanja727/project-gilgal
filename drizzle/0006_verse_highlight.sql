CREATE TABLE "verse_highlight" (
	"user_id" text NOT NULL,
	"chapter" smallint NOT NULL,
	"verse" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verse_highlight_user_id_chapter_verse_pk" PRIMARY KEY("user_id","chapter","verse"),
	CONSTRAINT "verse_highlight_chapter_chk" CHECK ("verse_highlight"."chapter" BETWEEN 1 AND 24),
	CONSTRAINT "verse_highlight_verse_chk" CHECK ("verse_highlight"."verse" BETWEEN 1 AND 200)
);
--> statement-breakpoint
ALTER TABLE "verse_highlight" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verse_highlight" ADD CONSTRAINT "verse_highlight_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;