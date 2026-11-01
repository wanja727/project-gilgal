import { describe, expect, it } from "vitest";
import { JOURNEY_DAYS } from "./days";
import {
  chapterStatus,
  contiguousPosition,
  flagDay,
  mapView,
  revealedSites,
  nextToRead,
  previousSite,
  trail,
} from "./mapState";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe("contiguousPosition (확정 결정 2)", () => {
  it("아무것도 안 읽으면 0 (출발점)", () => {
    expect(contiguousPosition([])).toBe(0);
  });
  it("1·2·3·5장을 읽으면 3", () => {
    expect(contiguousPosition([1, 2, 3, 5])).toBe(3);
  });
  it("1장을 건너뛰면 0", () => {
    expect(contiguousPosition([2, 3, 4])).toBe(0);
  });
  it("순서와 무관, 24장 모두면 24", () => {
    expect(contiguousPosition(range(1, 24).reverse())).toBe(24);
  });
});

describe("chapterStatus", () => {
  const done = new Set([1, 3]);
  const today = "2026-11-04"; // 3장 공개일
  it("완료 / 공개됐지만 안 읽음 / 잠김", () => {
    expect(chapterStatus(JOURNEY_DAYS[0], done, today)).toBe("done");
    expect(chapterStatus(JOURNEY_DAYS[1], done, today)).toBe("open");
    expect(chapterStatus(JOURNEY_DAYS[2], done, today)).toBe("done");
    expect(chapterStatus(JOURNEY_DAYS[3], done, today)).toBe("locked");
  });
});

describe("flagDay", () => {
  it("정식 기간 평일 = 오늘의 장", () => {
    expect(flagDay("2026-11-07")?.day).toBe(6);
  });
  it("주일 = 가장 최근에 열린 장", () => {
    expect(flagDay("2026-11-08")?.day).toBe(6);
    expect(flagDay("2026-11-29")?.day).toBe(24);
  });
  it("기간 전·보충 기간·종료 후에는 깃발 없음", () => {
    expect(flagDay("2026-11-01")).toBeNull();
    expect(flagDay("2026-12-01")).toBeNull();
    expect(flagDay("2026-12-07")).toBeNull();
  });
});

describe("nextToRead", () => {
  it("공개된 장 중 안 읽은 가장 앞 장", () => {
    expect(nextToRead(new Set([1, 2, 3, 5]), "2026-11-07")?.day).toBe(4);
    expect(nextToRead(new Set(range(1, 6)), "2026-11-07")).toBeNull();
  });
});

describe("trail", () => {
  it("같은 지점이 이어지면 한 번만", () => {
    expect(trail(1, 6)).toEqual(["shittim", "jordan", "gilgal", "jericho"]);
  });
});

describe("mapView", () => {
  it("3장 뒤처짐: 3장까지 걸은 길, 아바타는 요단강, 깃발은 여리고", () => {
    const v = mapView({ completed: [1, 2, 3], position: 3, flag: 6 });
    expect(v.walked).toEqual(["shittim", "jordan"]);
    expect(v.me).toBe("jordan");
    expect(v.flag).toBe("jericho");
    expect(v.canaanFilled).toBe(true);
  });
  it("출발 전: 아바타·걸은 길 없음, 가나안은 점선 경계", () => {
    const v = mapView({ completed: [], position: 0, flag: 2 });
    expect(v.me).toBeNull();
    expect(v.walked).toEqual([]);
    expect(v.canaanFilled).toBe(false);
  });
  it("건너뛰고 읽은 장의 지점도 방문 표시", () => {
    const v = mapView({ completed: [1, 2, 3, 6], position: 3, flag: 6 });
    expect(v.visited).toContain("jericho");
    expect(v.me).toBe("jordan");
  });
});

describe("previousSite", () => {
  it("이전 장의 지점", () => {
    expect(previousSite(3)).toBe("shittim");
    expect(previousSite(1)).toBe("shittim");
    expect(previousSite(18)).toBe("shechem");
  });
});

describe("드러난 장소", () => {
  it("출발 전에는 싯딤만", () => {
    expect(revealedSites("2026-11-01")).toEqual(["shittim"]);
  });
  it("열린 장의 장소까지만, 아직 열리지 않은 장의 장소는 없다", () => {
    const today = JOURNEY_DAYS[5].readingDate;
    const sites = revealedSites(today);
    for (const d of JOURNEY_DAYS.slice(0, 6)) expect(sites).toContain(d.site);
    const later = JOURNEY_DAYS.slice(6).map((d) => d.site).filter((s) => !JOURNEY_DAYS.slice(0, 6).some((d) => d.site === s));
    for (const s of later) expect(sites).not.toContain(s);
  });
  it("다 열리면 모든 장소", () => {
    expect(new Set(revealedSites("2026-12-31")).size).toBe(new Set(JOURNEY_DAYS.map((d) => d.site)).size);
  });
});
