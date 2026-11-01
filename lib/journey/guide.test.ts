import { describe, expect, it } from "vitest";
import { goal, greeting, journeyProgress } from "./guide";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe("홈 안내 문구", () => {
  it("기간 전", () => {
    const p = journeyProgress([], "2026-10-24");
    expect(greeting(p, "정다윤")).toEqual({ kicker: "10월 24일 토요일, 출발까지 D-9", headline: "다윤 님,\n곧 여정이 시작돼요" });
    expect(goal(p)).toMatchObject({ title: "출발까지 D-9", action: { variant: "quiet", label: "11월 2일에 1장이 열려요" } });
  });

  it("3장 뒤처짐 (6장 날, 1~3장 읽음)", () => {
    const p = journeyProgress([1, 2, 3], "2026-11-07");
    expect(p.position).toBe(3);
    expect(greeting(p, "정다윤").headline).toBe("다윤 님, 오늘은\n여리고까지 가요");
    expect(goal(p)).toEqual({
      title: "깃발까지 3장 남았어요",
      body: "4, 5, 6장을 읽으면 여리고에 도착해요",
      action: { label: "4장 이어 읽기", href: "/day/4", variant: "main" },
    });
  });

  it("건너뛰고 읽음: 위치는 이어 읽은 곳, 남은 장은 실제로 안 읽은 장", () => {
    const p = journeyProgress([1, 2, 3, 5, 6], "2026-11-07");
    expect(p.position).toBe(3);
    expect(goal(p)).toMatchObject({ title: "깃발까지 1장 남았어요", action: { href: "/day/4" } });
  });

  it("오늘 장 도착 (토요일 → 다음은 월요일)", () => {
    const p = journeyProgress(range(1, 6), "2026-11-07");
    expect(goal(p)).toEqual({
      title: "오늘 깃발에 도착했어요",
      body: "11월 9일 월요일에는 7장, 새로운 길이 열려요",
      action: { label: "11월 9일 월요일에 7장이 열려요", variant: "quiet" },
    });
  });

  it("오늘 장 도착 (평일 → 내일)", () => {
    const p = journeyProgress(range(1, 7), "2026-11-09");
    expect(goal(p).body).toBe("내일은 8장, 새로운 길이 열려요");
  });

  it("주일", () => {
    const p = journeyProgress([1, 2], "2026-11-08");
    expect(greeting(p, "정다윤")).toEqual({ kicker: "11월 8일 주일", headline: "다윤 님, 오늘은\n쉼의 날이에요" });
    expect(goal(p).title).toBe("깃발까지 4장 남았어요");
  });

  it("보충 기간: 깃발 없이 아직 걷지 않은 길", () => {
    const p = journeyProgress(range(1, 20), "2026-12-01");
    expect(p.flag).toBeNull();
    expect(greeting(p, "정다윤").headline).toBe("다윤 님,\n아직 걷지 않은 길이 4개 있어요");
    expect(goal(p)).toMatchObject({ title: "아직 걷지 않은 길 4개", action: { href: "/day/21" } });
  });

  it("완주", () => {
    const p = journeyProgress(range(1, 24), "2026-12-10");
    expect(greeting(p, "정다윤").headline).toBe("다윤 님,\n24장을 모두 걸었어요");
    expect(goal(p).action).toEqual({ label: "나의 24일 돌아보기", href: "/finale", variant: "main" });
  });
});
