/**
 * 앞서 간 동행자의 한마디(ADR-028) — 서버 검증과 입력창 글자 수 표시가 함께 쓴다.
 * 말풍선 한 줄이라 줄바꿈 없이 한 줄로 모은다.
 */
export const TRAIL_NOTE_MAX_LENGTH = 40;

export function normalizeNote(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.replace(/\s+/g, " ").trim();
  return s ? s : null;
}
