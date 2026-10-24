/**
 * 길갈의 모든 날짜 판단은 KST(Asia/Seoul) 기준 "YYYY-MM-DD" 문자열로 한다.
 *
 * - 현재 시각은 이 모듈만 안다(nowKst/todayKst). 나머지 코드는 날짜 문자열을 인자로 받는
 *   순수 함수로 작성해 테스트 가능하게 한다.
 * - 한국은 서머타임이 없으므로 UTC+9 고정 오프셋으로 계산한다(Intl 의존 없음).
 * - 개발/Preview 에서는 GILGAL_DEV_NOW 로 현재 시각을 바꿔 기간별 화면을 검증한다.
 *   운영(VERCEL_ENV=production)에서는 무시해 실수로 날짜가 고정되는 사고를 막는다.
 * - 예외: 오픈 전 운영 테스트 모드(GILGAL_PRELAUNCH_TEST=1, ADR-024). 첫 장 공개 시각 전까지만
 *   운영에서도 오버라이드를 허용하고, 그 뒤에는 환경변수를 지우지 않아도 저절로 꺼진다.
 */

export type IsoDate = string; // "YYYY-MM-DD" (KST 달력 날짜)

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// process.env 를 그대로 넘길 수 있도록 인덱스 시그니처를 둔다
type TimeEnv = {
  GILGAL_DEV_NOW?: string;
  GILGAL_PRELAUNCH_TEST?: string;
  VERCEL_ENV?: string;
  [key: string]: string | undefined;
};

/**
 * 오픈 전 운영 테스트 모드가 끝나는 시각 = 첫 장 공개(campaign.startDate 00:00 KST).
 * lib/journey 가 이 모듈을 import 하므로 순환을 피해 상수로 두고, 같은 값인지는 테스트로 확인한다.
 */
export const PRELAUNCH_UNTIL = "2026-11-02T00:00:00+09:00";

/** 오픈 전 운영 테스트 모드가 켜져 있는가 — 실제 시각 기준(오버라이드와 무관) */
export function isPrelaunchTest(env: TimeEnv, realNow: Date): boolean {
  return env.GILGAL_PRELAUNCH_TEST?.trim() === "1" && realNow.getTime() < Date.parse(PRELAUNCH_UNTIL);
}

/** 오버라이드를 허용하는 환경인가 (운영 배포에서는 오픈 전 테스트 모드일 때만) */
export function isDevNowAllowed(env: TimeEnv, realNow: Date = new Date()): boolean {
  return env.VERCEL_ENV !== "production" || isPrelaunchTest(env, realNow);
}

/**
 * 현재 시각 결정 로직(순수 함수). 테스트용으로 env 와 실제 시각을 주입받는다.
 * - 시각까지 주면("2026-11-08T10:00:00+09:00") 그 순간에 멈춘다.
 * - 날짜만 주면("2026-11-12") 날짜만 바꾸고 시각은 실제 KST 시각을 쓴다 — 여러 사람이 테스트할 때
 *   완료 시각·도착 순서가 실제처럼 흘러간다.
 * 잘못된 GILGAL_DEV_NOW 는 조용히 무시하지 않고 에러로 알린다 — 다른 날짜로 테스트하고 있다고
 * 착각하는 것을 막기 위함.
 */
export function resolveNow(env: TimeEnv, realNow: Date): Date {
  const override = env.GILGAL_DEV_NOW?.trim();
  if (!override || !isDevNowAllowed(env, realNow)) return realNow;
  if (ISO_DATE_RE.test(override) && isIsoDate(override)) {
    const clock = new Date(realNow.getTime() + KST_OFFSET_MS).toISOString().slice(11, 23);
    return new Date(`${override}T${clock}+09:00`);
  }
  const parsed = new Date(override);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `GILGAL_DEV_NOW 형식이 올바르지 않습니다: "${override}" (예: 2026-11-12 또는 2026-11-08T10:00:00+09:00)`,
    );
  }
  return parsed;
}

/** 지금 날짜 오버라이드가 적용되고 있는가 (화면 상단 테스트 모드 띠 표시용) */
export function isTimeOverridden(): boolean {
  return !!process.env.GILGAL_DEV_NOW?.trim() && isDevNowAllowed(process.env);
}

/** 현재 시각(Date). 개발 환경 오버라이드가 반영된다. */
export function nowKst(): Date {
  return resolveNow(process.env, new Date());
}

/** 주어진 시각의 KST 달력 날짜 */
export function toKstDate(instant: Date): IsoDate {
  return new Date(instant.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 오늘(KST) 날짜 */
export function todayKst(): IsoDate {
  return toKstDate(nowKst());
}

// ─── 날짜 문자열 연산 (시간대와 무관한 달력 계산) ─────────────────────────

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE_RE.test(value)) return false;
  // 2026-02-30 같은 값이 Date 에서 3월로 넘어가는 것을 걸러낸다
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function toUtcMidnight(date: IsoDate): number {
  if (!isIsoDate(date)) throw new Error(`잘못된 날짜 문자열: "${date}"`);
  return Date.parse(`${date}T00:00:00Z`);
}

/** date 에 n일을 더한 날짜 */
export function addDays(date: IsoDate, n: number): IsoDate {
  return new Date(toUtcMidnight(date) + n * DAY_MS).toISOString().slice(0, 10);
}

/** to - from (일). from 이 더 늦으면 음수 */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS);
}

/** 요일 (0=일 … 6=토) */
export function weekdayOf(date: IsoDate): number {
  return new Date(toUtcMidnight(date)).getUTCDay();
}
