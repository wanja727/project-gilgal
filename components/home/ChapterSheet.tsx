"use client";

import { useEffect, useRef } from "react";
import { JourneyMap } from "@/components/map/JourneyMap";
import { ButtonLink, buttonClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import type { JourneyDay } from "@/lib/journey/days";
import { cropAround } from "@/lib/journey/locations";
import type { ChapterStatus, MapView } from "@/lib/journey/mapState";

const EMPTY_VIEW: MapView = { walked: [], ahead: [], visited: [], me: null, flag: null, canaanFilled: true };

/** 진행도 칸을 눌렀을 때 아래에서 올라오는 장 정보 시트 (장소 지도 조각·날짜·상태·읽기 버튼) */
export function ChapterSheet({
  day,
  status,
  isFlag,
  onClose,
}: {
  day: JourneyDay;
  status: ChapterStatus;
  isFlag: boolean;
  onClose: () => void;
}) {
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

  const openDate = formatDate(day.readingDate);
  const stateLabel =
    status === "done" ? "읽음" : status === "open" ? (isFlag ? "오늘의 장" : "오늘까지 읽을 장") : `${openDate}에 열려요`;

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-small font-semibold text-mute">
              {JOSHUA_2026.book.name} {day.chapter}장
            </p>
            <h2 id="chapter-sheet-title" className="mt-1 font-serif text-[24px] font-bold tracking-[-0.04em] text-main">
              {day.title}
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-chip px-2.5 py-[5px] text-caption font-bold whitespace-nowrap ${
              status === "done" ? "bg-main text-white" : "bg-soft text-main"
            }`}
          >
            {stateLabel}
          </span>
        </div>
        <div className="mt-4 h-[150px] overflow-hidden rounded-tile shadow-[inset_0_0_0_1px_var(--color-line)]">
          <JourneyMap
            view={EMPTY_VIEW}
            focus={day.site}
            crop={cropAround(day.site, 220, 110)}
            labels={false}
            ariaLabel={`${day.chapter}장의 장소: ${day.place}`}
          />
        </div>
        <div className="mx-0.5 mt-3.5 flex justify-between text-small text-mute">
          <span>{day.place}</span>
          <span>{formatDate(day.readingDate, true)}</span>
        </div>
        <div className="mt-4">
          {status === "done" ? (
            <ButtonLink href={`/day/${day.day}`} variant="line">
              {day.chapter}장 다시 읽기
            </ButtonLink>
          ) : status === "open" ? (
            <ButtonLink href={`/day/${day.day}`}>{day.chapter}장 읽기</ButtonLink>
          ) : (
            <button type="button" disabled className={buttonClass("quiet")}>
              {openDate}에 열려요
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
