import type { Campaign } from "@/lib/journey/campaign";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { addDays, type IsoDate } from "@/lib/time";

/**
 * 관리자 지표 계산(ADR-036). DB 를 모르는 순수 함수 — lib/data/admin.ts 가 원천 행을 모아 넘긴다.
 * 사람 수가 수백 명이라 행을 한 번에 받아 메모리에서 센다(셀라 지표 화면과 같은 방식).
 *
 * 기준
 * - 참여자: 온보딩을 마친 사람(공동체 집계와 같은 기준, 테스트 계정 제외).
 * - "읽은 날": 완료 기록 시각의 서비스 날짜(새벽 4시 기준). 지난 장을 몰아 읽어도 그날 한 번 센다.
 * - 진행률: 오늘까지 열린 장 중 읽은 장. 셀 진행률 = 셀원이 읽은 열린 장 합 / (셀원 수 × 열린 장 수).
 */

export type AdminMember = { userId: string; name: string; cell: string; personal: boolean };
export type AdminCompletion = { userId: string; dayNo: number; date: IsoDate };
export type AdminVisit = { userId: string; date: IsoDate };

export type TrendPoint = { date: IsoDate; visitors: number; readers: number };
export type ChapterPoint = { dayNo: number; chapter: number; done: number; today: boolean };
export type CellRow = {
  cell: string;
  personal: boolean;
  members: number;
  /** 오늘의 장을 읽은 셀원(오늘 새 장이 없으면 null) */
  todayDone: number | null;
  /** 열린 장을 모두 읽은 셀원 */
  caughtUp: number;
  /** 셀원이 읽은 열린 장 합 */
  doneSum: number;
  /** 셀원 수 × 열린 장 수 */
  doneMax: number;
};
export type PersonRow = {
  name: string;
  cell: string;
  /** 읽은 열린 장 수 */
  done: number;
  lastRead: IsoDate | null;
  lastVisit: IsoDate | null;
};

export type AdminMetrics = {
  today: IsoDate;
  members: number;
  pending: number;
  openDays: number;
  /** 오늘 새로 열린 장(주일·Catch-up 이면 null) */
  todayDay: { dayNo: number; chapter: number } | null;
  visitorsToday: number;
  readersToday: number;
  /** 오늘의 장을 읽은 참여자(언제 읽었든) */
  todayChapterDone: number | null;
  caughtUp: number;
  trend: TrendPoint[];
  chapters: ChapterPoint[];
  cells: CellRow[];
  people: PersonRow[];
};

export function buildAdminMetrics(input: {
  today: IsoDate;
  campaign: Campaign;
  members: AdminMember[];
  pending: number;
  completions: AdminCompletion[];
  visits: AdminVisit[];
}): AdminMetrics {
  const { today, campaign, members, pending } = input;
  const ids = new Set(members.map((m) => m.userId));
  // 참여자 것만 센다(온보딩 전 기록·탈퇴 등 섞이지 않게)
  const completions = input.completions.filter((c) => ids.has(c.userId));
  const visits = input.visits.filter((v) => ids.has(v.userId));

  const open = JOURNEY_DAYS.filter((d) => d.readingDate <= today);
  const openSet = new Set(open.map((d) => d.day));
  const todayJourney = JOURNEY_DAYS.find((d) => d.readingDate === today) ?? null;

  // 사람별 읽은 열린 장·마지막 읽은 날·마지막 방문일
  const doneBy = new Map<string, Set<number>>();
  const lastReadBy = new Map<string, IsoDate>();
  for (const c of completions) {
    if (openSet.has(c.dayNo)) {
      if (!doneBy.has(c.userId)) doneBy.set(c.userId, new Set());
      doneBy.get(c.userId)!.add(c.dayNo);
    }
    if ((lastReadBy.get(c.userId) ?? "") < c.date) lastReadBy.set(c.userId, c.date);
  }
  const lastVisitBy = new Map<string, IsoDate>();
  for (const v of visits) if ((lastVisitBy.get(v.userId) ?? "") < v.date) lastVisitBy.set(v.userId, v.date);

  const doneCount = (id: string) => doneBy.get(id)?.size ?? 0;
  const didToday = (id: string) => (todayJourney ? (doneBy.get(id)?.has(todayJourney.day) ?? false) : false);
  const isCaughtUp = (id: string) => open.length > 0 && doneCount(id) === open.length;

  // 날짜별 방문·읽은 사람(시작일 ~ 오늘, 시작 전이면 비움)
  const visitorsOn = groupDistinct(visits);
  const readersOn = groupDistinct(completions);
  const trend: TrendPoint[] = [];
  for (let d = campaign.startDate; d <= today && d <= campaign.catchupEndDate; d = addDays(d, 1)) {
    trend.push({ date: d, visitors: visitorsOn.get(d)?.size ?? 0, readers: readersOn.get(d)?.size ?? 0 });
  }

  const chapters: ChapterPoint[] = open.map((d) => ({
    dayNo: d.day,
    chapter: d.chapter,
    done: members.filter((m) => doneBy.get(m.userId)?.has(d.day)).length,
    today: d.day === todayJourney?.day,
  }));

  const byCell = new Map<string, AdminMember[]>();
  for (const m of members) {
    if (!byCell.has(m.cell)) byCell.set(m.cell, []);
    byCell.get(m.cell)!.push(m);
  }
  const cells: CellRow[] = [...byCell.entries()].map(([cell, ms]) => ({
    cell,
    personal: ms[0].personal,
    members: ms.length,
    todayDone: todayJourney ? ms.filter((m) => didToday(m.userId)).length : null,
    caughtUp: ms.filter((m) => isCaughtUp(m.userId)).length,
    doneSum: ms.reduce((s, m) => s + doneCount(m.userId), 0),
    doneMax: ms.length * open.length,
  }));

  const people: PersonRow[] = members.map((m) => ({
    name: m.name,
    cell: m.cell,
    done: doneCount(m.userId),
    lastRead: lastReadBy.get(m.userId) ?? null,
    lastVisit: lastVisitBy.get(m.userId) ?? null,
  }));

  return {
    today,
    members: members.length,
    pending,
    openDays: open.length,
    todayDay: todayJourney ? { dayNo: todayJourney.day, chapter: todayJourney.chapter } : null,
    visitorsToday: visitorsOn.get(today)?.size ?? 0,
    readersToday: readersOn.get(today)?.size ?? 0,
    todayChapterDone: todayJourney ? members.filter((m) => didToday(m.userId)).length : null,
    caughtUp: members.filter((m) => isCaughtUp(m.userId)).length,
    trend,
    chapters,
    cells,
    people,
  };
}

function groupDistinct(rows: { userId: string; date: IsoDate }[]): Map<IsoDate, Set<string>> {
  const out = new Map<IsoDate, Set<string>>();
  for (const r of rows) {
    if (!out.has(r.date)) out.set(r.date, new Set());
    out.get(r.date)!.add(r.userId);
  }
  return out;
}

/** 퍼센트(반올림, 분모 0 이면 0) */
export function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}
