import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { verseHighlights } from "@/lib/db/schema";

/**
 * 개인 형광펜(ADR-035). 본인 것만 읽고 쓴다 — userId 는 항상 서버 세션에서 받는다.
 * 장·절 번호만 저장하고 본문 글자는 저장하지 않는다.
 */

export const MAX_VERSE = 200;

export async function listHighlights(userId: string, chapter: number): Promise<number[]> {
  const rows = await db
    .select({ verse: verseHighlights.verse })
    .from(verseHighlights)
    .where(and(eq(verseHighlights.userId, userId), eq(verseHighlights.chapter, chapter)))
    .orderBy(verseHighlights.verse);
  return rows.map((r) => r.verse);
}

/** 여러 절을 한 번에 긋거나 지운다(이미 그어진 절은 그대로) */
export async function setHighlights(userId: string, chapter: number, verses: number[], on: boolean): Promise<void> {
  if (verses.length === 0) return;
  if (on) {
    await db
      .insert(verseHighlights)
      .values(verses.map((verse) => ({ userId, chapter, verse })))
      .onConflictDoNothing();
  } else {
    await db
      .delete(verseHighlights)
      .where(
        and(eq(verseHighlights.userId, userId), eq(verseHighlights.chapter, chapter), inArray(verseHighlights.verse, verses)),
      );
  }
}
