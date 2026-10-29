import { describe, expect, it } from "vitest";
import { insertVerse, referencedVerses, removeVerse, splitVerseRefs, tapVerse } from "./verseRef";

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
  it("고른 절을 다시 누르면 그 절만 뺀다", () => {
    expect(removeVerse("좋았던 16:3 말씀", 16, 3)).toBe("좋았던 말씀");
    expect(removeVerse("16:3 말씀", 16, 3)).toBe("말씀");
    expect(removeVerse("말씀 16:3", 16, 3)).toBe("말씀 ");
    expect(removeVerse("16:1-3 좋아요", 16, 3)).toBe("16:1-2 좋아요");
    expect(removeVerse("16:1-3 좋아요", 16, 1)).toBe("16:2-3 좋아요");
    expect(removeVerse("16:1-3 좋아요", 16, 2)).toBe("16:1 16:3 좋아요");
    expect(removeVerse("16:1-2", 16, 2)).toBe("16:1");
    expect(removeVerse("15:3 16:3", 16, 3)).toBe("15:3 ");
  });
  it("빠졌던 가운데 절을 다시 고르면 하나의 범위로 합친다", () => {
    expect(tap("16:4 16:6 ", 5)).toBe("16:4-6 ");
  });
  it("커서가 가운데면 그 자리에", () => {
    const r = insertVerse("앞 뒤", 1, 16, 2, 1000);
    expect(r).toEqual({ text: "앞 16:2 뒤", caret: 6 });
    expect(insertVerse(r.text, r.caret, 16, 3, 1000).text).toBe("앞 16:2-3 뒤");
  });
});

describe("절을 여러 번 눌렀다 뺐다 해도 표기가 깨지지 않는다", () => {
  // 시드 고정 난수 — 실패하면 같은 순서로 다시 볼 수 있게
  const rng = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

  it("무작위로 누르기·커서 옮기기 3000번", () => {
    for (const seed of [1, 7, 42, 2026]) {
      const rand = rng(seed);
      const picked = new Set<number>();
      let text = "";
      let caret = 0;
      for (let i = 0; i < 3000; i++) {
        // 가끔 사용자가 커서를 아무 데나 옮긴다
        if (rand() < 0.3) caret = Math.floor(rand() * (text.length + 1));
        const verse = 1 + Math.floor(rand() * 12);
        const r = tapVerse(text, caret, 16, verse, 1000);
        text = r.text;
        caret = r.caret;
        if (picked.has(verse)) picked.delete(verse);
        else picked.add(verse);

        const tokens = text.split(/\s+/).filter(Boolean);
        for (const t of tokens) expect(t, `seed ${seed} step ${i}: "${text}"`).toMatch(/^16:\d+(-\d+)?$/);
        expect([...referencedVerses(text, 16)].sort((a, b) => a - b), `seed ${seed} step ${i}: "${text}"`).toEqual(
          [...picked].sort((a, b) => a - b),
        );
      }
    }
  });

  it("글 사이에 커서가 있어도 글은 그대로 남는다", () => {
    let r = { text: "라합의 믿음 16:5 그리고 기도", caret: 3 };
    for (const v of [7, 8, 5, 6, 8, 7, 6]) r = tapVerse(r.text, r.caret, 16, v, 1000);
    expect(r.text.replace(/16:\S+/g, "").replace(/\s+/g, " ").trim()).toBe("라합의 믿음 그리고 기도");
    expect(referencedVerses(r.text, 16).size).toBe(0);
  });
});
