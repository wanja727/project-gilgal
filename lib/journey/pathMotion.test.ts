import { describe, expect, it } from "vitest";
import { formatPathSeen, parsePathSeen, pathMotion } from "./pathMotion";

describe("홈 진행도 연출", () => {
  const today = "2026-11-05";
  const seen = (position: number, date = today, seed = "abc") => formatPathSeen({ seed, position, date });

  it("처음 보는 기기·다른 사람이면 오늘의 첫 연출", () => {
    expect(pathMotion(undefined, "abc", 3, today)).toEqual({ kind: "intro" });
    expect(pathMotion(seen(3, today, "other"), "abc", 3, today)).toEqual({ kind: "intro" });
    expect(pathMotion("깨진값", "abc", 3, today)).toEqual({ kind: "intro" });
  });
  it("그새 더 걸었으면 그 칸부터 걸어간다 — 날짜가 바뀌었어도", () => {
    expect(pathMotion(seen(3), "abc", 4, today)).toEqual({ kind: "step", from: 3 });
    expect(pathMotion(seen(0, "2026-11-01"), "abc", 2, today)).toEqual({ kind: "step", from: 0 });
  });
  it("같은 날 다시 보면 그대로, 날이 바뀌면 다시 그린다", () => {
    expect(pathMotion(seen(4), "abc", 4, today)).toEqual({ kind: "none" });
    expect(pathMotion(seen(4, "2026-11-04"), "abc", 4, today)).toEqual({ kind: "intro" });
  });
  it("seed 에 점이 있어도 읽는다", () => {
    expect(parsePathSeen(formatPathSeen({ seed: "a.b", position: 12, date: today }))).toEqual({ seed: "a.b", position: 12, date: today });
  });
});
