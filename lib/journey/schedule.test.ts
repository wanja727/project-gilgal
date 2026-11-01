import { describe, expect, it } from "vitest";
import { toServiceDate } from "@/lib/time";
import {
  campaignPhase,
  checkDayAccess,
  daysUntilStart,
  isJourneyComplete,
  nextLockedDay,
  todaysDay,
  unlockedDays,
  unwalkedDays,
} from "./schedule";

const ALL = Array.from({ length: 24 }, (_, i) => i + 1);

describe("campaignPhase", () => {
  it.each([
    ["2026-10-19", "before"],
    ["2026-11-01", "before"], //  시작 전날 (주일)
    ["2026-11-02", "reading"], // 첫날
    ["2026-11-07", "reading"], // 토
    ["2026-11-08", "rest"], //    주일
    ["2026-11-15", "rest"],
    ["2026-11-22", "rest"],
    ["2026-11-28", "reading"], // 마지막 장
    ["2026-11-29", "rest"], //    정식 종료 후 주일
    ["2026-11-30", "catchup"],
    ["2026-12-05", "catchup"],
    ["2026-12-06", "after"],
    ["2027-01-01", "after"],
  ] as const)("%s → %s", (today, phase) => {
    expect(campaignPhase(today)).toBe(phase);
  });
});

describe("오늘의 장", () => {
  it("공개일에는 그날의 장", () => {
    expect(todaysDay("2026-11-02")?.day).toBe(1);
    expect(todaysDay("2026-11-09")?.day).toBe(7);
    expect(todaysDay("2026-11-28")?.day).toBe(24);
  });
  it("주일·Catch-up·기간 밖에는 새 장이 없다", () => {
    for (const d of ["2026-11-01", "2026-11-08", "2026-11-29", "2026-11-30", "2026-12-05", "2026-12-06"]) {
      expect(todaysDay(d)).toBeNull();
    }
  });
});

describe("공개 정책 (확정 1~7)", () => {
  it("시작 전에는 아무 장도 공개되지 않는다", () => {
    expect(unlockedDays("2026-11-01")).toHaveLength(0);
    expect(checkDayAccess(1, "2026-11-01")).toEqual({ ok: false, reason: "locked" });
  });

  it("미래 날짜의 장은 공개일 전까지 완료할 수 없다", () => {
    expect(checkDayAccess(2, "2026-11-02")).toEqual({ ok: false, reason: "locked" });
    expect(checkDayAccess(24, "2026-11-27")).toEqual({ ok: false, reason: "locked" });
    expect(checkDayAccess(24, "2026-11-28").ok).toBe(true);
  });

  it("지난 장은 정식 기간 중에도 보충 완료할 수 있다", () => {
    expect(checkDayAccess(1, "2026-11-20").ok).toBe(true);
    expect(unlockedDays("2026-11-20").map((d) => d.day)).toEqual(ALL.slice(0, 17));
  });

  it("주일에도 이미 공개된 장을 읽고 완료할 수 있다", () => {
    expect(unlockedDays("2026-11-08")).toHaveLength(6);
    expect(checkDayAccess(6, "2026-11-08").ok).toBe(true);
    expect(checkDayAccess(7, "2026-11-08")).toEqual({ ok: false, reason: "locked" });
  });

  it("Catch-up 에는 새 장이 열리지 않고 24장 모두 이미 공개 상태", () => {
    expect(unlockedDays("2026-11-30")).toHaveLength(24);
    expect(unlockedDays("2026-12-05")).toHaveLength(24);
    expect(nextLockedDay("2026-11-28")).toBeNull();
  });

  it("12/5 이후에도 종료일 없이 모든 장을 완료할 수 있다", () => {
    for (const today of ["2026-12-06", "2027-01-01", "2030-12-31"]) {
      expect(ALL.every((n) => checkDayAccess(n, today).ok)).toBe(true);
    }
  });

  it("새벽 4시 경계(ADR-033): 11/2 04:00 KST 에 1장 공개 — 자정에는 아직", () => {
    const midnight = toServiceDate(new Date("2026-11-02T00:00:00+09:00"));
    expect(checkDayAccess(1, midnight).ok).toBe(false);
    const before = toServiceDate(new Date("2026-11-02T03:59:59+09:00"));
    const after = toServiceDate(new Date("2026-11-02T04:00:00+09:00"));
    expect(checkDayAccess(1, before).ok).toBe(false);
    expect(checkDayAccess(1, after).ok).toBe(true);
  });
});

describe("checkDayAccess 입력 검증 (클라이언트 입력)", () => {
  it.each([0, 25, -1, 1.5, NaN, null, undefined, "abc", "1e1", {}])(
    "%s → invalid_day",
    (input) => {
      expect(checkDayAccess(input, "2026-12-06")).toEqual({ ok: false, reason: "invalid_day" });
    },
  );
  it("숫자 문자열은 허용 (URL 파라미터)", () => {
    expect(checkDayAccess("3", "2026-12-06").ok).toBe(true);
  });
  it("잘못된 today 는 프로그래밍 오류로 에러", () => {
    expect(() => checkDayAccess(1, "2026/11/02")).toThrow();
  });
});

describe("아직 걷지 않은 길 / 완주", () => {
  it("공개되었고 완료하지 않은 장만 (미래 장 제외)", () => {
    const unwalked = unwalkedDays([1, 2, 4, 5], "2026-11-09"); // 7장까지 공개
    expect(unwalked.map((d) => d.day)).toEqual([3, 6, 7]);
  });
  it("Catch-up 에 미완료 목록 제공", () => {
    const done = ALL.filter((n) => n !== 7 && n !== 14);
    expect(unwalkedDays(done, "2026-12-01").map((d) => d.day)).toEqual([7, 14]);
    expect(isJourneyComplete(done)).toBe(false);
    expect(isJourneyComplete([...done, 7, 14])).toBe(true);
  });
});

describe("daysUntilStart", () => {
  it("D-day 계산", () => {
    expect(daysUntilStart("2026-10-19")).toBe(14);
    expect(daysUntilStart("2026-11-02")).toBe(0);
    expect(daysUntilStart("2026-12-01")).toBe(0);
  });
});
