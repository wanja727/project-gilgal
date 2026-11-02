"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setHighlightsAction } from "@/app/actions/highlights";
import { READER_ROOT_ID } from "@/components/reading/ReaderSettingsButton";
import { DOCK_EVENT, quoteVerses } from "@/components/share/CommentComposer";
import { CloseIcon } from "@/components/ui";
import { highlightStore } from "@/lib/reading/highlightStore";
import { copyText, formatVerseList } from "@/lib/share/verseRef";

/**
 * 본문 절 누르기 도구(2026-11-03, 갓피플 성경처럼): 절을 누르면 고르고(여러 절 가능) 아래에 도구가 뜬다.
 * - 형광펜: 내게만 보이는 표시(ADR-035). 고른 절이 모두 칠해져 있으면 "지우기".
 * - 복사: "여호수아 3:1-2" 머리를 붙여 클립보드로 — 꾹 눌러 끌어 고르지 않아도 된다.
 * - 나눔에 넣기: 고른 절을 구절 표기로 나눔 입력창에(이미 남긴 나눔이 있으면 그 나눔 고치기로).
 * 나눔 입력창이 열려 있는 동안(data-quoting)은 절 누르기를 입력창이 맡으므로 여기서는 손대지 않는다.
 */
export function VerseTools({
  chapter,
  bookName,
  initialHighlights,
  hasShare,
}: {
  chapter: number;
  bookName: string;
  initialHighlights: number[];
  hasShare: boolean;
}) {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [hl, setHl] = useState<ReadonlySet<number>>(() => new Set(initialHighlights));
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  // 입력창의 "내 형광펜" 칩이 같은 값을 보도록 함께 맞춘다
  useEffect(() => {
    highlightStore.set(chapter, hl);
  }, [chapter, hl]);
  useEffect(() => () => highlightStore.clear(), []);

  // 형광펜·고른 절을 본문 절 요소에 표시 — 본문은 서버에서 그려 두고 속성만 바꾼다
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(`#${READER_ROOT_ID} [data-verse]`).forEach((el) => {
      const v = Number(el.dataset.verse);
      el.toggleAttribute("data-hl", hl.has(v));
      el.toggleAttribute("data-selected", selected.has(v));
    });
    document.getElementById(READER_ROOT_ID)?.toggleAttribute("data-selecting", selected.size > 0);
  }, [hl, selected]);

  const clear = useCallback(() => setSelected(new Set()), []);

  useEffect(() => {
    const onTap = (e: MouseEvent) => {
      const root = document.getElementById(READER_ROOT_ID);
      if (!root || root.hasAttribute("data-quoting")) return;
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-verse]");
      if (!row || !root.contains(row)) return;
      // 꾹 눌러 글자를 고르던 중이면 그 고르기를 방해하지 않는다
      if (window.getSelection()?.toString()) return;
      const v = Number(row.dataset.verse);
      setSelected((s) => {
        const next = new Set(s);
        if (!next.delete(v)) next.add(v);
        return next;
      });
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clear();
    // 나눔 입력창이 열리면 고르던 것은 내려놓는다(아래 자리가 겹치지 않게)
    window.addEventListener(DOCK_EVENT, clear);
    document.addEventListener("click", onTap);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(DOCK_EVENT, clear);
      document.removeEventListener("click", onTap);
      document.removeEventListener("keydown", onKey);
      document.getElementById(READER_ROOT_ID)?.removeAttribute("data-selecting");
    };
  }, [clear]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);
  const flash = (msg: string) => {
    setNotice(msg);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 1800);
  };

  const verses = [...selected].sort((a, b) => a - b);
  const allHl = verses.length > 0 && verses.every((v) => hl.has(v));

  const toggleHighlight = () => {
    const on = !allHl;
    const before = hl;
    const next = new Set(hl);
    verses.forEach((v) => (on ? next.add(v) : next.delete(v)));
    setHl(next);
    clear();
    setHighlightsAction(chapter, verses, on)
      .then((r) => {
        if (r.status !== "ok") throw new Error(r.status);
      })
      .catch(() => {
        setHl(before);
        flash("형광펜을 저장하지 못했어요. 다시 시도해 주세요.");
      });
  };

  const copy = async () => {
    const text = copyText(
      bookName,
      chapter,
      verses.map((v) => ({
        number: v,
        text: document.querySelector(`#${READER_ROOT_ID} [data-verse="${v}"] .verse-text`)?.textContent?.trim() ?? "",
      })),
    );
    const ok = await writeClipboard(text);
    clear();
    flash(ok ? `${bookName} ${formatVerseList(chapter, verses)} 복사했어요` : "복사하지 못했어요.");
  };

  const quote = () => {
    clear();
    quoteVerses(chapter, verses);
  };

  if (verses.length === 0) {
    return notice ? (
      <p
        role="status"
        className="fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),16px)] z-40 mx-auto w-fit max-w-[calc(100%-2rem)] animate-[rise_.25s_ease-out] rounded-chip bg-main px-4 py-3 text-center text-small font-semibold text-white"
      >
        {notice}
      </p>
    ) : null;
  }

  return (
    <div
      role="toolbar"
      aria-label="고른 절"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md animate-[rise_.25s_var(--ease-sheet)] rounded-t-[24px] bg-surface px-4 pt-2.5 pb-[max(env(safe-area-inset-bottom),14px)] shadow-[0_-6px_24px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate pl-1 text-small font-semibold text-main" aria-live="polite">
          {bookName} {formatVerseList(chapter, verses)}
          <span className="ml-1.5 font-medium text-mute">{verses.length}절 고름</span>
        </p>
        <button type="button" onClick={clear} aria-label="고르기 취소" className="-mr-2 grid size-10 shrink-0 place-items-center text-mute">
          <CloseIcon className="size-5" />
        </button>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2">
        <ToolButton onClick={toggleHighlight} label={allHl ? "형광펜 지우기" : "형광펜"}>
          <path d="M9 15l-4.5 4.5H9l1.5-1.5" />
          <path d="M9 15l2.5 2.5L20 9l-5-5-8.5 8.5z" />
          {allHl && <path d="M3 3l18 18" />}
        </ToolButton>
        <ToolButton onClick={copy} label="복사">
          <rect x="8" y="8" width="12" height="12" rx="2.5" />
          <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
        </ToolButton>
        <ToolButton onClick={quote} label={hasShare ? "내 나눔에 넣기" : "나눔에 넣기"}>
          <path d="M4 20h4L19 9l-4-4L4 16z" />
          <path d="M13.5 6.5l4 4" />
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[62px] flex-col items-center justify-center gap-1 rounded-[14px] bg-bg text-caption font-semibold text-main active:bg-soft"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[21px]" aria-hidden>
        {children}
      </svg>
      {label}
    </button>
  );
}

/** 클립보드 — 권한이 없거나 오래된 브라우저(카카오톡 인앱 등)면 숨긴 입력칸으로 한 번 더 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
