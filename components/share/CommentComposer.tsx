"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createCommentAction } from "@/app/actions/comments";
import { READER_ROOT_ID } from "@/components/reading/ReaderSettingsButton";
import { buttonClass, CloseIcon } from "@/components/ui";

const ERRORS: Record<string, string> = {
  invalid: "내용을 적어 주세요.",
  locked: "아직 열리지 않은 장이에요.",
  limit: "오늘은 나눔을 충분히 남겼어요. 내일 또 나눠 주세요.",
};

/** 쓰는 중인 나눔과 저장. 본문 아래 칸과 화면 아래 입력창이 같이 쓴다 */
function useCommentDraft(dayNo: number, maxLength: number, onPosted?: () => void) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await createCommentAction(dayNo, text);
        if (r.status === "ok") {
          setText("");
          router.refresh();
          onPosted?.();
        } else setError(r.status === "too_long" ? `${maxLength}자까지 쓸 수 있어요.` : (ERRORS[r.status] ?? "남기지 못했어요."));
      } catch {
        setError("남기지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  return { text, setText, error, pending, submit };
}

function Footer({ length, maxLength, pending, empty }: { length: number; maxLength: number; pending: boolean; empty: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <span className="text-caption whitespace-nowrap text-mid tabular-nums" aria-live="polite">
        {length} / {maxLength}
      </span>
      <button type="submit" disabled={pending || empty} className={buttonClass("main", "h-11 !w-auto shrink-0 px-5 text-body")}>
        {pending ? "남기는 중…" : "나눔 남기기"}
      </button>
    </div>
  );
}

const TEXTAREA =
  "mt-2 w-full resize-none rounded-[12px] bg-bg p-3 text-[14.5px] leading-[1.65] text-text outline-none placeholder:text-mid focus-visible:outline-2 focus-visible:outline-main";

/** 나눔 쓰기 — 성경 해설이 아니라 읽고 마음에 남은 것을 나누는 자리 */
export function CommentComposer({ dayNo, maxLength }: { dayNo: number; maxLength: number }) {
  const { text, setText, error, pending, submit } = useCommentDraft(dayNo, maxLength);

  return (
    <form onSubmit={submit} className="mt-2 rounded-[20px] bg-surface p-4">
      <label htmlFor={`compose-${dayNo}`} className="text-small font-semibold text-main">
        {dayNo}장을 읽고 마음에 남은 것을 나눠 주세요
      </label>
      <textarea
        id={`compose-${dayNo}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={maxLength}
        rows={3}
        placeholder="한 문장이어도 좋아요"
        className={TEXTAREA}
      />
      <Footer length={text.length} maxLength={maxLength} pending={pending} empty={!text.trim()} />
      {error && (
        <p role="alert" className="mt-2 text-caption text-main">
          {error}
        </p>
      )}
    </form>
  );
}

/**
 * 화면 아래에 붙는 나눔 입력창(도착 화면의 "나눔 남기기"로 열린다, 2026-10-29).
 * 나눔은 보통 본문을 다시 보며 쓰므로 본문은 그대로 스크롤되고 입력창만 아래에 머문다.
 * 열려 있는 동안 본문의 절을 누르면 "15:3" 이 커서 자리에 들어간다(#reader-root[data-quoting], 절 번호만 누르기엔 작아 절 전체).
 */
export function DockComposer({
  dayNo,
  chapter,
  maxLength,
  onClose,
  onPosted,
}: {
  dayNo: number;
  chapter: number;
  maxLength: number;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { text, setText, error, pending, submit } = useCommentDraft(dayNo, maxLength, onPosted);
  // 절을 누르면 textarea 가 포커스를 잃으므로 마지막 커서 자리를 기억해 둔다
  const caret = useRef<number | null>(null);

  useEffect(() => {
    const root = document.getElementById(READER_ROOT_ID);
    root?.setAttribute("data-quoting", "");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onTap = (e: MouseEvent) => {
      const num = (e.target as HTMLElement).closest<HTMLElement>("[data-verse]");
      if (!num) return;
      const ref = `${chapter}:${num.dataset.verse}`;
      setText((t) => {
        const at = Math.min(caret.current ?? t.length, t.length);
        const before = t.slice(0, at);
        const insert = `${before && !/\s$/.test(before) ? " " : ""}${ref} `;
        caret.current = at + insert.length;
        return (before + insert + t.slice(at)).slice(0, maxLength);
      });
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onTap);
    return () => {
      root?.removeAttribute("data-quoting");
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onTap);
    };
  }, [chapter, maxLength, onClose, setText]);

  return (
    <form
      onSubmit={submit}
      aria-label={`${chapter}장 나눔 쓰기`}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md animate-[rise_.3s_var(--ease-sheet)] rounded-t-[24px] bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),14px)] shadow-[0_-6px_24px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="pt-1.5">
          <label htmlFor={`dock-${dayNo}`} className="block text-small font-semibold text-main">
            {chapter}장을 읽고 마음에 남은 것은?
          </label>
          <p className="mt-0.5 text-caption text-mute">본문의 절을 누르면 구절 번호가 들어가요</p>
        </div>
        <button type="button" onClick={onClose} aria-label="나눔 쓰기 닫기" className="-mr-2 grid size-11 shrink-0 place-items-center text-mute">
          <CloseIcon className="size-5" />
        </button>
      </div>
      <textarea
        id={`dock-${dayNo}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          caret.current = e.target.selectionStart;
        }}
        onSelect={(e) => (caret.current = e.currentTarget.selectionStart)}
        maxLength={maxLength}
        rows={3}
        placeholder="한 문장이어도 좋아요"
        className={TEXTAREA}
      />
      <Footer length={text.length} maxLength={maxLength} pending={pending} empty={!text.trim()} />
      {error && (
        <p role="alert" className="mt-1 text-caption text-main">
          {error}
        </p>
      )}
    </form>
  );
}
