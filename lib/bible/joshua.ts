/**
 * 여호수아 장별 절 수 — 번역문이 아닌 메타데이터(저작물 아님).
 * 본문 적재·검증 시 이 값과 대조한다. 총 658절.
 */
export const JOSHUA_VERSE_COUNTS = [
  18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33,
] as const;

export function verseCountOf(chapter: number): number {
  const n = JOSHUA_VERSE_COUNTS[chapter - 1];
  if (n === undefined) throw new Error(`여호수아 ${chapter}장은 없습니다`);
  return n;
}

/** 개역개정 공식 표기 (허락 조건에서 다른 문구를 요구하면 여기만 바꾼다) */
export const GAE_ATTRIBUTION = "성경전서 개역개정판 © 대한성서공회 1998";
