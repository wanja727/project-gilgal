import { describe, expect, it } from "vitest";
import { mapState, positionAfterDay } from "./mapState";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const stateOf = (s: ReturnType<typeof mapState>, id: string) => s.locations.find((l) => l.id === id)?.state;

describe("positionAfterDay", () => {
  it("장소 없는 장은 직전 지점에 머문다", () => {
    expect(positionAfterDay(0)).toBe("shittim");
    expect(positionAfterDay(3)).toBe("jordan");
    expect(positionAfterDay(12)).toBe("hazor");
    expect(positionAfterDay(13)).toBe("hazor");
    expect(positionAfterDay(15)).toBe("hebron");
    expect(positionAfterDay(23)).toBe("shiloh");
    expect(positionAfterDay(24)).toBe("shechem");
  });
});

describe("mapState", () => {
  it("0개 완료: 출발점에 마커, 걸은 길 없음", () => {
    const s = mapState([]);
    expect(s.marker).toBe("shittim");
    expect(s.segments.every((seg) => !seg.walked)).toBe(true);
    expect(stateOf(s, "shittim")).toBe("start");
    expect(stateOf(s, "jericho")).toBe("upcoming");
  });

  it("1개 완료: 출발점에 머문다(1장은 요단 동쪽)", () => {
    expect(mapState([1]).marker).toBe("shittim");
  });

  it("3개 완료: 요단강, 첫 구간을 걸음", () => {
    const s = mapState([1, 2, 3]);
    expect(s.marker).toBe("jordan");
    expect(s.segments.find((seg) => seg.day === 3)?.walked).toBe(true);
    expect(stateOf(s, "jordan")).toBe("visited");
  });

  it("12개 완료: 하솔에 머묾, ACT 1~2 지점 모두 방문", () => {
    const s = mapState(range(1, 12));
    expect(s.marker).toBe("hazor");
    for (const id of ["jordan", "gilgal", "jericho", "ai", "ebal", "gibeon", "hebron", "hazor"]) {
      expect(stateOf(s, id)).toBe("visited");
    }
    expect(stateOf(s, "shiloh")).toBe("upcoming");
  });

  it("24개 완료: 세겜, 모든 구간을 걸음", () => {
    const s = mapState(range(1, 24));
    expect(s.marker).toBe("shechem");
    expect(s.segments.every((seg) => seg.walked)).toBe(true);
    expect(s.locations.filter((l) => l.state === "upcoming")).toEqual([]);
  });

  it("순서와 무관: 앞 장을 건너뛰고 뒤 장만 완료해도 그 지점에 마커", () => {
    const s = mapState([7]);
    expect(s.marker).toBe("ai");
    expect(stateOf(s, "ai")).toBe("visited");
    expect(stateOf(s, "jericho")).toBe("upcoming");
    expect(s.segments.find((seg) => seg.day === 6)?.walked).toBe(false);
  });

  it("범위 밖 DAY 는 무시", () => {
    expect(mapState([0, 25, -1]).marker).toBe("shittim");
  });

  it("오늘의 DAY 지점을 강조", () => {
    expect(mapState([], 6).highlight).toBe("jericho");
    expect(mapState([], 13).highlight).toBeNull();
  });
});
