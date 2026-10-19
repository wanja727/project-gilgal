"use client";

import { useEffect, useState } from "react";
import type { ChapterText } from "@/lib/bible/types";

const SIZES = [15, 17, 19, 21] as const;
const STORAGE_KEY = "gilgal:font-size";

/**
 * 장·절 구분 본문 (architecture 8.5). ChapterText 만 보고 렌더링하므로 Provider 와 무관하다.
 * 글자 크기는 이 기기에만 저장한다(편의 기능이라 저장 실패해도 동작에 지장 없음).
 */
export function ChapterReader({ text }: { text: ChapterText }) {
  const [sizeIdx, setSizeIdx] = useState(1);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 설정은 마운트 후에만 읽을 수 있다
      if (saved >= 0 && saved < SIZES.length) setSizeIdx(saved);
    } catch {
      /* 저장소 접근 불가 — 기본 크기 사용 */
    }
  }, []);

  const changeSize = (delta: number) => {
    const next = Math.min(SIZES.length - 1, Math.max(0, sizeIdx + delta));
    setSizeIdx(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* 무시 */
    }
  };

  return (
    <article>
      <div className="mb-4 flex items-center justify-between">
        {text.source === "mock" ? (
          <span className="rounded-full bg-clay/15 px-2.5 py-1 text-[11px] font-medium text-clay">
            Mock 본문 · 실제 성경 본문이 아닙니다
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 text-ink-soft" aria-label="글자 크기">
          <button
            type="button"
            onClick={() => changeSize(-1)}
            disabled={sizeIdx === 0}
            className="h-8 w-8 rounded-full border border-line text-xs disabled:opacity-40"
            aria-label="글자 작게"
          >
            가
          </button>
          <button
            type="button"
            onClick={() => changeSize(1)}
            disabled={sizeIdx === SIZES.length - 1}
            className="h-8 w-8 rounded-full border border-line text-base disabled:opacity-40"
            aria-label="글자 크게"
          >
            가
          </button>
        </div>
      </div>

      <div className="font-serif text-ink" style={{ fontSize: SIZES[sizeIdx], lineHeight: 1.85 }}>
        {text.sections.map((section, i) => (
          <section key={i} className="mb-6">
            {section.heading && (
              <h3 className="mb-2 font-sans text-[13px] font-semibold tracking-wide text-olive">
                {section.heading}
              </h3>
            )}
            <p>
              {section.verses.map((v) => (
                <span key={v.number}>
                  <sup className="mr-1 font-sans text-[0.62em] font-semibold text-mist">{v.number}</sup>
                  {v.text}{" "}
                </span>
              ))}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-2 border-t border-line pt-3 text-[11px] text-stone">{text.attribution}</p>
    </article>
  );
}
