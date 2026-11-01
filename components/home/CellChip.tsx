"use client";

import { flashLift } from "@/components/motion/flashLift";
import { CELL_CARD_ID } from "./CellCard";

/**
 * 홈 오른쪽 위 셀 이름: 누르면 아래 셀 카드로 스크롤하고, 도착하면 카드가 한 번 살짝 떠올랐다 내려앉아 어디인지 알린다(2026-10-29).
 * 셀 전용 화면은 두지 않는다 — 셀원·도착 여부는 셀 카드에 이미 있다.
 * 전역 scroll-behavior 를 켜면 페이지 이동 스크롤까지 부드러워져 여기서만 smooth 로 움직인다.
 */
export function CellChip({ cellName }: { cellName: string }) {
  return (
    <a
      href={`#${CELL_CARD_ID}`}
      onClick={(e) => {
        const card = document.getElementById(CELL_CARD_ID);
        if (!card) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // 스크롤이 끝난 뒤에 반짝인다 — 이미 그 자리(페이지 끝 등)면 바로, scrollend 를 모르는 브라우저는 시간으로
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const target = Math.min(window.scrollY + card.getBoundingClientRect().top - 16, max);
        const moves = Math.abs(target - window.scrollY) > 2;
        let done = false;
        const once = () => {
          if (done) return;
          done = true;
          flashLift(card);
        };
        card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        if (!moves || reduce) once();
        else {
          window.addEventListener("scrollend", once, { once: true });
          setTimeout(once, 900);
        }
      }}
      className="rounded-chip bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-mute"
    >
      {cellName}
    </a>
  );
}
