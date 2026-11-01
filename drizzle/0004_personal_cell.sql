ALTER TABLE "cell" ADD COLUMN "personal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- 셀 없이 개인으로 참여하는 사람들의 자리(ADR-031). 온보딩 셀 목록 맨 아래에 보인다
INSERT INTO "cell" ("name", "sort_order", "active", "personal") VALUES ('다른 공동체', 100000, true, true) ON CONFLICT ("name") DO NOTHING;
