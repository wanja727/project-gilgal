import { JOSHUA_VERSE_COUNTS } from "./joshua";
import type { FlatVerse } from "./sections";

/**
 * 운영자가 제공한 본문 텍스트 파일을 읽는다(scripts/load-bible.ts). 두 형식을 받는다.
 *
 * A. 한 줄에 장:절이 함께 있는 형식
 *   수1:1 <여호와께서 여호수아에게 명령하시다> 여호와의 종 모세가 죽은 후에 …
 *   여호수아 1:2 이제 …
 *   - 책 이름 접두어(수/여호수아)는 있어도 없어도 된다. 절 앞의 <…> 는 소제목.
 *
 * B. 장 머리 + 소제목 줄 + 절 번호 줄 (성경 사이트에서 복사한 형태)
 *   제 1 장
 *   여호와께서 여호수아에게 말씀하시다      ← 숫자로 시작하지 않는 줄 = 다음 절의 소제목
 *   1   여호와의 종 모세가 죽은 후에 …
 *
 * 공통: 빈 줄과 # 으로 시작하는 줄은 무시한다. 본문 속 각주 표시("1)규빗"의 "1)")는 지운다.
 */
const FULL_LINE_RE = /^(?:수|여호수아)?\s*(\d{1,2})\s*[:장]\s*(\d{1,3})\s*절?\s+(.*)$/;
const CHAPTER_RE = /^제\s*(\d{1,2})\s*장$/;
const VERSE_RE = /^(\d{1,3})\s+(.*)$/;
const HEADING_RE = /^<([^>]+)>\s*/;
// 각주 표시: 숫자+")" 바로 뒤에 한글이 오는 경우만 (소제목의 "(삿 1:11-15)" 같은 참조는 남긴다)
const FOOTNOTE_RE = /(^|[^\d:\-(])\d{1,2}\)(?=[가-힣])/g;

export type ParsedChapter = { chapter: number; verses: FlatVerse[] };

function cleanText(text: string): string {
  return text.replace(FOOTNOTE_RE, "$1").replace(/\s+/g, " ").trim();
}

export function parseBibleText(text: string): ParsedChapter[] {
  const chapters = new Map<number, FlatVerse[]>();
  const push = (chapter: number, verse: FlatVerse) => {
    const list = chapters.get(chapter) ?? [];
    list.push(verse);
    chapters.set(chapter, list);
  };
  let currentChapter: number | null = null;
  let pendingHeading: string | undefined;

  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;

    const chapterHead = CHAPTER_RE.exec(line);
    if (chapterHead) {
      currentChapter = Number(chapterHead[1]);
      pendingHeading = undefined;
      return;
    }

    const full = FULL_LINE_RE.exec(line);
    if (full && currentChapter === null) {
      let body = full[3].trim();
      let heading: string | undefined;
      const h = HEADING_RE.exec(body);
      if (h) {
        heading = h[1].trim();
        body = body.slice(h[0].length);
      }
      body = cleanText(body);
      if (!body) throw new Error(`${i + 1}행: 본문이 비어 있습니다`);
      push(Number(full[1]), { number: Number(full[2]), heading, text: body });
      return;
    }

    if (currentChapter === null) throw new Error(`${i + 1}행: "장:절 본문" 형식이 아닙니다`);

    const verse = VERSE_RE.exec(line);
    if (verse) {
      const body = cleanText(verse[2]);
      if (!body) throw new Error(`${i + 1}행: 본문이 비어 있습니다`);
      push(currentChapter, { number: Number(verse[1]), heading: pendingHeading, text: body });
      pendingHeading = undefined;
      return;
    }

    // 숫자로 시작하지 않는 줄 = 소제목
    if (pendingHeading) throw new Error(`${i + 1}행: 소제목이 연달아 나옵니다`);
    pendingHeading = cleanText(line);
  });
  return [...chapters.entries()]
    .sort(([a], [b]) => a - b)
    .map(([chapter, verses]) => ({ chapter, verses: verses.sort((a, b) => a.number - b.number) }));
}

/** 24장 존재, 장별 절 수 일치, 절 번호 연속을 검사한다. 문제 목록을 돌려준다(없으면 빈 배열). */
export function validateJoshua(chapters: ParsedChapter[]): string[] {
  const problems: string[] = [];
  const byChapter = new Map(chapters.map((c) => [c.chapter, c.verses]));
  JOSHUA_VERSE_COUNTS.forEach((expected, idx) => {
    const ch = idx + 1;
    const verses = byChapter.get(ch);
    if (!verses) {
      problems.push(`${ch}장 없음`);
      return;
    }
    if (verses.length !== expected) problems.push(`${ch}장 절 수 ${verses.length} (기대 ${expected})`);
    verses.forEach((v, i) => {
      if (v.number !== i + 1) problems.push(`${ch}장 ${i + 1}번째 줄의 절 번호가 ${v.number}`);
    });
  });
  for (const c of chapters) {
    if (c.chapter < 1 || c.chapter > JOSHUA_VERSE_COUNTS.length) problems.push(`알 수 없는 장 ${c.chapter}`);
  }
  return problems;
}
