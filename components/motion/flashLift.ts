/**
 * 눌러서 찾아간 카드를 알린다: 한 번, 살짝 떠올랐다 내려앉으며 옅은 파랑으로 물든다(app/globals.css `.flash-lift`).
 * 셀 이름 → 셀 카드, 홈 나눔 말풍선 → 장 본문 아래 그 나눔이 모두 이것 하나로 강조된다 — 찾아간 곳을 알리는 방식을 하나로.
 */
export function flashLift(el: HTMLElement) {
  el.classList.remove("flash-lift");
  void el.offsetWidth; // 연달아 눌러도 처음부터 다시 반짝이게
  el.classList.add("flash-lift");
  el.addEventListener("animationend", () => el.classList.remove("flash-lift"), { once: true });
}
