"use client";

import { useEffect, useRef, useState } from "react";
import {
  READER_COOKIE,
  READER_COOKIE_MAX_AGE,
  READER_FONTS,
  READER_LEADINGS,
  READER_SIZES,
  READER_THEMES,
  READER_WEIGHTS,
  readerCssVars,
  type ReaderSettings,
  serializeReaderSettings,
} from "@/lib/reading/settings";

/** 본문 화면을 감싼 요소 — 서버가 쿠키 설정으로 그려 두고, 바꾸면 여기에 바로 반영한다 */
export const READER_ROOT_ID = "reader-root";

function applyToPage(s: ReaderSettings) {
  const root = document.getElementById(READER_ROOT_ID);
  if (!root) return;
  root.dataset.readerTheme = s.theme;
  for (const [k, v] of Object.entries(readerCssVars(s))) root.style.setProperty(k, v);
}

function save(s: ReaderSettings) {
  try {
    document.cookie = `${READER_COOKIE}=${encodeURIComponent(serializeReaderSettings(s))}; path=/; max-age=${READER_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    /* 쿠키를 못 쓰면 이번 화면에서만 적용 */
  }
}

/**
 * 읽기 설정 버튼: 글자 크기 · 글꼴 · 굵기 · 줄 간격 · 배경.
 * 이 기기의 쿠키에 저장한다(편의 설정이라 DB 에 두지 않는다). 초기값은 서버가 읽은 쿠키 값.
 */
export function ReaderSettingsButton({ initial }: { initial: ReaderSettings }) {
  const [s, setS] = useState(initial);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const update = (patch: Partial<ReaderSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    applyToPage(next);
    save(next);
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label="읽기 설정"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full text-main"
      >
        <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 18l5-12 5 12M5.8 14h6.4M15 18l3-7 3 7M15.8 16h4.4" />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="읽기 설정"
          className="absolute top-12 right-0 z-20 w-[min(296px,calc(100vw-24px))] space-y-3.5 rounded-tile bg-surface p-4 shadow-[0_8px_28px_-8px_rgba(10,14,22,0.35)]"
        >
          <Row label="글자 크기">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => update({ size: s.size - 1 })}
                disabled={s.size === 0}
                aria-label="글자 작게"
                className="grid size-10 place-items-center rounded-[12px] bg-soft text-small font-bold text-main disabled:text-mid"
              >
                가
              </button>
              <span className="w-11 text-center text-caption text-mute tabular-nums" aria-live="polite">
                {READER_SIZES[s.size]}
              </span>
              <button
                type="button"
                onClick={() => update({ size: s.size + 1 })}
                disabled={s.size === READER_SIZES.length - 1}
                aria-label="글자 크게"
                className="grid size-10 place-items-center rounded-[12px] bg-soft text-[19px] font-bold text-main disabled:text-mid"
              >
                가
              </button>
            </div>
          </Row>
          <Row label="글꼴">
            <Segmented options={READER_FONTS} value={s.font} onChange={(font) => update({ font })} label="글꼴" />
          </Row>
          <Row label="굵기">
            <Segmented options={READER_WEIGHTS} value={s.weight} onChange={(weight) => update({ weight })} label="굵기" />
          </Row>
          <Row label="줄 간격">
            <Segmented options={READER_LEADINGS} value={s.leading} onChange={(leading) => update({ leading })} label="줄 간격" />
          </Row>
          <Row label="배경">
            <div role="radiogroup" aria-label="배경" className="flex gap-2">
              {(Object.keys(READER_THEMES) as ReaderSettings["theme"][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={s.theme === t}
                  onClick={() => update({ theme: t })}
                  data-reader-theme={t}
                  className={`h-10 w-[54px] rounded-[12px] border bg-bg text-caption font-semibold text-text ${
                    s.theme === t ? "border-main ring-2 ring-main" : "border-line"
                  }`}
                >
                  {READER_THEMES[t]}
                </button>
              ))}
            </div>
          </Row>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-small font-semibold text-mute">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[12px] bg-soft p-[3px]">
      {(Object.keys(options) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={`h-9 min-w-[52px] rounded-[9px] px-2.5 text-small font-semibold ${
            value === k ? "bg-surface text-main shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-mute"
          }`}
        >
          {options[k]}
        </button>
      ))}
    </div>
  );
}
