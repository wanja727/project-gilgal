import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bibleVerses } from "@/lib/db/schema";
import { GAE_ATTRIBUTION } from "../joshua";
import { groupSections } from "../sections";
import type { BibleTextProvider } from "../types";

/** bible_verse 테이블에서 읽는다. 적재는 scripts/load-bible.ts */
export const dbProvider: BibleTextProvider = {
  async getChapter(ref) {
    const rows = await db
      .select({ verse: bibleVerses.verse, heading: bibleVerses.sectionHeading, text: bibleVerses.text })
      .from(bibleVerses)
      .where(
        and(
          eq(bibleVerses.translation, ref.translation),
          eq(bibleVerses.book, ref.book),
          eq(bibleVerses.chapter, ref.chapter),
        ),
      )
      .orderBy(asc(bibleVerses.verse));
    if (rows.length === 0) return null;
    return {
      ref,
      sections: groupSections(rows.map((r) => ({ number: r.verse, heading: r.heading, text: r.text }))),
      verseCount: rows.length,
      attribution: GAE_ATTRIBUTION,
      source: "db",
    };
  },
};
