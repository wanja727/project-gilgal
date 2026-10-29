/**
 * 나눔 속 구절 표기("4:3", "16:1-2"). 서버(본문 팝업 검증)와 클라이언트(입력창·나눔 카드)가 함께 쓴다.
 * 여호수아 한 권만 다루므로 책 이름 없이 "장:절" 만 쓴다.
 */

export type VerseRef = { chapter: number; from: number; to: number };

export const MAX_CHAPTER = 24;
/** 한 번에 펼쳐 보는 절 수 — 장 전체를 통째로 띄우는 표기는 받지 않는다 */
export const MAX_RANGE = 30;

export function formatVerseRef({ chapter, from, to }: VerseRef): string {
  return from === to ? `${chapter}:${from}` : `${chapter}:${from}-${to}`;
}

export function isValidVerseRef(r: VerseRef): boolean {
  return (
    Number.isInteger(r.chapter) &&
    Number.isInteger(r.from) &&
    Number.isInteger(r.to) &&
    r.chapter >= 1 &&
    r.chapter <= MAX_CHAPTER &&
    r.from >= 1 &&
    r.from <= r.to &&
    r.to - r.from < MAX_RANGE
  );
}

// 숫자 사이에 끼인 표기(예: 시간 "12:30:15", 날짜 "2026-10")는 잡지 않도록 앞뒤가 숫자·콜론이 아니어야 한다
const REF_RE = /(?<![\d:])(\d{1,2}):(\d{1,3})(?:[-~](\d{1,3}))?(?![\d:])/g;

export type RefSegment = { text: string; ref?: VerseRef };

/** 나눔 내용을 글자·구절 조각으로 나눈다. 장 범위 밖·거꾸로 된 범위는 그냥 글자로 둔다 */
export function splitVerseRefs(content: string): RefSegment[] {
  const out: RefSegment[] = [];
  let last = 0;
  for (const m of content.matchAll(REF_RE)) {
    const ref = { chapter: Number(m[1]), from: Number(m[2]), to: Number(m[3] ?? m[2]) };
    if (!isValidVerseRef(ref)) continue;
    if (m.index > last) out.push({ text: content.slice(last, m.index) });
    out.push({ text: m[0], ref });
    last = m.index + m[0].length;
  }
  if (last < content.length) out.push({ text: content.slice(last) });
  return out;
}

/** 쓰는 중인 글에서 이 장의 어느 절을 가리키고 있는지 — 본문에서 고른 절을 표시할 때 */
export function referencedVerses(content: string, chapter: number): Set<number> {
  const set = new Set<number>();
  for (const s of splitVerseRefs(content)) {
    if (s.ref?.chapter !== chapter) continue;
    for (let v = s.ref.from; v <= s.ref.to; v++) set.add(v);
  }
  return set;
}

/**
 * 입력창에서 절을 눌렀을 때 커서 자리에 구절을 넣는다.
 * 커서 바로 앞이 같은 장의 구절이고 누른 절이 그 바로 앞·뒤 절이면 범위로 늘린다("16:1" + 2절 → "16:1-2").
 * 이미 그 범위 안의 절이면 그대로 둔다.
 */
export function insertVerse(
  text: string,
  caret: number,
  chapter: number,
  verse: number,
  maxLength: number,
): { text: string; caret: number } {
  const at = Math.min(Math.max(caret, 0), text.length);
  const before = text.slice(0, at);
  const after = text.slice(at);
  // 뒤에 이미 띄어쓰기가 있으면 한 칸만 남게
  const gap = /^\s/.test(after) ? "" : " ";
  const m = /(?<![\d:])(\d{1,2}):(\d{1,3})(?:-(\d{1,3}))?(\s*)$/.exec(before);
  if (m && Number(m[1]) === chapter) {
    const from = Number(m[2]);
    const to = Number(m[3] ?? m[2]);
    if (verse >= from && verse <= to) return { text, caret: at };
    const next = verse === to + 1 ? { chapter, from, to: verse } : verse === from - 1 ? { chapter, from: verse, to } : null;
    if (next && isValidVerseRef(next)) {
      const head = `${before.slice(0, m.index)}${formatVerseRef(next)}${gap}`;
      return clamp(head, after, maxLength);
    }
  }
  const head = `${before}${before && !/\s$/.test(before) ? " " : ""}${formatVerseRef({ chapter, from: verse, to: verse })}${gap}`;
  return clamp(head, after, maxLength);
}

function clamp(head: string, after: string, maxLength: number) {
  const text = (head + after).slice(0, maxLength);
  return { text, caret: Math.min(head.length, text.length) };
}
