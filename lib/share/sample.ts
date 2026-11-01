/**
 * 홈 나눔 말풍선에 올릴 나눔 고르기(2026-11-01).
 * 최신순 그대로 보여 주면 홈을 열 때마다 첫 묶음(가장 최근 몇 개)만 보이고, 나눔이 적은 아침엔 먼저 쓴 사람이 하루 종일 맨 앞에 남는다.
 * 그래서 최근 나눔 여럿 중에서 몇 개를 무작위로 골라 섞는다 — 홈을 열 때마다 다른 사람이 먼저 보이게.
 */
export function sampleShares<T>(pool: readonly T[], n: number, random: () => number = Math.random): T[] {
  const a = [...pool];
  const k = Math.min(n, a.length);
  // 앞에서부터 k 칸만 섞는 Fisher–Yates — 고른 k 개가 곧 무작위 순서다
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}
