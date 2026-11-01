/**
 * 눌러서 찾아간 카드를 알린다: 한 번, 살짝 떠올랐다 내려앉으며 옅은 파랑으로 물든다(app/globals.css `.flash-lift`).
 * 셀 이름 → 셀 카드, 홈 나눔 말풍선 → 장 본문 아래 그 나눔이 모두 이것 하나로 강조된다 — 찾아간 곳을 알리는 방식을 하나로.
 */
export function flashLift(el: HTMLElement) {
  el.classList.remove("flash-lift");
  void el.offsetWidth; // 연달아 눌러도 처음부터 다시 반짝이게
  el.classList.add("flash-lift");
  // 안쪽 연출(셀원이 톡 떠오르기 등)의 animationend 도 올라온다 — 그걸 받고 지우면 떠오른 카드가 중간에 툭 내려앉는다
  const done = (e: AnimationEvent) => {
    if (e.target !== el || e.animationName !== "flash-lift") return;
    el.classList.remove("flash-lift");
    el.removeEventListener("animationend", done);
  };
  el.addEventListener("animationend", done);
}
