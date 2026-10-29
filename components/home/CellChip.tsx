"use client";

import { CELL_CARD_ID } from "./CellCard";

/**
 * 홈 오른쪽 위 셀 이름: 누르면 아래 셀 카드로 스크롤한다(2026-10-29).
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
        card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }}
      className="rounded-chip bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-mute"
    >
      {cellName}
    </a>
  );
}
