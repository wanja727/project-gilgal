import { describe, expect, it } from "vitest";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { buildAdminMetrics, pct } from "./metrics";

// 11/4(수) = 3장이 열린 날 — 1·2·3장이 열려 있다
const base = {
  today: "2026-11-04",
  campaign: JOSHUA_2026,
  pending: 2,
  members: [
    { userId: "a", name: "가", cell: "1셀", personal: false },
    { userId: "b", name: "나", cell: "1셀", personal: false },
    { userId: "c", name: "다", cell: "다른 공동체", personal: true },
  ],
};

describe("관리자 지표", () => {
  const m = buildAdminMetrics({
    ...base,
    completions: [
      { userId: "a", dayNo: 1, date: "2026-11-02" },
      { userId: "a", dayNo: 2, date: "2026-11-03" },
      { userId: "a", dayNo: 3, date: "2026-11-04" },
      // b: 몰아 읽기 — 같은 날 두 장, 그날 한 번만 센다
      { userId: "b", dayNo: 1, date: "2026-11-04" },
      { userId: "b", dayNo: 2, date: "2026-11-04" },
      // 참여자가 아닌 기록은 빠진다
      { userId: "x", dayNo: 1, date: "2026-11-04" },
    ],
    visits: [
      { userId: "a", date: "2026-11-04" },
      { userId: "b", date: "2026-11-04" },
      { userId: "c", date: "2026-11-03" },
      { userId: "x", date: "2026-11-04" },
    ],
  });

  it("오늘 숫자", () => {
    expect(m.members).toBe(3);
    expect(m.openDays).toBe(3);
    expect(m.todayDay).toEqual({ dayNo: 3, chapter: 3 });
    expect(m.visitorsToday).toBe(2);
    expect(m.readersToday).toBe(2);
    expect(m.todayChapterDone).toBe(1);
    expect(m.caughtUp).toBe(1);
  });

  it("날짜별 추이는 시작일부터 오늘까지", () => {
    expect(m.trend.map((t) => t.date)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(m.trend[2]).toEqual({ date: "2026-11-04", visitors: 2, readers: 2 });
    expect(m.trend[1]).toEqual({ date: "2026-11-03", visitors: 1, readers: 1 });
  });

  it("장별 완료·셀·개인", () => {
    expect(m.chapters.map((c) => c.done)).toEqual([2, 2, 1]);
    expect(m.chapters[2].today).toBe(true);
    const cell = m.cells.find((c) => c.cell === "1셀")!;
    expect(cell).toMatchObject({ members: 2, todayDone: 1, caughtUp: 1, doneSum: 5, doneMax: 6 });
    expect(m.people.find((p) => p.name === "다")).toMatchObject({ done: 0, lastRead: null, lastVisit: "2026-11-03" });
    expect(m.people.find((p) => p.name === "나")).toMatchObject({ done: 2, lastRead: "2026-11-04" });
  });

  it("주일에는 오늘의 장이 없다", () => {
    const sunday = buildAdminMetrics({ ...base, today: "2026-11-08", completions: [], visits: [] });
    expect(sunday.todayDay).toBeNull();
    expect(sunday.todayChapterDone).toBeNull();
    expect(sunday.cells[0].todayDone).toBeNull();
    expect(sunday.openDays).toBe(6);
  });

  it("시작 전에는 추이가 비어 있다", () => {
    const before = buildAdminMetrics({ ...base, today: "2026-11-01", completions: [], visits: [] });
    expect(before.trend).toEqual([]);
    expect(before.openDays).toBe(0);
    expect(before.caughtUp).toBe(0);
  });

  it("퍼센트", () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(0, 0)).toBe(0);
  });
});
