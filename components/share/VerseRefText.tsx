"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getVersesAction, type VersesResult } from "@/app/actions/bible";
import { buttonClass } from "@/components/ui";
import { parseReaderSettings, READER_COOKIE, readerCssVars } from "@/lib/reading/settings";
import { formatVerseRef, splitVerseRefs, type VerseRef } from "@/lib/share/verseRef";

/** 나눔 내용 — "16:1-2" 같은 구절 표기를 누르면 그 절 본문을 시트로 보여 준다(2026-10-29) */
export function VerseRefText({ content, className = "" }: { content: string; className?: string }) {
  const [open, setOpen] = useState<VerseRef | null>(null);

  return (
    <>
      <p className={className}>
        {splitVerseRefs(content).map((s, i) =>
          s.ref ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(s.ref!)}
              aria-haspopup="dialog"
              aria-label={`여호수아 ${formatVerseRef(s.ref)} 본문 보기`}
              className="rounded-[6px] bg-soft px-1 font-semibold text-main underline decoration-dotted underline-offset-[3px]"
            >
              {s.text}
            </button>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      {open && <VerseSheet verseRef={open} onClose={() => setOpen(null)} />}
    </>
  );
}

const MESSAGES: Record<Exclude<VersesResult["status"], "ok">, string> = {
  invalid: "본문에서 찾을 수 없는 구절이에요.",
  locked: "아직 열리지 않은 장이에요. 그날 함께 읽어요.",
  unavailable: "본문을 준비하고 있어요.",
};

/**
 * 본문 화면에서 고른 읽기 설정(글자 크기·글꼴·굵기·줄 간격)을 시트 본문에도 — 쿠키(ADR-026)를 읽어 같은 CSS 변수로.
 * 시트는 누른 뒤에만 그려지므로(서버 렌더 없음) 여기서 document.cookie 를 읽어도 어긋나지 않는다.
 */
function readerVarsFromCookie(): React.CSSProperties {
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${READER_COOKIE}=`))
    ?.slice(READER_COOKIE.length + 1);
  let value: string | undefined;
  try {
    value = raw ? decodeURIComponent(raw) : undefined;
  } catch {
    value = undefined;
  }
  return readerCssVars(parseReaderSettings(value)) as React.CSSProperties;
}

/** 구절 본문 시트 — 나눔 카드의 구절 표기, 입력창의 고른 구절 칩이 함께 쓴다 */
export function VerseSheet({ verseRef, onClose }: { verseRef: VerseRef; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [readerVars] = useState(readerVarsFromCookie);
  const [result, setResult] = useState<VersesResult | null>(null);

  useEffect(() => {
    let alive = true;
    getVersesAction(verseRef)
      .then((r) => alive && setResult(r))
      .catch(() => alive && setResult({ status: "unavailable" }));
    return () => {
      alive = false;
    };
  }, [verseRef]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  const title = `여호수아 ${formatVerseRef(verseRef)}`;
  // 이미 그 장 본문 화면이면 이동 버튼은 두지 않는다
  const goTo = result?.status === "ok" && pathname !== `/day/${result.dayNo}` ? `/day/${result.dayNo}` : null;

  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-md">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-scrim animate-[rise_.2s_ease-out]" onClick={onClose} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-x-2 bottom-2 flex max-h-[75dvh] flex-col rounded-sheet bg-surface px-5 pt-2.5 pb-[max(env(safe-area-inset-bottom),22px)] outline-none animate-[rise_.35s_var(--ease-sheet)]"
      >
        <div className="mx-auto mb-4 h-[5px] w-9 shrink-0 rounded-full bg-line" aria-hidden />
        <h2 className="font-serif text-[22px] font-bold tracking-[-0.03em] text-main">{title}</h2>
        <div className="mt-3 min-h-16 overflow-y-auto">
          {!result ? (
            <p className="py-4 text-small text-mute">본문을 불러오는 중…</p>
          ) : result.status === "ok" ? (
            <>
              <ol style={readerVars} className="reader-text text-text">
                {result.verses.map((v) => (
                  <li key={v.number} className="mb-2 grid grid-cols-[24px_1fr]">
                    <span className="reader-num font-sans text-[11px] font-bold text-mid">{v.number}</span>
                    <span>{v.text}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-1 border-t border-line pt-2.5 text-[11px] text-mid">{result.attribution}</p>
            </>
          ) : (
            <p className="py-4 text-small text-mute">{MESSAGES[result.status]}</p>
          )}
        </div>
        <div className={`mt-4 grid shrink-0 gap-2 ${goTo ? "grid-cols-2" : "grid-cols-1"}`}>
          <button type="button" onClick={onClose} className={buttonClass("quiet", "h-12 text-body")}>
            닫기
          </button>
          {goTo && (
            <Link href={goTo} className={buttonClass("line", "h-12 text-body")}>
              {verseRef.chapter}장 본문으로
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
