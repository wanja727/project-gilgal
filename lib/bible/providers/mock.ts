import { verseCountOf } from "../joshua";
import type { BibleTextProvider, ChapterText } from "../types";

/**
 * 이용 허락 전 개발용. 실제 절 수만큼 자리 표시 문장을 만든다.
 * 화면에는 Mock 배지가 함께 표시되어 실제 본문으로 오해되지 않는다.
 */
export const mockProvider: BibleTextProvider = {
  async getChapter(ref): Promise<ChapterText> {
    const count = verseCountOf(ref.chapter);
    const verses = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      text: `여호수아 ${ref.chapter}장 ${i + 1}절 — 본문 자리 표시 문장입니다. 실제 성경 본문이 아닙니다.`,
    }));
    return {
      ref,
      sections: [{ verses }],
      verseCount: count,
      attribution: "Mock 본문 — 실제 성경 본문이 아닙니다",
      source: "mock",
    };
  },
};
