/**
 * 방금 남긴 나눔 표시(2026-10-30). 남기기에 성공하면 시각을 적어 두고, 새로고침으로 목록에 새로 그려지는 내 나눔 카드가
 * 이 시각이 가까우면 위에서 내려앉으며 옅게 물들었다 빠진다 — "올라갔다"는 걸 눈으로 확인하게.
 * 페이지를 처음 열 때(하이드레이션)는 0이라 기존 카드는 움직이지 않는다.
 */
let postedAt = 0;
const WINDOW_MS = 10_000;

export function markJustPosted() {
  postedAt = Date.now();
}

export function isJustPosted() {
  return postedAt > 0 && Date.now() - postedAt < WINDOW_MS;
}
