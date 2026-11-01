"use client";

import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import type { JourneyDay } from "@/lib/journey/days";

/**
 * 아직 열리지 않은 장을 진행도에서 눌렀을 때만 뜨는 작은 시트: 언제 열리는지.
 * 장 제목·장소는 그날 열린다(2026-11-01) — 여호수아도 갈 길을 다 알고 걷지 않았다.
 * 열린 장은 시트 없이 본문으로 바로 가고, 장 소개(지도·요약)는 본문 맨 위에서만 보여 준다(2026-10-26).
 */
export function ChapterSheet({ day, onClose }: { day: JourneyDay; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 mx-auto max-w-md">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-scrim animate-[rise_.2s_ease-out]" onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-sheet-title"
        tabIndex={-1}
        className="absolute inset-x-2 bottom-2 rounded-sheet bg-surface px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),26px)] outline-none animate-[rise_.35s_var(--ease-sheet)]"
      >
        <div className="mx-auto mb-4 h-[5px] w-9 rounded-full bg-line" aria-hidden />
        <p className="text-small font-semibold text-mute">
          {JOSHUA_2026.book.name} {day.chapter}장
        </p>
        <h2 id="chapter-sheet-title" className="mt-1 font-serif text-[24px] font-bold tracking-[-0.04em] text-main">
          아직 열리지 않은 길
        </h2>
        <p className="mt-2 text-body text-mute">
          {formatDate(day.readingDate, true)}에 어디로 가는지 열려요. 그날 공동체와 함께 걸어요.
        </p>
        <button type="button" onClick={onClose} className={buttonClass("quiet", "mt-5")}>
          닫기
        </button>
      </div>
    </div>
  );
}
