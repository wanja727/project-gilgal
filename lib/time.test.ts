import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  isDevNowAllowed,
  isIsoDate,
  resolveNow,
  toKstDate,
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
