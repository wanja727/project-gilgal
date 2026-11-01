import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * 런타임 DB 연결. DATABASE_URL(Supavisor 트랜잭션 풀러 :6543)만 사용한다.
 * - prepare:false — 트랜잭션 풀러는 prepared statement 를 지원하지 않는다.
 * - 개발 서버의 HMR 로 모듈이 다시 평가될 때 연결이 쌓이지 않도록 전역에 보관한다.
 */
const globalForDb = globalThis as unknown as { gilgalSql?: postgres.Sql };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 이 설정되지 않았습니다");
  // 서버리스(Vercel)에서는 함수가 쉬는 사이 풀러가 연결을 끊거나, 응답이 끝난 뒤 남은 쿼리가 멈춘 채 연결을 붙잡을 수 있다.
  // 오래 놀거나 오래 산 연결은 스스로 닫고, 연결이 안 되면 기다리지 않고 실패한다(2026-11-01 운영에서 홈이 멈춘 일)
  return postgres(url, { prepare: false, max: 5, idle_timeout: 20, max_lifetime: 60 * 10, connect_timeout: 10 });
}

const client = globalForDb.gilgalSql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.gilgalSql = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
