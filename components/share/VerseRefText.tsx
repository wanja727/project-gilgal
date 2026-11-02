"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
  const close = () => setOpen(null);

  return (
    <>
      <p className={className}>
        {splitVerseRefs(content).map((s, i) =>
          s.ref ? (
            <button
              key={i}
              type="button"
              // 손가락이 닿는 순간 본문을 미리 불러와 펼칠 때 빈 자리가 덜 보이게
              onPointerDown={() => void loadVerses(s.ref!)}
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
      <VersePeek id={panelId} verseRef={open?.ref ?? null} onClose={close} className="pt-2.5" />
    </>
  );
}

/**
 * 그 자리에 펼치는 구절 본문 — 나눔 카드와 입력창(고른 구절 칩)이 같은 모양으로 쓴다(2026-11-03, 하단 시트 대신).
 * 열고 닫기·다른 구절로 바꾸기·본문이 도착해 길어지기를 모두 높이 전환으로 부드럽게 잇는다 —
 * 예전에는 "불러오는 중" 한 줄로 떴다가 본문이 오면 툭 늘어나 깜박이는 것처럼 보였다.
 * verseRef 가 null 이면 접는다(접히는 동안은 마지막 구절을 그대로 보여 준다).
 * className: 바깥 여백(접히면 함께 사라지도록 안쪽에 둔다), panelClass: 높이 제한 등 본문 상자에 줄 것
 */
export function VersePeek({
  id,
  verseRef,
  onClose,
  className = "",
  panelClass = "",
}: {
  id?: string;
  verseRef: VerseRef | null;
  onClose: () => void;
  className?: string;
  panelClass?: string;
}) {
  const [shown, setShown] = useState(verseRef);
  // 열려 있는 동안은 지금 구절, 접히는 동안은 마지막 구절
  if (verseRef && verseRef !== shown) setShown(verseRef);
  return (
    <Reveal show={verseRef !== null} onHidden={() => setShown(null)}>
      {shown && (
        <div className={className}>
          <VerseInline id={id} verseRef={shown} onClose={onClose} className={panelClass} />
        </div>
      )}
    </Reveal>
  );
}

/** 안쪽 높이를 따라 바깥 높이를 전환한다 — 열고 닫을 때·내용이 바뀔 때 모두 */
function Reveal({ show, onHidden, children }: { show: boolean; onHidden: () => void; children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [mounted, setMounted] = useState(show);
  if (show && !mounted) setMounted(true);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!mounted || !el) return;
    // 처음엔 0 으로 한 번 그려진 뒤에 높이를 줘야 전환이 보인다
    const raf = requestAnimationFrame(() => setHeight(el.offsetHeight));
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [mounted]);

  // 움직임 줄이기 설정이면 전환 없이 바로 닫는다(전환 끝 알림이 오지 않으므로). 그려진 뒤(브라우저)에만 닿는 자리
  if (!show && mounted && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setMounted(false);
    setHeight(0);
  }

  if (!mounted) return null;
  return (
    <div
      style={{ height: show ? height : 0, opacity: show ? 1 : 0 }}
      className="overflow-hidden transition-[height,opacity] duration-300 ease-[var(--ease-sheet)] motion-reduce:transition-none"
      onTransitionEnd={(e) => {
        if (e.target !== e.currentTarget || e.propertyName !== "height" || show) return;
        setMounted(false);
        // 다시 펼칠 때 지난 높이에서 시작하지 않게(0 에서 자라도록)
        setHeight(0);
        onHidden();
      }}
    >
      <div ref={inner}>{children}</div>
    </div>
  );
}

function VerseInline({ id, verseRef, onClose, className }: { id?: string; verseRef: VerseRef; onClose: () => void; className: string }) {
  const pathname = usePathname();
  const [readerVars] = useState(readerVarsFromCookie);
  const fresh = useVerses(verseRef);
  // 다른 구절로 바꿀 때 새 본문이 오기 전까지는 앞 구절을 그대로 — "불러오는 중"으로 줄었다 늘어나는 출렁임 없이 한 번에 바뀐다
  const [last, setLast] = useState<{ ref: VerseRef; result: VersesResult } | null>(null);
  if (fresh && last?.result !== fresh) setLast({ ref: verseRef, result: fresh });
  const view = fresh ? { ref: verseRef, result: fresh } : last;
  const result = view?.result ?? null;
  const ref = view?.ref ?? verseRef;
  const title = `여호수아 ${formatVerseRef(ref)}`;
  const goTo = result?.status === "ok" && pathname !== `/day/${result.dayNo}` ? `/day/${result.dayNo}` : null;

  return (
    <section id={id} aria-label={title} className={`rounded-[14px] border-l-[3px] border-main bg-bg py-2.5 pr-2 pl-3.5 ${className}`}>
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
          <ol
            key={formatVerseRef(ref)}
            style={{ ...readerVars, "--reader-leading": 1.8 } as React.CSSProperties}
            className="reader-text mt-1 animate-[fade-in_.25s_ease-out] pr-1.5 text-text"
          >
            {result.verses.map((v) => (
              <li key={v.number} className="mb-1.5 grid grid-cols-[22px_1fr]">
                <span className="reader-num font-sans text-[11px] font-bold text-mid">{v.number}</span>
                <span>{v.text}</span>
              </li>
            ))}
          </ol>
          {/* 출처 표기는 본문 화면 끝에 있고, 펼침은 짧게 두려 여기서는 뺀다(2026-11-03) */}
          {goTo && (
            <div className="flex justify-end pr-1.5">
              <Link href={goTo} className="py-1 text-caption font-semibold text-main">
                {ref.chapter}장 본문으로 →
              </Link>
            </div>
          )}
        </>
      ) : (
        <p className="py-2 text-small text-mute">{MESSAGES[result.status]}</p>
      )}
    </section>
  );
}

/**
 * 구절 본문 불러오기 — 한 번 불러온 구절은 기억해 다시 펼치면 바로 보인다(같은 화면 안, 새로고침하면 비워진다).
 * 실패는 기억하지 않아 다음에 다시 시도한다.
 */
const verseCache = new Map<string, VersesResult>();
const verseLoading = new Map<string, Promise<VersesResult>>();

function loadVerses(ref: VerseRef): Promise<VersesResult> {
  const key = formatVerseRef(ref);
  const hit = verseCache.get(key);
  if (hit) return Promise.resolve(hit);
  let p = verseLoading.get(key);
  if (!p) {
    p = getVersesAction(ref)
      .then((r) => {
        if (r.status !== "unavailable") verseCache.set(key, r);
        return r;
      })
      .catch((): VersesResult => ({ status: "unavailable" }))
      .finally(() => verseLoading.delete(key));
    verseLoading.set(key, p);
  }
  return p;
}

function useVerses(verseRef: VerseRef): VersesResult | null {
  const key = formatVerseRef(verseRef);
  const [loaded, setLoaded] = useState<{ key: string; result: VersesResult } | null>(null);
  useEffect(() => {
    if (verseCache.has(key)) return;
    let alive = true;
    loadVerses(verseRef).then((result) => alive && setLoaded({ key, result }));
    return () => {
      alive = false;
    };
  }, [key, verseRef]);
  return verseCache.get(key) ?? (loaded?.key === key ? loaded.result : null);
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
