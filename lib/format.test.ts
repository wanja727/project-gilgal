import { describe, expect, it } from "vitest";
import { formatDate, formatKstTime, givenName, josa, ordinalEn, relativeTime } from "./format";

describe("format", () => {
  it("날짜", () => {
    expect(formatDate("2026-11-07")).toBe("11월 7일");
    expect(formatDate("2026-11-07", true)).toBe("11월 7일 토요일");
  });
  it("KST 시각", () => {
    expect(formatKstTime(new Date("2026-11-06T20:48:00Z"))).toBe("오전 5:48");
    expect(formatKstTime(new Date("2026-11-07T03:05:00Z"))).toBe("오후 12:05");
    expect(formatKstTime(new Date("2026-11-06T15:00:00Z"))).toBe("오전 12:00");
  });
  it("영문 서수", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 85, 102].map(ordinalEn)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "85th", "102nd",
    ]);
  });
  it("조사", () => {
    expect(josa("여리고", "으로/로")).toBe("여리고로");
    expect(josa("길갈", "으로/로")).toBe("길갈로");
    expect(josa("에발산", "으로/로")).toBe("에발산으로");
    expect(josa("세겜", "이에요/예요")).toBe("세겜이에요");
    expect(josa("아이", "을/를")).toBe("아이를");
  });
  it("대표 이름", () => {
    expect(givenName("정다윤")).toBe("다윤");
    expect(givenName("남궁민수")).toBe("남궁민수");
    expect(givenName("John")).toBe("John");
  });
  it("상대 시각", () => {
    const now = new Date("2026-11-07T12:00:00+09:00");
    expect(relativeTime(new Date("2026-11-07T11:59:30+09:00"), now)).toBe("방금");
    expect(relativeTime(new Date("2026-11-07T11:55:00+09:00"), now)).toBe("5분 전");
    expect(relativeTime(new Date("2026-11-07T10:00:00+09:00"), now)).toBe("2시간 전");
    expect(relativeTime(new Date("2026-11-05T23:30:00+09:00"), now)).toBe("11월 5일");
  });
});
