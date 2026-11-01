import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { randomAvatarSeed } from "@/lib/avatarSeed";
import { db } from "@/lib/db";
import { cells, profiles, rosterEntries } from "@/lib/db/schema";
import { validateRealName } from "@/lib/roster/normalize";

/**
 * 계정 연결·온보딩 (architecture 5.3, 5.4).
 *
 * 보안 원칙
 * - 회원번호·userId·rosterId 는 클라이언트 입력으로 받지 않는다. userId 는 세션, 회원번호는 account 행에서만.
 * - 명단 행 claim 은 "claimed_by IS NULL" 조건부 UPDATE 의 영향 행 수로 판정한다(동시 요청 대비).
 * - 실명 매칭은 회원번호가 비어 있는 미점유 행이 정확히 1건일 때만, 사용자당 시도 횟수를 제한한다.
 */

export const MAX_NAME_MATCH_ATTEMPTS = 5;

/** 로그인 직후: 프로필이 없으면 만들고, 회원번호로 명단을 자동 연결한다 */
export async function linkProfileOnSignIn(userId: string, kakaoId: string) {
  await db
    .insert(profiles)
    .values({ userId, kakaoId, avatarSeed: randomAvatarSeed() })
    .onConflictDoNothing({ target: profiles.userId });
  await claimByKakaoId(userId);
}

/**
 * 1단계: 회원번호가 같은 명단 행을 연결한다. 이미 온보딩을 마친 프로필은 건드리지 않는다.
 * 회원번호는 profile.kakao_id(로그인 시 account 에서 복사한 값)를 쓴다.
 * @returns 연결되었으면 true
 */
export async function claimByKakaoId(userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ status: profiles.onboardingStatus, kakaoId: profiles.kakaoId })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .for("update");
    if (!profile || profile.status !== "pending") return false;
    const { kakaoId } = profile;

    const claimed = await tx
      .update(rosterEntries)
      .set({ claimedBy: userId, claimedAt: new Date(), claimMethod: "kakao_id" })
      .where(and(eq(rosterEntries.kakaoId, kakaoId), isNull(rosterEntries.claimedBy)))
      .returning({ realName: rosterEntries.realName, cellId: rosterEntries.cellId });
    // 이전 시도에서 이미 내가 claim 한 행이면 그대로 사용
    const entry =
      claimed[0] ??
      (
        await tx
          .select({ realName: rosterEntries.realName, cellId: rosterEntries.cellId })
          .from(rosterEntries)
          .where(and(eq(rosterEntries.kakaoId, kakaoId), eq(rosterEntries.claimedBy, userId)))
      )[0];
    if (!entry) return false;

    await tx
      .update(profiles)
      .set({
        realName: entry.realName,
        cellId: entry.cellId,
        onboardingStatus: "matched",
        updatedAt: new Date(),
      })
      .where(and(eq(profiles.userId, userId), eq(profiles.onboardingStatus, "pending")));
    return true;
  });
}

export type NameMatchResult =
  | { status: "matched" }
  | { status: "invalid_name" }
  | { status: "already_done" }
  | { status: "need_cell"; reason: "not_found" | "ambiguous" | "too_many_attempts"; name: string };

/** 2단계: 실명으로 명단을 찾는다. 실패하면 셀 직접 선택(3단계)으로 넘긴다. */
export async function claimByRealName(userId: string, input: string): Promise<NameMatchResult> {
  const valid = validateRealName(input);
  if (!valid.ok) return { status: "invalid_name" };
  const name = valid.name;

  return db.transaction(async (tx): Promise<NameMatchResult> => {
    const [profile] = await tx
      // kakao_id 는 로그인 시 서버가 account 에서 복사한 값이다(클라이언트 입력 아님)
      .select({
        status: profiles.onboardingStatus,
        attempts: profiles.nameMatchAttempts,
        kakaoId: profiles.kakaoId,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .for("update");
    if (!profile) throw new Error("프로필 없음");
    if (profile.status !== "pending") return { status: "already_done" };
    if (profile.attempts >= MAX_NAME_MATCH_ATTEMPTS) {
      return { status: "need_cell", reason: "too_many_attempts", name };
    }
    await tx
      .update(profiles)
      .set({ nameMatchAttempts: sql`${profiles.nameMatchAttempts} + 1` })
      .where(eq(profiles.userId, userId));

    const candidates = await tx
      .select({ id: rosterEntries.id, cellId: rosterEntries.cellId, realName: rosterEntries.realName })
      .from(rosterEntries)
      .where(
        and(
          eq(rosterEntries.realName, name),
          isNull(rosterEntries.kakaoId),
          isNull(rosterEntries.claimedBy),
        ),
      )
      .limit(2);
    if (candidates.length !== 1) {
      return { status: "need_cell", reason: candidates.length === 0 ? "not_found" : "ambiguous", name };
    }

    const [target] = candidates;
    const claimed = await tx
      .update(rosterEntries)
      .set({ kakaoId: profile.kakaoId, claimedBy: userId, claimedAt: new Date(), claimMethod: "real_name" })
      .where(
        and(
          eq(rosterEntries.id, target.id),
          isNull(rosterEntries.kakaoId),
          isNull(rosterEntries.claimedBy),
        ),
      )
      .returning({ id: rosterEntries.id });
    // 동시에 다른 사람이 먼저 claim 했다면 매칭 실패로 처리
    if (claimed.length !== 1) return { status: "need_cell", reason: "not_found", name };

    await tx
      .update(profiles)
      .set({
        realName: target.realName,
        cellId: target.cellId,
        onboardingStatus: "matched",
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
    return { status: "matched" };
  });
}

export type SelectCellResult =
  | { status: "ok" }
  | { status: "invalid_name" | "invalid_cell" | "already_done" };

/** 3단계: 기존 셀 목록에서 직접 선택. 명단에는 쓰지 않는다(검증되지 않은 자기 신고). */
export async function selectCellManually(
  userId: string,
  nameInput: string,
  cellIdInput: unknown,
): Promise<SelectCellResult> {
  const valid = validateRealName(nameInput);
  if (!valid.ok) return { status: "invalid_name" };
  const cellId =
    typeof cellIdInput === "string" && /^\d{1,9}$/.test(cellIdInput) ? Number(cellIdInput) : null;
  if (cellId === null) return { status: "invalid_cell" };

  const [cell] = await db
    .select({ id: cells.id })
    .from(cells)
    .where(and(eq(cells.id, cellId), eq(cells.active, true)));
  if (!cell) return { status: "invalid_cell" };

  const updated = await db
    .update(profiles)
    .set({ realName: valid.name, cellId: cell.id, onboardingStatus: "manual", updatedAt: new Date() })
    .where(and(eq(profiles.userId, userId), eq(profiles.onboardingStatus, "pending")))
    .returning({ userId: profiles.userId });
  return updated.length === 1 ? { status: "ok" } : { status: "already_done" };
}

/** 온보딩 셀 선택지 */
export async function listActiveCells() {
  return db
    .select({ id: cells.id, name: cells.name, personal: cells.personal })
    .from(cells)
    .where(eq(cells.active, true))
    .orderBy(cells.sortOrder, cells.name);
}
