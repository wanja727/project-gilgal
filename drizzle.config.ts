import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env.local" });

/**
 * 마이그레이션은 generate → SQL 리뷰 → migrate 순서로만 적용한다. push 는 쓰지 않는다(CLAUDE.md).
 * drizzle-kit 은 트랜잭션 풀러(:6543)에서 멈추므로 세션 연결(DIRECT_URL)을 쓴다.
 */
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DIRECT_URL! },
  // Supabase 의 auth/storage 등 다른 스키마는 건드리지 않는다
  schemaFilter: ["public"],
  migrations: { schema: "public" },
} satisfies Config;
