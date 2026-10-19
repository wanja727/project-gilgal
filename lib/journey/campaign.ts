import { addDays, type IsoDate, weekdayOf } from "@/lib/time";

/**
 * 통독 캠페인 메타데이터 (ADR-003: DB 테이블 대신 설정 파일이 단일 원천).
 * 일정 변경은 이 파일만 고치면 된다. 날짜는 모두 KST 달력 날짜.
 */
export type Campaign = {
  title: string;
  book: { code: "jos"; name: string };
  totalDays: number;
  /** 첫 장 공개일 */
  startDate: IsoDate;
  /** 마지막 장 공개일 */
  endDate: IsoDate;
  /** Catch-up: 새 장은 열리지 않고, 미완료자에게 완주 기회를 안내하는 기간 */
  catchupStartDate: IsoDate;
  catchupEndDate: IsoDate;
  /** 새 장을 공개하지 않는 요일 (0=주일) */
  restWeekday: number;
};

export const JOSHUA_2026: Campaign = {
  title: "여호수아 24일 통독",
  book: { code: "jos", name: "여호수아" },
  totalDays: 24,
  startDate: "2026-11-02",
  endDate: "2026-11-28",
  catchupStartDate: "2026-11-30",
  catchupEndDate: "2026-12-05",
  restWeekday: 0,
};

/**
 * 읽기 기록·댓글을 나누는 캠페인 키.
 * 개발·운영이 같은 Supabase 프로젝트를 쓰므로(ADR-015) 로컬·Preview 는 테스트 slug 로
 * 기록해 실제 데이터와 섞이지 않게 한다. 일정은 두 slug 가 동일하다.
 */
export const CAMPAIGN_SLUGS = ["joshua-2026", "joshua-2026-test"] as const;
export type CampaignSlug = (typeof CAMPAIGN_SLUGS)[number];
export const DEFAULT_CAMPAIGN_SLUG: CampaignSlug = "joshua-2026";

export function resolveCampaignSlug(value: string | undefined): CampaignSlug {
  const v = value?.trim();
  if (!v) return DEFAULT_CAMPAIGN_SLUG;
  if ((CAMPAIGN_SLUGS as readonly string[]).includes(v)) return v as CampaignSlug;
  // 오타로 엉뚱한 slug 에 기록되는 것을 막는다
  throw new Error(
    `GILGAL_CAMPAIGN 값이 올바르지 않습니다: "${v}" (허용: ${CAMPAIGN_SLUGS.join(", ")})`,
  );
}

/** 현재 환경의 캠페인 slug */
export function campaignSlug(): CampaignSlug {
  return resolveCampaignSlug(process.env.GILGAL_CAMPAIGN);
}

/** 시작일부터 쉬는 요일을 건너뛰며 count 개의 공개일을 만든다 */
export function buildReadingDates(campaign: Campaign): IsoDate[] {
  const dates: IsoDate[] = [];
  let date = campaign.startDate;
  while (dates.length < campaign.totalDays) {
    if (weekdayOf(date) !== campaign.restWeekday) dates.push(date);
    date = addDays(date, 1);
  }
  return dates;
}
