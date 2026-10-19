import "server-only";
import { dbProvider } from "./providers/db";
import { mockProvider } from "./providers/mock";
import type { BibleSource, BibleTextProvider, ChapterText } from "./types";

/**
 * BIBLE_PROVIDER 에 따른 본문 Provider 선택.
 * - mock: 본문을 적재하기 전(기본)
 * - db:   운영자가 제공한 본문을 bible_verse 에 적재한 뒤
 * architecture 8.5 의 static(JSON 파일) 안은 db 로 충분해 만들지 않았다.
 */
export function bibleSource(): BibleSource {
  const v = process.env.BIBLE_PROVIDER?.trim() || "mock";
  if (v === "mock" || v === "db") return v;
  throw new Error(`BIBLE_PROVIDER 값이 올바르지 않습니다: "${v}" (허용: mock, db)`);
}

const PROVIDERS: Record<BibleSource, BibleTextProvider> = { mock: mockProvider, db: dbProvider };

/** 여호수아 n장 본문. db 인데 아직 적재되지 않았으면 null */
export async function getJoshuaChapter(chapter: number): Promise<ChapterText | null> {
  return PROVIDERS[bibleSource()].getChapter({ translation: "GAE", book: "jos", chapter });
}
