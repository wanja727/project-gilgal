import { describe, expect, it } from "vitest";
import { weekdayOf } from "@/lib/time";
import { buildReadingDates, JOSHUA_2026, resolveCampaignSlug } from "./campaign";
import { ACTS, JOURNEY_DAYS } from "./days";
import { cropAroundLeg, SITES } from "./locations";
import { previousSite } from "./mapState";

/** 요구사항 2절의 정확한 매핑 (11/2 → 1장 … 11/28 → 24장, 주일 제외) */
const EXPECTED_DATES = [
  "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07",
  "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14",
  "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21",
  "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28",
];

describe("캠페인 일정", () => {
  it("24개 공개일이 요구사항 매핑과 정확히 일치", () => {
    expect(buildReadingDates(JOSHUA_2026)).toEqual(EXPECTED_DATES);
    expect(JOURNEY_DAYS.map((d) => d.readingDate)).toEqual(EXPECTED_DATES);
  });

  it("주일에는 공개일이 없고, 마지막 공개일은 endDate", () => {
    expect(JOURNEY_DAYS.every((d) => weekdayOf(d.readingDate) !== 0)).toBe(true);
    expect(JOURNEY_DAYS.at(-1)?.readingDate).toBe(JOSHUA_2026.endDate);
  });

  it("Catch-up 기간은 월~토, 정식 기간 이후", () => {
    expect(weekdayOf(JOSHUA_2026.catchupStartDate)).toBe(1);
    expect(weekdayOf(JOSHUA_2026.catchupEndDate)).toBe(6);
    expect(JOSHUA_2026.catchupStartDate > JOSHUA_2026.endDate).toBe(true);
  });
});

describe("24일 여정 데이터 무결성", () => {
  it("DAY n = 여호수아 n장, 1~24 연속", () => {
    expect(JOURNEY_DAYS).toHaveLength(24);
    JOURNEY_DAYS.forEach((d, i) => {
      expect(d.day).toBe(i + 1);
      expect(d.chapter).toBe(i + 1);
    });
  });

  it("ACT 구간: 1~5 / 6~12 / 13~21 / 22~24 (개관의 네 부분)", () => {
    const actOf = (n: number) => JOURNEY_DAYS[n - 1].act;
    expect([1, 5].map(actOf)).toEqual([1, 1]);
    expect([6, 12].map(actOf)).toEqual([2, 2]);
    expect([13, 21].map(actOf)).toEqual([3, 3]);
    expect([22, 24].map(actOf)).toEqual([4, 4]);
    expect(Object.keys(ACTS)).toHaveLength(4);
  });

  it("모든 날에 제목·장소·도착 문구가 있고 지점 id 가 유효", () => {
    for (const d of JOURNEY_DAYS) {
      expect(d.title.trim()).not.toBe("");
      expect(d.place.trim()).not.toBe("");
      expect(d.ordinalLine).toMatch(/번째 걸음$/);
      expect(d.completion.headline.trim()).not.toBe("");
      expect(d.summary.trim()).not.toBe("");
      // 장 카드에서 모바일 두 줄 안쪽
      expect(d.summary.length).toBeLessThanOrEqual(48);
      expect(SITES).toHaveProperty(d.site);
    }
  });

  it("요구사항·시안에 명시된 장면", () => {
    expect(JOURNEY_DAYS[7].ordinalLine).toBe("약속의 땅을 정복하는 여덟 번째 걸음");
    expect(JOURNEY_DAYS[2].completion.headline).toBe("요단을 건너 가나안에 들어왔어요");
    expect(JOURNEY_DAYS[2].mapEffect).toBe("cross-jordan");
    expect(JOURNEY_DAYS[5].completion.headline).toBe("여리고에 도착했어요");
    expect(JOURNEY_DAYS[17].completion.headline).toBe("실로에 도착했어요");
    expect(JOURNEY_DAYS[17].site).toBe("shiloh");
    expect(JOURNEY_DAYS[23].completion.headline).toBe("여정을 완주했어요");
    expect(JOURNEY_DAYS[23].site).toBe("shechem");
  });

  it("모든 지점에 장면 이름과 설명이 있다", () => {
    for (const s of Object.values(SITES)) {
      expect(s.scene.trim()).not.toBe("");
      expect(s.description.trim()).not.toBe("");
    }
  });

  it("13장부터 지도 표현이 territory 로 전환", () => {
    expect(JOURNEY_DAYS.slice(12, 22).every((d) => d.mapMode === "territory")).toBe(true);
    expect(JOURNEY_DAYS.slice(0, 11).every((d) => d.mapMode === "journey")).toBe(true);
  });
});

describe("캠페인 slug", () => {
  it("기본값과 허용값", () => {
    expect(resolveCampaignSlug(undefined)).toBe("joshua-2026");
    expect(resolveCampaignSlug("joshua-2026-test")).toBe("joshua-2026-test");
  });
  it("오타는 에러 (엉뚱한 slug 에 기록 방지)", () => {
    expect(() => resolveCampaignSlug("joshua-2026-tset")).toThrow(/GILGAL_CAMPAIGN/);
  });
});

describe("도착 화면 확대 영역 (cropAroundLeg)", () => {
  const box = (v: string) => {
    const [x, y, w, h] = v.split(" ").map(Number);
    return { x, y, w, h };
  };
  const inside = (b: ReturnType<typeof box>, id: keyof typeof SITES) =>
    SITES[id].x > b.x && SITES[id].x < b.x + b.w && SITES[id].y > b.y && SITES[id].y < b.y + b.h;

  it("모든 장에서 출발·도착 지점이 다 보이고, 가로세로 비율은 300:250", () => {
    for (const d of JOURNEY_DAYS) {
      const b = box(cropAroundLeg(previousSite(d.day), d.site));
      expect(inside(b, previousSite(d.day))).toBe(true);
      expect(inside(b, d.site)).toBe(true);
      expect(b.w / b.h).toBeCloseTo(300 / 250, 2);
    }
  });

  it("가까운 걸음은 기본 크기 그대로, 먼 걸음만 넓힌다", () => {
    expect(box(cropAroundLeg("gilgal", "jericho")).w).toBe(300);
    expect(box(cropAroundLeg("gibeon", "hazor")).w).toBeGreaterThan(300);
  });
});
