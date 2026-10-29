import { describe, expect, it } from "vitest";
import { insertVerse, referencedVerses, splitVerseRefs } from "./verseRef";

describe("나눔 속 구절 표기", () => {
  it("장:절·장:절-절 을 찾는다", () => {
    expect(splitVerseRefs("4:3 그리고 16:1-2 가 좋았어요")).toEqual([
      { text: "4:3", ref: { chapter: 4, from: 3, to: 3 } },
      { text: " 그리고 " },
      { text: "16:1-2", ref: { chapter: 16, from: 1, to: 2 } },
      { text: " 가 좋았어요" },
    ]);
  });
  it("장 범위 밖·거꾸로 된 범위·시간 표기는 글자로 둔다", () => {
    for (const s of ["25:1", "0:3", "4:0", "4:9-3", "오후 12:30:15", "4:1-40"]) {
      expect(splitVerseRefs(s).every((x) => !x.ref)).toBe(true);
    }
  });
  it("이 장에서 고른 절", () => {
    expect([...referencedVerses("4:3 4:7-9 5:1", 4)]).toEqual([3, 7, 8, 9]);
  });
});

describe("입력창에서 절 누르기", () => {
  const tap = (text: string, verse: number, caret = text.length) => insertVerse(text, caret, 16, verse, 1000).text;

  it("커서 자리에 장:절 을 넣는다", () => {
    expect(tap("", 1)).toBe("16:1 ");
    expect(tap("좋았던 말씀", 3)).toBe("좋았던 말씀 16:3 ");
  });
  it("바로 이어지는 절은 범위로 늘린다", () => {
    expect(tap(tap("", 1), 2)).toBe("16:1-2 ");
    expect(tap("16:1-2 ", 3)).toBe("16:1-3 ");
    expect(tap("16:5 ", 4)).toBe("16:4-5 ");
  });
  it("떨어진 절은 따로, 이미 있는 절은 그대로", () => {
    expect(tap("16:1 ", 5)).toBe("16:1 16:5 ");
    expect(tap("16:1-3 ", 2)).toBe("16:1-3 ");
    expect(tap("15:4 ", 5)).toBe("15:4 16:5 ");
  });
  it("커서가 가운데면 그 자리에", () => {
    const r = insertVerse("앞 뒤", 1, 16, 2, 1000);
    expect(r).toEqual({ text: "앞 16:2 뒤", caret: 6 });
    expect(insertVerse(r.text, r.caret, 16, 3, 1000).text).toBe("앞 16:2-3 뒤");
  });
});
