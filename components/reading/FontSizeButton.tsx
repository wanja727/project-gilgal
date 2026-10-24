"use client";

import { useEffect, useRef, useState } from "react";

const SIZES = [15.5, 17.5, 19.5, 21.5] as const;
const DEFAULT_IDX = 1;
const STORAGE_KEY = "gilgal:font-size";

function apply(idx: number) {
  document.documentElement.style.setProperty("--verse-size", `${SIZES[idx]}px`);
}

/**
 * 본문 글자 크기. 이 기기에만 저장한다(편의 기능이라 저장 실패해도 동작에 지장 없음).
 * 본문은 CSS 변수 --verse-size 를 읽으므로 본문 컴포넌트는 서버에서 그대로 렌더링된다.
 */
export function FontSizeButton() {
  const [idx, setIdx] = useState(DEFAULT_IDX);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let saved = DEFAULT_IDX;
    try {
      const v = Number(localStorage.getItem(STORAGE_KEY));
      if (Number.isInteger(v) && v >= 0 && v < SIZES.length) saved = v;
    } catch {
      /* 저장소 접근 불가 — 기본 크기 */
    }
    apply(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 설정은 마운트 후에만 읽을 수 있다
    setIdx(saved);
    return () => {
      document.documentElement.style.removeProperty("--verse-size");
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const change = (delta: number) => {
    const next = Math.min(SIZES.length - 1, Math.max(0, idx + delta));
    setIdx(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* 무시 */
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="글자 크기"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full text-main"
      >
        <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 18l5-12 5 12M5.8 14h6.4M15 18l3-7 3 7M15.8 16h4.4" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-12 right-0 z-20 flex items-center gap-1 rounded-btn bg-surface p-1.5 shadow-[0_6px_20px_-6px_rgba(10,14,22,0.25)]">
          <button
            type="button"
            onClick={() => change(-1)}
            disabled={idx === 0}
            aria-label="글자 작게"
            className="grid size-11 place-items-center rounded-[12px] text-small font-bold text-main disabled:text-mid"
          >
            가
          </button>
          <span className="w-10 text-center text-caption text-mute tabular-nums" aria-live="polite">
            {SIZES[idx]}
          </span>
          <button
            type="button"
            onClick={() => change(1)}
            disabled={idx === SIZES.length - 1}
            aria-label="글자 크게"
            className="grid size-11 place-items-center rounded-[12px] text-[19px] font-bold text-main disabled:text-mid"
          >
            가
          </button>
        </div>
      )}
    </div>
  );
}
