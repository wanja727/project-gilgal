/**
 * 홈 'ㄹ' 진행도 연출(2026-10-30): 이 기기에서 마지막으로 본 진행도를 쿠키에 남겨 두고, 다음에 홈을 열 때
 * - 그새 더 걸었으면(이어 읽은 장이 늘었으면) 아바타가 그 칸까지 한 칸씩 걸어간다("step")
 * - 오늘 처음 보는 거면 1장부터 걸은 길이 쭉 그려진다("intro")
 * - 그 밖에는 그대로 보여 준다("none")
 * 서버가 쿠키로 미리 정해 첫 화면부터 "걷기 전" 모습으로 그린다 — 그려진 길이 사라졌다 다시 그려지는 깜빡임이 없게.
 * 사용자 id 대신 아바타 seed 로 같은 사람인지 본다(클라이언트로 식별자를 보내지 않게).
 */

export const PATH_SEEN_COOKIE = "gilgal_path";
/** 60일 — 여정 기간보다 넉넉하게 */
export const PATH_SEEN_MAX_AGE = 60 * 24 * 60 * 60;

export type PathMotion = { kind: "none" } | { kind: "intro" } | { kind: "step"; from: number };

type Seen = { seed: string; position: number; date: string };

/** "seed.position.YYYY-MM-DD" — seed 에 점이 있어도 뒤에서부터 나눈다 */
export function formatPathSeen(seen: Seen): string {
  return `${seen.seed}.${seen.position}.${seen.date}`;
}

export function parsePathSeen(value: string | undefined): Seen | null {
  if (!value) return null;
  const m = /^(.+)\.(\d{1,2})\.(\d{4}-\d{2}-\d{2})$/.exec(value);
  return m ? { seed: m[1], position: Number(m[2]), date: m[3] } : null;
}

export function pathMotion(value: string | undefined, seed: string, position: number, today: string): PathMotion {
  const seen = parsePathSeen(value);
  // 다른 사람이 쓰던 기기거나 처음 보는 기기: 오늘의 첫 연출로
  if (!seen || seen.seed !== seed) return { kind: "intro" };
  if (seen.position < position) return { kind: "step", from: seen.position };
  return seen.date === today ? { kind: "none" } : { kind: "intro" };
}
