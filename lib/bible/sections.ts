import type { Section } from "./types";

export type FlatVerse = { number: number; heading?: string | null; text: string };

/** 절 목록(소제목은 해당 절 앞에 붙음)을 소제목 단위 묶음으로 바꾼다 */
export function groupSections(verses: FlatVerse[]): Section[] {
  const sections: Section[] = [];
  for (const v of verses) {
    if (sections.length === 0 || v.heading) {
      sections.push(v.heading ? { heading: v.heading, verses: [] } : { verses: [] });
    }
    sections[sections.length - 1].verses.push({ number: v.number, text: v.text });
  }
  return sections;
}
