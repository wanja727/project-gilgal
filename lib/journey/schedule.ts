import { diffDays, type IsoDate, isIsoDate, weekdayOf } from "@/lib/time";
import { JOSHUA_2026, type Campaign } from "./campaign";
import { JOURNEY_DAYS, type JourneyDay } from "./days";

/**
 * 장 공개 정책 (requirements 13절 확정, architecture 7절).
 *
 * 규칙은 하나다: 공개일(readingDate) <= 오늘(KST) 이면 공개, 아니면 잠금. 종료일은 없다.
 * - 지난 장은 정식 기간·주일·Catch-up·종료 후 언제든 읽고 완료할 수 있다.
 * - 미래 장은 공개일 전까지 완료할 수 없다.
 * - Catch-up 에 새 장이 열리지 않는 것은 마지막 공개일(11/28)이 그 전이라 자연히 성립한다.
 *
 * 모든 함수는 today 를 인자로 받는 순수 함수다. 서버에서 todayKst() 를 넣어 호출하고,
 * 클라이언트 표시와 무관하게 서버 액션에서 다시 검증한다.
 */

export type CampaignPhase =
  | "before" //   첫 장 공개 전
  | "reading" //  정식 기간의 월~토 (오늘의 장이 있음)
  | "rest" //     정식~Catch-up 사이의 주일 (새 장 없음)
  | "catchup" //  Catch-up 기간 (새 장 없음, 완주 기회 안내)
  | "after"; //   Catch-up 이후 (모든 장 계속 이용 가능)

export function getDay(dayNo: number): JourneyDay | undefined {
  if (!Number.isInteger(dayNo)) return undefined;
  return JOURNEY_DAYS[dayNo - 1];
}

export function isDayUnlocked(day: JourneyDay, today: IsoDate): boolean {
  return day.readingDate <= today;
}

/** 오늘 공개되는 장 (주일·Catch-up·기간 밖이면 null) */
export function todaysDay(today: IsoDate): JourneyDay | null {
  return JOURNEY_DAYS.find((d) => d.readingDate === today) ?? null;
}

/** 오늘까지 공개된 장 */
export function unlockedDays(today: IsoDate): JourneyDay[] {
  return JOURNEY_DAYS.filter((d) => isDayUnlocked(d, today));
}

/** 다음에 공개될 장 (모두 공개되었으면 null) */
export function nextLockedDay(today: IsoDate): JourneyDay | null {
  return JOURNEY_DAYS.find((d) => !isDayUnlocked(d, today)) ?? null;
}

export function campaignPhase(
  today: IsoDate,
  campaign: Campaign = JOSHUA_2026,
): CampaignPhase {
  if (today < campaign.startDate) return "before";
  if (today > campaign.catchupEndDate) return "after";
  if (today >= campaign.catchupStartDate) return "catchup";
  if (today <= campaign.endDate && weekdayOf(today) !== campaign.restWeekday) {
    return "reading";
  }
  // 정식 기간 중 주일 + 정식 종료(11/28)~Catch-up 시작(11/30) 사이의 주일
  return "rest";
}

/** 첫 장 공개까지 남은 일수 (시작 이후면 0) */
export function daysUntilStart(today: IsoDate, campaign: Campaign = JOSHUA_2026): number {
  return Math.max(0, diffDays(today, campaign.startDate));
}

export type CompletionCheck =
  | { ok: true; day: JourneyDay }
  | { ok: false; reason: "invalid_day" | "locked" };

/**
 * 읽기 완료(및 댓글 작성) 가능 여부. 서버 액션은 저장 전에 반드시 이 검사를 통과해야 한다.
 * dayNo 는 클라이언트 입력이므로 형식부터 검증한다.
 */
export function checkDayAccess(dayNo: unknown, today: IsoDate): CompletionCheck {
  if (!isIsoDate(today)) throw new Error(`잘못된 today: "${today}"`);
  const n = typeof dayNo === "string" && /^\d+$/.test(dayNo) ? Number(dayNo) : dayNo;
  if (typeof n !== "number") return { ok: false, reason: "invalid_day" };
  const day = getDay(n);
  if (!day) return { ok: false, reason: "invalid_day" };
  if (!isDayUnlocked(day, today)) return { ok: false, reason: "locked" };
  return { ok: true, day };
}

/** 공개되었지만 아직 완료하지 않은 장 = "아직 걷지 않은 길" (DAY 순) */
export function unwalkedDays(
  completedDayNos: Iterable<number>,
  today: IsoDate,
): JourneyDay[] {
  const done = new Set(completedDayNos);
  return unlockedDays(today).filter((d) => !done.has(d.day));
}

/** 24장을 모두 완료했는가 */
export function isJourneyComplete(completedDayNos: Iterable<number>): boolean {
  const done = new Set(completedDayNos);
  return JOURNEY_DAYS.every((d) => done.has(d.day));
}
