import "server-only";
import { and, asc, count, countDistinct, eq, gte, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cells, profiles, readingProgress } from "@/lib/db/schema";
import { campaignSlug } from "@/lib/journey/campaign";
import { checkDayAccess } from "@/lib/journey/schedule";
import { addDays, type IsoDate, nowKst } from "@/lib/time";

/**
 * 읽기 기록. 모든 함수는 현재 캠페인 slug(GILGAL_CAMPAIGN) 안에서만 읽고 쓴다 —
 * 로컬·Preview(joshua-2026-test)의 기록이 운영 화면에 섞이지 않게(ADR-015).
 */

/**
 * 공동체 통계·명단에 들어가는 사람: 온보딩을 마친 사용자.
 * 운영 캠페인에서는 테스트 계정을 빼고, 테스트 캠페인에서는 테스트 계정만 센다 —
 * 로컬에서 여러 테스트 계정으로 순위·셀 화면을 검증할 수 있게 하면서 운영 숫자는 그대로 둔다.
 */
function communityMember() {
  return and(
    eq(profiles.isTest, campaignSlug() === "joshua-2026-test"),
    isNotNull(profiles.realName),
    isNotNull(profiles.cellId),
  );
}

/** 내가 완료한 DAY 번호 (오름차순) */
export async function getCompletedDays(userId: string): Promise<number[]> {
  const rows = await db
    .select({ dayNo: readingProgress.dayNo })
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.campaign, campaignSlug())))
    .orderBy(asc(readingProgress.dayNo));
  return rows.map((r) => r.dayNo);
}

/** 내가 완료한 장과 완료 시각 (완주 회고용) */
export async function getCompletionTimes(userId: string): Promise<Map<number, Date>> {
  const rows = await db
    .select({ dayNo: readingProgress.dayNo, at: readingProgress.completedAt })
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.campaign, campaignSlug())));
  return new Map(rows.map((r) => [r.dayNo, r.at]));
}

export type CompleteDayResult =
  | { status: "completed" | "already"; day: number }
  | { status: "invalid_day" | "locked" };

/**
 * 읽기 완료 저장. 공개 여부는 화면과 무관하게 여기서 다시 검증한다.
 * 중복 요청은 UNIQUE + ON CONFLICT DO NOTHING 으로 1행만 남고 "already" 를 돌려준다.
 * 완료 시각은 nowKst() — 개발 환경의 GILGAL_DEV_NOW 시나리오에서도 순위·"오늘" 집계가 맞게.
 */
export async function completeDay(userId: string, dayNo: unknown, today: IsoDate): Promise<CompleteDayResult> {
  const access = checkDayAccess(dayNo, today);
  if (!access.ok) return { status: access.reason };
  const inserted = await db
    .insert(readingProgress)
    .values({ userId, campaign: campaignSlug(), dayNo: access.day.day, completedAt: nowKst() })
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
  /** 오늘(KST) 어떤 DAY 든 완료한 사람 */
  walkedToday: number;
  /** 24장을 모두 완료한 사람 */
  finishers: number;
};

/** 주일·보충 기간·종료 후의 공동체 숫자 (architecture 7절 공동체 "오늘" 지표) */
export async function getCommunityToday(today: IsoDate): Promise<CommunityToday> {
  const campaign = campaignSlug();
  const [start, end] = kstDayRange(today);
  const finishersSq = db
    .select({ userId: readingProgress.userId })
    .from(readingProgress)
    .innerJoin(profiles, eq(profiles.userId, readingProgress.userId))
    .where(and(eq(readingProgress.campaign, campaign), communityMember()))
    .groupBy(readingProgress.userId)
    .having(sql`count(*) = 24`)
    .as("finishers");

  const [participantsRow, walkedRow, finishersRow] = await Promise.all([
    db.select({ n: count() }).from(profiles).where(communityMember()),
    db
      .select({ n: countDistinct(readingProgress.userId) })
      .from(readingProgress)
      .innerJoin(profiles, eq(profiles.userId, readingProgress.userId))
      .where(
        and(
          eq(readingProgress.campaign, campaign),
          gte(readingProgress.completedAt, start),
          lt(readingProgress.completedAt, end),
          communityMember(),
        ),
      ),
    db.select({ n: count() }).from(finishersSq),
  ]);

  return { participants: participantsRow[0].n, walkedToday: walkedRow[0].n, finishers: finishersRow[0].n };
}

// ─── 오늘 장 도착 순서 (확정 결정 3) ─────────────────────────────────────

export type Arrival = { name: string; cellName: string | null; avatarSeed: string; at: Date };

export type ArrivalBoard = {
  dayNo: number;
  /** 이 장을 완료한 공동체 인원 */
  total: number;
  /** 완료 시각 순 1~3번째 */
  podium: Arrival[];
  /** 4번째부터 몇 명의 아바타 (이름은 보내지 않는다) */
  restAvatars: string[];
  /** 내 기록 (완료 전이면 null) */
  mine: { rank: number; at: Date } | null;
};

/**
 * "오늘 N장까지 읽은 사람": 그 장의 완료 시각(completed_at)이 빠른 순.
 * 밀린 장을 먼저 읽느라 늦게 완료한 사람도 같은 기준이고, 앞선 장을 다 읽었는지는 보지 않는다.
 * 완료하지 않은 사람의 명단은 만들지 않는다(요구사항 10절).
 */
export async function getArrivalBoard(dayNo: number, userId: string, restCount = 6): Promise<ArrivalBoard> {
  const campaign = campaignSlug();
  const ofDay = and(eq(readingProgress.campaign, campaign), eq(readingProgress.dayNo, dayNo));

  const [rows, totalRow, mineRow] = await Promise.all([
    db
      .select({
        name: profiles.realName,
        cellName: cells.name,
        avatarSeed: profiles.avatarSeed,
        at: readingProgress.completedAt,
      })
      .from(readingProgress)
      .innerJoin(profiles, eq(profiles.userId, readingProgress.userId))
      .leftJoin(cells, eq(cells.id, profiles.cellId))
      .where(and(ofDay, communityMember()))
      .orderBy(asc(readingProgress.completedAt), asc(readingProgress.id))
      .limit(3 + restCount),
    db
      .select({ n: count() })
      .from(readingProgress)
      .innerJoin(profiles, eq(profiles.userId, readingProgress.userId))
      .where(and(ofDay, communityMember())),
    db
      .select({ id: readingProgress.id, at: readingProgress.completedAt })
      .from(readingProgress)
      .where(and(ofDay, eq(readingProgress.userId, userId))),
  ]);

  let mine: ArrivalBoard["mine"] = null;
  if (mineRow[0]) {
    const { id, at } = mineRow[0];
    const [before] = await db
      .select({ n: count() })
      .from(readingProgress)
      .innerJoin(profiles, eq(profiles.userId, readingProgress.userId))
      .where(
        and(
          ofDay,
          communityMember(),
          or(
            lt(readingProgress.completedAt, at),
            and(eq(readingProgress.completedAt, at), lt(readingProgress.id, id)),
          ),
        ),
      );
    mine = { rank: before.n + 1, at };
  }

  return {
    dayNo,
    total: totalRow[0].n,
    podium: rows.slice(0, 3).map((r) => ({ ...r, name: r.name ?? "" })),
    restAvatars: rows.slice(3).map((r) => r.avatarSeed),
    mine,
  };
}

// ─── 셀 카드 ─────────────────────────────────────────────────────────────

export type CellMember = {
  isMe: boolean;
  avatarSeed: string;
  /** 도착한 셀원과 나만 이름을 보낸다 — 아직인 셀원은 이름 없이 흐린 아바타로(2026-10-24 결정) */
  name: string | null;
  arrived: boolean;
};

/**
 * 셀원과 "기준 장까지 왔는지". 기준 장 목록을 모두 완료했으면 도착.
 * (평일·주일: 깃발 장 하나 / 보충 기간·종료 후: 1~24장 전체)
 */
export async function getCellMembers(cellId: number, userId: string, criterionDays: number[]): Promise<CellMember[]> {
  const campaign = campaignSlug();
  const rows = await db
    .select({
      userId: profiles.userId,
      name: profiles.realName,
      avatarSeed: profiles.avatarSeed,
      done: sql<number>`count(${readingProgress.id})::int`,
      lastAt: sql<Date | null>`max(${readingProgress.completedAt})`,
    })
    .from(profiles)
    .leftJoin(
      readingProgress,
      and(
        eq(readingProgress.userId, profiles.userId),
        eq(readingProgress.campaign, campaign),
        criterionDays.length ? inArray(readingProgress.dayNo, criterionDays) : sql`false`,
      ),
    )
    .where(and(eq(profiles.cellId, cellId), or(communityMember(), eq(profiles.userId, userId))))
    .groupBy(profiles.userId, profiles.realName, profiles.avatarSeed);

  const members = rows.map((r) => {
    const arrived = criterionDays.length > 0 && r.done >= criterionDays.length;
    const isMe = r.userId === userId;
    return {
      member: { isMe, avatarSeed: r.avatarSeed, name: arrived || isMe ? r.name : null, arrived },
      lastAt: r.lastAt ? new Date(r.lastAt).getTime() : Infinity,
    };
  });
  // 도착한 사람(도착 순) → 아직인 사람. 아직인 사람끼리는 이름 대신 아바타 seed 순으로 섞어 둔다
  members.sort((a, b) =>
    a.member.arrived !== b.member.arrived
      ? a.member.arrived
        ? -1
        : 1
      : a.member.arrived
        ? a.lastAt - b.lastAt
        : a.member.avatarSeed.localeCompare(b.member.avatarSeed),
  );
  return members.map((m) => m.member);
}
