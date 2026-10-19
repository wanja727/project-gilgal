/**
 * 여호수아 본문 텍스트 → bible_verse 적재 (architecture 8.5).
 *
 *   pnpm bible:load data/private/joshua.txt --dry   # 파싱·검증만
 *   pnpm bible:load data/private/joshua.txt         # 검증 통과 시 적재(같은 번역의 여호수아 행을 교체)
 *
 * - 파일 형식은 lib/bible/parse.ts 참고(한 줄에 한 절, "수1:1 <소제목> 본문").
 * - 24장·장별 절 수가 맞지 않으면 적재하지 않는다.
 * - 본문 파일은 data/private/(gitignore)에 두고 저장소에 커밋하지 않는다.
 * - 적재 후 BIBLE_PROVIDER=db 로 바꾸면 화면에 실제 본문이 나온다.
 */
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { bibleVerses } from "../lib/db/schema";
import { parseBibleText, validateJoshua } from "../lib/bible/parse";

const [file, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry");

async function main() {
  if (!file) throw new Error("사용법: pnpm bible:load <본문 파일> [--dry]");
  const chapters = parseBibleText(readFileSync(file, "utf8"));
  const total = chapters.reduce((n, c) => n + c.verses.length, 0);
  const headings = chapters.reduce((n, c) => n + c.verses.filter((v) => v.heading).length, 0);
  console.log(`파싱: ${chapters.length}장, ${total}절, 소제목 ${headings}개`);

  const problems = validateJoshua(chapters);
  if (problems.length) {
    console.log("검증 실패 — 적재하지 않습니다:");
    for (const p of problems) console.log(`  - ${p}`);
    process.exitCode = 1;
    return;
  }
  console.log("검증 통과: 24장, 장별 절 수 일치");
  if (dryRun) return;

  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("DIRECT_URL 이 설정되지 않았습니다");
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(bibleVerses)
        .where(and(eq(bibleVerses.translation, "GAE"), eq(bibleVerses.book, "jos")));
      for (const c of chapters) {
        await tx.insert(bibleVerses).values(
          c.verses.map((v) => ({
            translation: "GAE",
            book: "jos",
            chapter: c.chapter,
            verse: v.number,
            sectionHeading: v.heading ?? null,
            text: v.text,
          })),
        );
      }
    });
    const [{ count }] = await client`select count(*)::int as count from bible_verse where translation='GAE' and book='jos'`;
    console.log(`적재 완료: bible_verse ${count}행. 이제 BIBLE_PROVIDER=db 로 바꾸세요.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
