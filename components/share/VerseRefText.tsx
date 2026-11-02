"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { getVersesAction, type VersesResult } from "@/app/actions/bible";
import { parseReaderSettings, READER_COOKIE, readerCssVars } from "@/lib/reading/settings";
import { formatVerseRef, splitVerseRefs, type VerseRef } from "@/lib/share/verseRef";

/**
 * 나눔 내용 — "16:1-2" 같은 구절 표기를 누르면 그 절 본문을 나눔 바로 아래에 펼친다.
 * 예전에는 화면 아래 시트로 띄웠는데 나눔 글을 가려서, 글과 본문을 함께 보도록 바꿨다(2026-11-03).
 * 같은 표기를 다시 누르거나 "접기"로 닫고, 다른 표기를 누르면 그 구절로 바뀐다.
 */
export function VerseRefText({ content, className = "" }: { content: string; className?: string }) {
  const [open, setOpen] = useState<{ index: number; ref: VerseRef } | null>(null);
  const panelId = useId();

  return (
    <>
      <p className={className}>
        {splitVerseRefs(content).map((s, i) =>
          s.ref ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpen((o) => (o?.index === i ? null : { index: i, ref: s.ref! }))}
              aria-expanded={open?.index === i}
              aria-controls={panelId}
              aria-label={`여호수아 ${formatVerseRef(s.ref)} 본문 ${open?.index === i ? "접기" : "펼치기"}`}
              className={`rounded-[6px] px-1 font-semibold transition-colors ${
                open?.index === i ? "bg-main text-surface" : "bg-soft text-main"
              }`}
            >
              {s.text}
            </button>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      {open && <VerseInline key={open.index} id={panelId} verseRef={open.ref} onClose={() => setOpen(null)} />}
    </>
  );
}

/**
 * 그 자리에 펼치는 구절 본문 — 나눔 카드와 입력창(고른 구절 칩)이 같은 모양으로 쓴다(2026-11-03, 하단 시트 대신).
 * className: 놓이는 자리에 맞춘 여백·높이 제한(입력창에서는 짧게 잘라 스크롤)
 */
export function VerseInline({
  id,
  verseRef,
  onClose,
  className = "mt-2.5",
}: {
  id?: string;
  verseRef: VerseRef;
  onClose: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const [readerVars] = useState(readerVarsFromCookie);
  const result = useVerses(verseRef);
  const title = `여호수아 ${formatVerseRef(verseRef)}`;
  const goTo = result?.status === "ok" && pathname !== `/day/${result.dayNo}` ? `/day/${result.dayNo}` : null;

  return (
    <section id={id} aria-label={title} className={`animate-[rise_.25s_ease-out] rounded-[14px] border-l-[3px] border-main bg-bg py-2.5 pr-2 pl-3.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-serif text-[15px] font-bold tracking-[-0.02em] text-main">{title}</h3>
        <button type="button" onClick={onClose} className="min-h-9 shrink-0 px-2 text-caption font-semibold text-mute">
          접기
        </button>
      </div>
      {!result ? (
        <p className="py-2 text-small text-mute">본문을 불러오는 중…</p>
      ) : result.status === "ok" ? (
        <>
          {/* 카드 안이라 줄 간격만 조금 좁힌다(글꼴·크기는 본문 읽기 설정 그대로) */}
          <ol style={{ ...readerVars, "--reader-leading": 1.8 } as React.CSSProperties} className="reader-text mt-1 pr-1.5 text-text">
            {result.verses.map((v) => (
              <li key={v.number} className="mb-1.5 grid grid-cols-[22px_1fr]">
                <span className="reader-num font-sans text-[11px] font-bold text-mid">{v.number}</span>
                <span>{v.text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-1 flex items-center justify-between gap-2 pr-1.5">
            <p className="text-[11px] text-mid">{result.attribution}</p>
            {goTo && (
              <Link href={goTo} className="shrink-0 py-1 text-caption font-semibold text-main">
                {verseRef.chapter}장 본문으로 →
              </Link>
            )}
          </div>
        </>
      ) : (
        <p className="py-2 text-small text-mute">{MESSAGES[result.status]}</p>
      )}
    </section>
  );
}

/** 구절 본문 불러오기 */
function useVerses(verseRef: VerseRef): VersesResult | null {
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
  return result;
}

const MESSAGES: Record<Exclude<VersesResult["status"], "ok">, string> = {
  invalid: "본문에서 찾을 수 없는 구절이에요.",
  locked: "아직 열리지 않은 장이에요. 그날 함께 읽어요.",
  unavailable: "본문을 준비하고 있어요.",
};

/**
 * 본문 화면에서 고른 읽기 설정(글자 크기·글꼴·굵기·줄 간격)을 펼친 본문에도 — 쿠키(ADR-026)를 읽어 같은 CSS 변수로.
 * 펼침은 누른 뒤에만 그려지므로(서버 렌더 없음) 여기서 document.cookie 를 읽어도 어긋나지 않는다.
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
