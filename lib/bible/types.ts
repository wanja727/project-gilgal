/**
 * 성경 본문 Provider 계약 (architecture 8.5, ADR-008/016).
 * 화면(ChapterReader)은 ChapterText 만 보고 렌더링하므로 Provider 를 바꿔도 UI 는 그대로다.
 */
export type BibleBookCode = "jos";
export type BibleTranslation = "GAE"; // 개역개정
export type BibleRef = { translation: BibleTranslation; book: BibleBookCode; chapter: number };

export type Verse = { number: number; text: string };
/** 소제목 단위 묶음. 소제목이 없으면 heading 없이 1개 */
export type Section = { heading?: string; verses: Verse[] };

export type BibleSource = "mock" | "db";

export type ChapterText = {
  ref: BibleRef;
  sections: Section[];
  verseCount: number;
  /** 본문 아래 표기 문구 */
  attribution: string;
  source: BibleSource;
};

export interface BibleTextProvider {
  /** 본문이 아직 없으면 null (예: db provider 인데 적재 전) */
  getChapter(ref: BibleRef): Promise<ChapterText | null>;
}
