import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * 런타임 DB 연결. DATABASE_URL(Supavisor 트랜잭션 풀러 :6543)만 사용한다.
 *
 * [2026-11-01] postgres.js → node-postgres(pg) + Vercel attachDatabasePool.
 * 운영(Vercel Fluid compute)에서 함수 인스턴스가 쉬었다 깨어나는 사이 붙잡고 있던 연결이 죽은 채로 남아,
 * 그 연결로 보낸 쿼리가 응답 없이 영원히 기다리며 홈이 멈췄다(로컬·로컬 프로덕션 빌드에서는 재현되지 않음).
 * - attachDatabasePool: 인스턴스가 멈추기 전에 놀고 있는 연결을 정리한다(Vercel 이 pg 를 공식 지원, postgres.js 는 미지원)
 * - query_timeout / statement_timeout: 그래도 응답이 없으면 기다리지 않고 실패한다 — 한 요청이 인스턴스 전체를 붙잡지 않게
 * - pg 는 이름 없는 문장으로 질의해 트랜잭션 풀러와 맞는다(prepared statement 를 쓰지 않음)
 * - 개발 서버의 HMR 로 모듈이 다시 평가될 때 연결이 쌓이지 않도록 전역에 보관한다
 */
const globalForDb = globalThis as unknown as { gilgalPool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 이 설정되지 않았습니다");
  const pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
  });
  // 풀에 남은 연결의 오류(서버가 끊음 등)로 프로세스가 죽지 않게 — 그 연결만 버려진다
  pool.on("error", (e) => console.error("[db] idle client error", e.message));
  attachDatabasePool(pool);
  return pool;
}

const pool = globalForDb.gilgalPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.gilgalPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
