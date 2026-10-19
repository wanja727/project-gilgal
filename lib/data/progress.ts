import "server-only";
import { and, asc, count, countDistinct, eq, gte, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, readingProgress } from "@/lib/db/schema";
import { campaignSlug } from "@/lib/journey/campaign";
import { checkDayAccess } from "@/lib/journey/schedule";
import { addDays, type IsoDate } from "@/lib/time";

/**
 * 읽기 기록. 모든 함수는 현재 캠페인 slug(GILGAL_CAMPAIGN) 안에서만 읽고 쓴다 —
 * 로컬·Preview(joshua-2026-test)의 기록이 운영 화면에 섞이지 않게(ADR-015).
 */

/** 내가 완료한 DAY 번호 (오름차순) */
export async function getCompletedDays(userId: string): Promise<number[]> {
  const rows = await db
    .select({ dayNo: readingProgress.dayNo })
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.campaign, campaignSlug())))
    .orderBy(asc(readingProgress.dayNo));
  return rows.map((r) => r.dayNo);
}

export type CompleteDayResult =
  | { status: "completed" | "already"; day: number }
  | { status: "invalid_day" | "locked" };

/**
 * 읽기 완료 저장. 공개 여부는 화면과 무관하게 여기서 다시 검증한다.
 * 중복 요청은 UNIQUE + ON CONFLICT DO NOTHING 으로 1행만 남고 "already" 를 돌려준다.
 */
export async function completeDay(userId: string, dayNo: unknown, today: IsoDate): Promise<CompleteDayResult> {
  const access = checkDayAccess(dayNo, today);
  if (!access.ok) return { status: access.reason };
  const inserted = await db
    .insert(readingProgress)
    .values({ userId, campaign: campaignSlug(), dayNo: access.day.day })
    .onConflictDoNothing()
    .returning({ id: readingProgress.id });
  return { status: inserted.length ? "completed" : "already", day: access.day.day };
}

/** KST 하루의 시작·끝 시각 */
function kstDayRange(date: IsoDate): [Date, Date] {
  return [new Date(`${date}T00:00:00+09:00`), new Date(`${addDays(date, 1)}T00:00:00+09:00`)];
}

export type CommunityToday = {
  /** 참여자 = 온보딩을 마친 사용자(테스트 계정 제외) */
  participants: number;
  /** 오늘의 DAY 를 완료한 사람 (오늘의 DAY 가 없으면 null) */
  todayDayDone: number | null;
  /** 오늘(KST) 어떤 DAY 든 완료한 사람 */
  walkedToday: number;
};

/** 홈의 "오늘 공동체" 숫자 (architecture 7절 공동체 "오늘" 지표) */
export async function getCommunityToday(today: IsoDate, todayDayNo: number | null): Promise<CommunityToday> {
  const campaign = campaignSlug();
  const realMember = and(
    eq(profiles.isTest, false),
    isNotNull(profiles.realName),
    isNotNull(profiles.cellId),
  );
  const [start, end] = kstDayRange(today);

  const [participantsRow, walkedRow, dayRow] = await Promise.all([
    db.select({ n: count() }).from(profiles).where(realMember),
    db
      .select({ n: countDistinct(readingProgress.userId) })
      .from(readingProgress)
      .innerJoin(profiles, eq(profiles.userId, readingProgress.userId))
      .where(
        and(
          eq(readingProgress.campaign, campaign),
          gte(readingProgress.completedAt, start),
          lt(readingProgress.completedAt, end),
          realMember,
        ),
      ),
    todayDayNo
      ? db
          .select({ n: count() })
          .from(readingProgress)
          .innerJoin(profiles, eq(profiles.userId, readingProgress.userId))
          .where(and(eq(readingProgress.campaign, campaign), eq(readingProgress.dayNo, todayDayNo), realMember))
      : Promise.resolve(null),
  ]);

  return {
    participants: participantsRow[0].n,
    walkedToday: walkedRow[0].n,
    todayDayDone: dayRow ? dayRow[0].n : null,
  };
}
