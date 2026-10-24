/**
 * 로컬 검증용 테스트 계정 (architecture 9.3).
 *
 *   pnpm test-user create [--pending] [--name 정다윤] [--done 1-3,5]
 *                                        # 테스트 사용자 + 세션 생성, 브라우저 쿠키 값을 출력
 *   pnpm test-user crowd <명수> --upto <장> [--lag]
 *                                        # 같은 셀의 테스트 동행자 여러 명 + 1~upto장 읽기 기록(순위·셀 카드 확인용)
 *   pnpm test-user list                  # 테스트 계정·기록 행 수
 *   pnpm test-user delete                # 테스트 계정과 그 기록 모두 삭제
 *
 * - 카카오 로그인 없이 화면을 확인하기 위한 것이다. account.provider = 'test' 로 실제 계정과 구분하고
 *   profile.is_test = true 라 통계·참여자 수에서 빠진다.
 * - --pending: 온보딩 전 상태(실명·셀 없음)로 만든다.
 * - --done: 완료한 장 목록. 완료 시각은 그 장 공개일 밤 9시(KST)로 넣는다.
 * - crowd: 완료 시각은 그 장 공개일 새벽 5시 40분부터 사람마다 7분 간격(순위가 시각 순인지 확인).
 *   --lag 면 뒤쪽 1/3 은 깃발 장을 아직 읽지 않은 상태로 둔다.
 * - 읽기 기록은 GILGAL_CAMPAIGN(로컬은 joshua-2026-test) 캠페인으로만 넣는다.
 * - 운영 DB 를 함께 쓰므로 delete 는 provider='test' 인 사용자만 지운다(cascade 로 profile·progress·session).
 */
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accounts, cells, profiles, readingProgress, sessions, users } from "../lib/db/schema";
import { campaignSlug } from "../lib/journey/campaign";
import { JOURNEY_DAYS } from "../lib/journey/days";

const CROWD_NAMES = [
  "김하은", "박준서", "이수아", "최민재", "한소율", "오지훈", "윤서연", "장예준", "서지민", "문태호",
  "배하린", "권도윤", "신유나", "황시우", "임채원", "조은호", "강다인", "송민준", "유지안", "전하윤",
];

function flag(name: string): string | undefined {
  const i = flags.indexOf(name);
  return i >= 0 ? flags[i + 1] : undefined;
}

/** "1-3,5" → [1,2,3,5] */
function parseDays(spec: string | undefined): number[] {
  if (!spec) return [];
  return spec.split(",").flatMap((part) => {
    const [a, b] = part.split("-").map(Number);
    return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
  });
}

/** 장 공개일 KST 시각 */
function atKst(dayNo: number, hhmm: string, plusMinutes = 0): Date {
  const base = new Date(`${JOURNEY_DAYS[dayNo - 1].readingDate}T${hhmm}:00+09:00`);
  return new Date(base.getTime() + plusMinutes * 60_000);
}

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
      const name = flag("--name") ?? "테스트";
      const done = parseDays(flag("--done"));
      const userId = randomUUID();
      const fakeId = `test-${randomBytes(4).toString("hex")}`;
      const [cell] = await db.select({ id: cells.id }).from(cells).where(eq(cells.active, true)).limit(1);
      const token = randomBytes(32).toString("hex");
      await db.transaction(async (tx) => {
        await tx.insert(users).values({ id: userId, name });
        await tx.insert(accounts).values({ userId, type: "oauth", provider: "test", providerAccountId: fakeId });
        await tx.insert(profiles).values({
          userId,
          kakaoId: fakeId,
          realName: pending ? null : name,
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
        if (done.length) {
          await tx.insert(readingProgress).values(
            done.map((dayNo) => ({ userId, campaign: campaignSlug(), dayNo, completedAt: atKst(dayNo, "21:00") })),
          );
        }
      });
      console.log(`테스트 사용자 생성 (${pending ? "온보딩 전" : "온보딩 완료"}${done.length ? `, ${done.length}장 완료` : ""})`);
      console.log(`쿠키: authjs.session-token=${token}`);
      return;
    }

    if (command === "crowd") {
      const n = Math.min(Number(flags[0]) || 10, CROWD_NAMES.length);
      const upto = Number(flag("--upto") ?? 0);
      const lag = flags.includes("--lag");
      const [cell] = await db.select({ id: cells.id }).from(cells).where(eq(cells.active, true)).limit(1);
      for (let i = 0; i < n; i++) {
        const userId = randomUUID();
        const fakeId = `test-${randomBytes(4).toString("hex")}`;
        // 처음 몇 명은 다른 셀로 — 순위 카드에 여러 셀이 섞여 보이게
        const [otherCell] = await db.select({ id: cells.id }).from(cells).where(eq(cells.active, true)).offset(i % 3 === 2 ? 1 : 0).limit(1);
        const last = lag && i >= Math.ceil((n * 2) / 3) ? Math.max(0, upto - 1 - (i % 3)) : upto;
        await db.transaction(async (tx) => {
          await tx.insert(users).values({ id: userId, name: CROWD_NAMES[i] });
          await tx.insert(accounts).values({ userId, type: "oauth", provider: "test", providerAccountId: fakeId });
          await tx.insert(profiles).values({
            userId,
            kakaoId: fakeId,
            realName: CROWD_NAMES[i],
            cellId: (otherCell ?? cell).id,
            onboardingStatus: "manual",
            isTest: true,
            avatarSeed: randomBytes(9).toString("base64url"),
          });
          if (last > 0) {
            await tx.insert(readingProgress).values(
              Array.from({ length: last }, (_, k) => ({
                userId,
                campaign: campaignSlug(),
                dayNo: k + 1,
                completedAt: atKst(k + 1, "05:40", i * 7),
              })),
            );
          }
        });
      }
      console.log(`테스트 동행자 ${n}명 생성 (1~${upto}장${lag ? ", 일부는 뒤처짐" : ""}, 캠페인 ${campaignSlug()})`);
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

    throw new Error("사용법: pnpm test-user create [--pending] [--name 이름] [--done 1-3,5] | crowd <명수> --upto <장> [--lag] | list | delete");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
