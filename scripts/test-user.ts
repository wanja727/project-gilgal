/**
 * 로컬 검증용 테스트 계정 (architecture 9.3).
 *
 *   pnpm test-user create [--pending]   # 테스트 사용자 + 세션 생성, 브라우저 쿠키 값을 출력
 *   pnpm test-user list                  # 테스트 계정·기록 행 수
 *   pnpm test-user delete                # 테스트 계정과 그 기록 모두 삭제
 *
 * - 카카오 로그인 없이 화면을 확인하기 위한 것이다. account.provider = 'test' 로 실제 계정과 구분하고
 *   profile.is_test = true 라 통계·참여자 수에서 빠진다.
 * - --pending: 온보딩 전 상태(실명·셀 없음)로 만든다.
 * - 운영 DB 를 함께 쓰므로 delete 는 provider='test' 인 사용자만 지운다(cascade 로 profile·progress·session).
 */
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accounts, cells, profiles, readingProgress, sessions, users } from "../lib/db/schema";

const [command, ...flags] = process.argv.slice(2);

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("DIRECT_URL 이 설정되지 않았습니다");
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);
  try {
    const testUserIds = async () =>
      (await db.select({ id: accounts.userId }).from(accounts).where(eq(accounts.provider, "test"))).map((r) => r.id);

    if (command === "create") {
      const pending = flags.includes("--pending");
      const userId = randomUUID();
      const fakeId = `test-${randomBytes(4).toString("hex")}`;
      const [cell] = await db.select({ id: cells.id }).from(cells).where(eq(cells.active, true)).limit(1);
      const token = randomBytes(32).toString("hex");
      await db.transaction(async (tx) => {
        await tx.insert(users).values({ id: userId, name: "테스트" });
        await tx.insert(accounts).values({ userId, type: "oauth", provider: "test", providerAccountId: fakeId });
        await tx.insert(profiles).values({
          userId,
          kakaoId: fakeId,
          realName: pending ? null : "테스트",
          cellId: pending ? null : (cell?.id ?? null),
          onboardingStatus: pending ? "pending" : "manual",
          isTest: true,
          avatarSeed: randomBytes(9).toString("base64url"),
        });
        await tx.insert(sessions).values({
          sessionToken: token,
          userId,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      });
      console.log(`테스트 사용자 생성 (${pending ? "온보딩 전" : "온보딩 완료"})`);
      console.log(`쿠키: authjs.session-token=${token}`);
      return;
    }

    if (command === "list") {
      const ids = await testUserIds();
      const progress = ids.length
        ? await db.select({ id: readingProgress.id }).from(readingProgress).where(inArray(readingProgress.userId, ids))
        : [];
      console.log(`테스트 사용자 ${ids.length}명, 읽기 기록 ${progress.length}행`);
      return;
    }

    if (command === "delete") {
      const ids = await testUserIds();
      if (ids.length === 0) return console.log("삭제할 테스트 사용자가 없습니다");
      // 테스트 계정이 실명 매칭으로 명단 행을 점유했다면 claim 만 풀린다(ON DELETE SET NULL)
      const deleted = await db
        .delete(users)
        .where(and(inArray(users.id, ids)))
        .returning({ id: users.id });
      console.log(`테스트 사용자 ${deleted.length}명 삭제 (profile·기록·세션 cascade)`);
      return;
    }

    throw new Error("사용법: pnpm test-user create [--pending] | list | delete");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
