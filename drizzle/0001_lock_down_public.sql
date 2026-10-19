-- 길갈은 Supabase Data API(PostgREST)를 쓰지 않는다. 대시보드에서 Data API를 꺼 두더라도
-- anon/authenticated 롤이 public 스키마에 접근할 수 없도록 권한을 회수한다(architecture 6.2, ADR-006).
-- 앱은 서버에서 소유 롤(postgres)로 접속하므로 영향이 없다.

-- 마이그레이션 기록 테이블도 Data API 경로에서 보이지 않게 RLS 를 켠다
ALTER TABLE "public"."__drizzle_migrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint

-- 이후 마이그레이션으로 만들어지는 객체에도 기본 권한이 부여되지 않게 한다
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
