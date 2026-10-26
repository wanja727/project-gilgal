import type { IsoDate } from "@/lib/time";
import { JOURNEY_DAYS, type JourneyDay } from "./days";
import { type SiteId } from "./locations";
import { campaignPhase, isDayUnlocked, todaysDay, unlockedDays } from "./schedule";

/**
 * 진행도·지도 상태 계산 (순수 함수, architecture 8.2 · ADR-022).
 *
 * - 내 위치(position) = 1장부터 빠짐없이 이어서 읽은 마지막 장. 1·2·3·5장을 읽었다면 3.
 *   아무것도 안 읽었으면 0(1장 앞 출발점). 칸 하나하나의 상태는 실제 완료 여부로 따로 표시한다.
 * - 깃발 = 오늘 공개된 장. 주일에는 가장 최근에 열린 장. 기간 전·보충 기간·종료 후에는 없다.
 * - "깃발까지 N장" = 깃발까지 공개된 장 중 안 읽은 장 수(내 위치와 별개).
 */

export type ChapterStatus = "done" | "open" | "locked";

/** 1장부터 이어서 읽은 마지막 장 (없으면 0) */
export function contiguousPosition(completed: Iterable<number>): number {
  const done = new Set(completed);
  let n = 0;
  while (n < JOURNEY_DAYS.length && done.has(n + 1)) n++;
  return n;
}

export function chapterStatus(day: JourneyDay, done: ReadonlySet<number>, today: IsoDate): ChapterStatus {
  if (done.has(day.day)) return "done";
  return isDayUnlocked(day, today) ? "open" : "locked";
}

/** 깃발이 꽂힌 장: 정식 기간 평일 = 오늘의 장, 주일 = 가장 최근에 열린 장, 그 밖에는 없음 */
export function flagDay(today: IsoDate): JourneyDay | null {
  const phase = campaignPhase(today);
  if (phase === "reading") return todaysDay(today);
  if (phase === "rest") return unlockedDays(today).at(-1) ?? null;
  return null;
}

/** 다음에 읽을 장: 공개됐지만 안 읽은 장 중 가장 앞 */
export function nextToRead(done: ReadonlySet<number>, today: IsoDate): JourneyDay | null {
  return unlockedDays(today).find((d) => !done.has(d.day)) ?? null;
}

// ─── 지도 ────────────────────────────────────────────────────────────────

/** from~to 장을 따라가며 지나는 지점 (같은 지점이 이어지면 한 번만) */
export function trail(from: number, to: number): SiteId[] {
  const out: SiteId[] = [];
  for (let n = Math.max(1, from); n <= Math.min(to, JOURNEY_DAYS.length); n++) {
    const site = JOURNEY_DAYS[n - 1].site;
    if (out.at(-1) !== site) out.push(site);
  }
  return out;
}

export type MapView = {
  /**
   * 1장~내 위치까지 걸은 길 (옅은 실선).
   * 아직 걷지 않은 길(내 위치~깃발)은 그리지 않는다 — 점선이 겹쳐 산만해서(2026-10-26 운영자 피드백)
   */
  walked: SiteId[];
  /** 채운 아이콘으로 보일 지점: 걸은 길 + 실제로 완료한 장의 지점 */
  visited: SiteId[];
  /** 내 아바타가 있는 지점 (아직 출발 전이면 null) */
  me: SiteId | null;
  /** 깃발 지점 */
  flag: SiteId | null;
  /** 3장(요단을 건넘)을 완료했으면 가나안을 채운다 */
  canaanFilled: boolean;
};

export function mapView({
  completed,
  position,
  flag,
}: {
  completed: Iterable<number>;
  position: number;
  flag: number | null;
}): MapView {
  const done = new Set(completed);
  const walked = position > 0 ? trail(1, position) : [];
  const visited = new Set<SiteId>(walked);
  for (const d of JOURNEY_DAYS) if (done.has(d.day)) visited.add(d.site);
  return {
    walked,
    visited: [...visited],
    me: position > 0 ? JOURNEY_DAYS[position - 1].site : null,
    flag: flag ? JOURNEY_DAYS[flag - 1].site : null,
    canaanFilled: done.has(3),
  };
}

/** n장 이전에 머물던 지점 (1장이면 1장의 지점) — 도착 화면에서 "이전 장소 → 이번 장소" 길을 그릴 때 */
export function previousSite(day: number): SiteId {
  return JOURNEY_DAYS[Math.max(0, day - 2)].site;
}
