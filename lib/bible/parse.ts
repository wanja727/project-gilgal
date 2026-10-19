import { JOSHUA_VERSE_COUNTS } from "./joshua";
import type { FlatVerse } from "./sections";

/**
 * 운영자가 제공한 본문 텍스트 파일을 읽는다(scripts/load-bible.ts).
 * 한 줄에 한 절, 다음 형식을 받는다.
 *
 *   수1:1 <여호와께서 여호수아에게 명령하시다> 여호와의 종 모세가 죽은 후에 …
 *   여호수아 1:2 이제 …
 *   1:3 …
 *
 * - 책 이름 접두어(수/여호수아)는 있어도 없어도 된다.
 * - 절 앞의 <…> 는 그 절에서 시작하는 소제목으로 본다.
 * - 빈 줄과 # 으로 시작하는 줄은 무시한다.
 */
const LINE_RE = /^(?:수|여호수아)?\s*(\d{1,2})\s*[:장]\s*(\d{1,3})\s*절?\s+(.*)$/;
const HEADING_RE = /^<([^>]+)>\s*/;

export type ParsedChapter = { chapter: number; verses: FlatVerse[] };

export function parseBibleText(text: string): ParsedChapter[] {
  const chapters = new Map<number, FlatVerse[]>();
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const m = LINE_RE.exec(line);
    if (!m) throw new Error(`${i + 1}행: "장:절 본문" 형식이 아닙니다`);
    const chapter = Number(m[1]);
    const number = Number(m[2]);
    let body = m[3].trim();
    let heading: string | undefined;
    const h = HEADING_RE.exec(body);
    if (h) {
      heading = h[1].trim();
      body = body.slice(h[0].length).trim();
    }
    if (!body) throw new Error(`${i + 1}행: 본문이 비어 있습니다`);
    const list = chapters.get(chapter) ?? [];
    list.push({ number, heading, text: body });
    chapters.set(chapter, list);
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
