import { describe, expect, it } from "vitest";
import { JOSHUA_2026 } from "./journey/campaign";
import {
  addDays,
  diffDays,
  isDevNowAllowed,
  isPrelaunchTest,
  PRELAUNCH_UNTIL,
  isIsoDate,
  resolveNow,
  serviceDayStart,
  toKstDate,
  toServiceDate,
  weekdayOf,
} from "./time";

describe("toKstDate — KST 자정 경계", () => {
  it("UTC 14:59 는 아직 같은 KST 날짜", () => {
    expect(toKstDate(new Date("2026-11-01T14:59:59Z"))).toBe("2026-11-01");
  });
  it("UTC 15:00 은 KST 다음 날 00:00", () => {
    expect(toKstDate(new Date("2026-11-01T15:00:00Z"))).toBe("2026-11-02");
  });
  it("오프셋이 붙은 KST 시각을 그대로 해석", () => {
    expect(toKstDate(new Date("2026-11-28T23:59:59+09:00"))).toBe("2026-11-28");
    expect(toKstDate(new Date("2026-11-29T00:00:00+09:00"))).toBe("2026-11-29");
  });
  it("연말 경계", () => {
    expect(toKstDate(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
});

describe("toServiceDate — 새벽 4시 경계(ADR-033)", () => {
  it("자정을 넘겨도 새벽 4시 전이면 전날", () => {
    expect(toServiceDate(new Date("2026-11-03T00:30:00+09:00"))).toBe("2026-11-02");
    expect(toServiceDate(new Date("2026-11-03T03:59:59+09:00"))).toBe("2026-11-02");
  });
  it("새벽 4시가 되면 다음 날", () => {
    expect(toServiceDate(new Date("2026-11-03T04:00:00+09:00"))).toBe("2026-11-03");
    expect(toServiceDate(new Date("2026-11-03T23:59:59+09:00"))).toBe("2026-11-03");
  });
  it("연말 경계", () => {
    expect(toServiceDate(new Date("2027-01-01T02:00:00+09:00"))).toBe("2026-12-31");
  });
  it("serviceDayStart 는 그날 04:00 KST", () => {
    expect(serviceDayStart("2026-11-02").toISOString()).toBe("2026-11-01T19:00:00.000Z");
  });
});

describe("resolveNow — GILGAL_DEV_NOW 오버라이드", () => {
  const real = new Date("2026-10-19T03:00:00Z");

  it("값이 없으면 실제 시각", () => {
    expect(resolveNow({}, real)).toBe(real);
    expect(resolveNow({ GILGAL_DEV_NOW: "  " }, real)).toBe(real);
  });

  it("개발/Preview 에서는 오버라이드 적용", () => {
    const env = { GILGAL_DEV_NOW: "2026-11-08T10:00:00+09:00" };
    expect(toKstDate(resolveNow(env, real))).toBe("2026-11-08");
    expect(
      toKstDate(resolveNow({ ...env, VERCEL_ENV: "preview" }, real)),
    ).toBe("2026-11-08");
  });

  it("운영(VERCEL_ENV=production)에서는 무시", () => {
    const env = {
      GILGAL_DEV_NOW: "2026-11-08T10:00:00+09:00",
      VERCEL_ENV: "production",
    };
    expect(isDevNowAllowed(env)).toBe(false);
    expect(resolveNow(env, real)).toBe(real);
  });

  it("날짜만 주면 날짜만 바꾸고 시각은 실제 KST 시각", () => {
    // real = 2026-10-19 12:00 KST
    const now = resolveNow({ GILGAL_DEV_NOW: "2026-11-12" }, real);
    expect(now.toISOString()).toBe("2026-11-12T03:00:00.000Z");
  });

  it("날짜만 주고 실제 시각이 새벽 4시 전이면, 서비스 날짜가 주어진 날짜가 되게 하루 뒤 달력에 둔다", () => {
    const night = new Date("2026-10-19T17:30:00Z"); // 10/20 02:30 KST
    const now = resolveNow({ GILGAL_DEV_NOW: "2026-11-12" }, night);
    expect(now.toISOString()).toBe("2026-11-12T17:30:00.000Z"); // 11/13 02:30 KST
    expect(toServiceDate(now)).toBe("2026-11-12");
  });

  it("오픈 전 운영 테스트 모드: 첫 장 공개 전까지만 운영에서도 적용", () => {
    const env = { GILGAL_DEV_NOW: "2026-11-12", VERCEL_ENV: "production", GILGAL_PRELAUNCH_TEST: "1" };
    expect(isPrelaunchTest(env, real)).toBe(true);
    expect(toKstDate(resolveNow(env, real))).toBe("2026-11-12");
    // 첫 장이 열리는 11/2 04:00 KST 가 되면 환경변수가 남아 있어도 저절로 꺼진다
    expect(isPrelaunchTest(env, new Date("2026-11-01T18:59:59Z"))).toBe(true);
    const launch = new Date("2026-11-01T19:00:00Z");
    expect(isPrelaunchTest(env, launch)).toBe(false);
    expect(resolveNow(env, launch)).toBe(launch);
    // 값이 "1" 이 아니면 꺼짐
    expect(isPrelaunchTest({ ...env, GILGAL_PRELAUNCH_TEST: "true" }, real)).toBe(false);
  });

  it("테스트 모드 종료 시각은 캠페인 첫 장 공개일과 같다", () => {
    expect(PRELAUNCH_UNTIL.slice(0, 10)).toBe(JOSHUA_2026.startDate);
  });

  it("형식이 잘못되면 에러", () => {
    expect(() => resolveNow({ GILGAL_DEV_NOW: "내일" }, real)).toThrow(
      /GILGAL_DEV_NOW/,
    );
  });
});

describe("날짜 문자열 연산", () => {
  it("isIsoDate 는 존재하지 않는 날짜를 거부", () => {
    expect(isIsoDate("2026-11-02")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-11-2")).toBe(false);
  });

  it("addDays / diffDays 는 월·연 경계를 넘는다", () => {
    expect(addDays("2026-11-28", 2)).toBe("2026-11-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-11-02", -1)).toBe("2026-11-01");
    expect(diffDays("2026-10-19", "2026-11-02")).toBe(14);
    expect(diffDays("2026-11-02", "2026-10-19")).toBe(-14);
  });

  it("weekdayOf (0=일)", () => {
    expect(weekdayOf("2026-11-02")).toBe(1); // 월
    expect(weekdayOf("2026-11-08")).toBe(0); // 주일
    expect(weekdayOf("2026-11-28")).toBe(6); // 토
  });

  it("잘못된 날짜 문자열은 에러", () => {
    expect(() => addDays("2026/11/02", 1)).toThrow();
  });
});
