import { describe, expect, it } from "vitest";
import { JOSHUA_VERSE_COUNTS } from "./joshua";
import { parseBibleText, validateJoshua } from "./parse";
import { mockProvider } from "./providers/mock";
import { groupSections } from "./sections";

describe("joshua 메타데이터", () => {
  it("24장, 총 658절", () => {
    expect(JOSHUA_VERSE_COUNTS).toHaveLength(24);
    expect(JOSHUA_VERSE_COUNTS.reduce((a, b) => a + b, 0)).toBe(658);
  });
});

describe("mock provider", () => {
  it("장별 절 수가 메타데이터와 같다", async () => {
    for (let ch = 1; ch <= 24; ch++) {
      const text = await mockProvider.getChapter({ translation: "GAE", book: "jos", chapter: ch });
      expect(text?.verseCount).toBe(JOSHUA_VERSE_COUNTS[ch - 1]);
      expect(text?.source).toBe("mock");
    }
  });
});

describe("parseBibleText", () => {
  it("책 접두어·소제목·빈 줄을 처리한다", () => {
    const parsed = parseBibleText(
      "﻿# 주석\n수1:1 <소제목 가> 첫 절\n\n1:2 둘째 절\n여호수아 2:1 <소제목 나> 다음 장\n",
    );
    expect(parsed).toEqual([
      {
        chapter: 1,
        verses: [
          { number: 1, heading: "소제목 가", text: "첫 절" },
          { number: 2, heading: undefined, text: "둘째 절" },
        ],
      },
      { chapter: 2, verses: [{ number: 1, heading: "소제목 나", text: "다음 장" }] },
    ]);
  });
  it("형식이 다르면 줄 번호와 함께 거부", () => {
    expect(() => parseBibleText("수1:1 첫 절\n아무 문장")).toThrow("2행");
  });
});

describe("validateJoshua", () => {
  it("전체 절 수가 맞으면 문제 없음", () => {
    const chapters = JOSHUA_VERSE_COUNTS.map((n, i) => ({
      chapter: i + 1,
      verses: Array.from({ length: n }, (_, v) => ({ number: v + 1, text: "x" })),
    }));
    expect(validateJoshua(chapters)).toEqual([]);
  });
  it("누락 장과 절 수 차이를 보고", () => {
    const problems = validateJoshua([{ chapter: 1, verses: [{ number: 1, text: "x" }] }]);
    expect(problems).toContain("1장 절 수 1 (기대 18)");
    expect(problems).toContain("2장 없음");
  });
});

describe("groupSections", () => {
  it("소제목마다 묶음을 나눈다", () => {
    expect(
      groupSections([
        { number: 1, text: "a" },
        { number: 2, heading: "H", text: "b" },
        { number: 3, text: "c" },
      ]),
    ).toEqual([
      { verses: [{ number: 1, text: "a" }] },
      {
        heading: "H",
        verses: [
          { number: 2, text: "b" },
          { number: 3, text: "c" },
        ],
      },
    ]);
  });
});
