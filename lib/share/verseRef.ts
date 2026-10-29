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

/**
 * 이미 고른 절을 다시 누르면 그 절만 뺀다. 범위 끝 절이면 범위를 줄이고("16:1-3" − 3절 → "16:1-2"),
 * 가운데 절이면 둘로 나누고("16:1-3" − 2절 → "16:1 16:3"), 한 절짜리면 표기를 지운다(앞뒤 띄어쓰기 한 칸 정리).
 */
export function removeVerse(text: string, chapter: number, verse: number): string {
  const parts = splitVerseRefs(text);
  let out = "";
  let dropSpace = false;
  for (const s of parts) {
    if (!s.ref) {
      out += dropSpace ? s.text.replace(/^[ 	]/, "") : s.text;
      dropSpace = false;
      continue;
    }
    const { from, to } = s.ref;
    if (s.ref.chapter !== chapter || verse < from || verse > to) {
      out += s.text;
      continue;
    }
    const left = verse > from ? formatVerseRef({ chapter, from, to: verse - 1 }) : "";
    const right = verse < to ? formatVerseRef({ chapter, from: verse + 1, to }) : "";
    const rest = [left, right].filter(Boolean).join(" ");
    out += rest;
    // 표기가 통째로 빠지면 앞(이미 띄어쓴 경우)이나 뒤의 띄어쓰기 한 칸을 같이 뺀다
    dropSpace = !rest && (out === "" || /\s$/.test(out));
  }
  return out;
}

/** 띄어쓰기만 사이에 두고 이어지는 같은 장 구절을 하나로("16:4 16:5-6" → "16:4-6") */
function mergeAdjacent(text: string): string {
  const re = /(?<![\d:])(\d{1,2}):(\d{1,3})(?:-(\d{1,3}))?[ 	]+(\d{1,2}):(\d{1,3})(?:-(\d{1,3}))?(?![\d:])/g;
  let prev: string;
  do {
    prev = text;
    text = text.replace(re, (all, c1, a1, b1, c2, a2, b2) => {
      const r1 = { chapter: Number(c1), from: Number(a1), to: Number(b1 ?? a1) };
      const r2 = { chapter: Number(c2), from: Number(a2), to: Number(b2 ?? a2) };
      if (r1.chapter !== r2.chapter || r2.from !== r1.to + 1) return all;
      const merged = { chapter: r1.chapter, from: r1.from, to: r2.to };
      return isValidVerseRef(merged) ? formatVerseRef(merged) : all;
    });
  } while (text !== prev);
  return text;
}

function clamp(head: string, after: string, maxLength: number) {
  const joined = (head + after).slice(0, maxLength);
  const text = mergeAdjacent(joined);
  // 합쳐서 줄어든 만큼 커서를 당긴다(합쳐지는 건 커서 바로 앞 구절뿐)
  const caret = Math.max(0, Math.min(head.length, joined.length) - (joined.length - text.length));
  return { text, caret };
}
