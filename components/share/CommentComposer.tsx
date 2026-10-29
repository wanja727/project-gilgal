"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createCommentAction } from "@/app/actions/comments";
import { READER_ROOT_ID } from "@/components/reading/ReaderSettingsButton";
import { buttonClass, CloseIcon } from "@/components/ui";
import { insertVerse, referencedVerses } from "@/lib/share/verseRef";

const ERRORS: Record<string, string> = {
  invalid: "내용을 적어 주세요.",
  locked: "아직 열리지 않은 장이에요.",
  limit: "오늘은 나눔을 충분히 남겼어요. 내일 또 나눠 주세요.",
};

const OPEN_EVENT = "gilgal:compose";

/** 도착 화면의 "나눔 남기기" 등 다른 곳에서 아래 입력창을 연다 */
export function openComposer() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * 나눔 쓰기 — 성경 해설이 아니라 읽고 마음에 남은 것을 나누는 자리.
 * 본문 아래 칸은 누르면 화면 아래에 붙는 입력창을 여는 자리이고, 실제로 쓰는 곳은 입력창 하나다(2026-10-29).
 * 나눔은 보통 본문을 다시 보며 쓰므로 본문은 그대로 스크롤되고 입력창만 아래에 머문다.
 * 쓰던 글은 입력창을 닫았다 열어도 남는다.
 */
export function CommentComposer({ dayNo, chapter, maxLength }: { dayNo: number; chapter: number; maxLength: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // 도착 화면에서 열 때는 키보드를 바로 올리지 않는다 — 먼저 본문을 다시 볼 수 있게
    const onOpen = () => {
      setFocusOnOpen(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await createCommentAction(dayNo, text);
        if (r.status === "ok") {
          setText("");
          setOpen(false);
          router.refresh();
          // 방금 남긴 나눔이 최신순 맨 위에 — 이어서 다른 동행자 나눔을 읽게 목록으로 내려간다
          requestAnimationFrame(() => document.getElementById("share")?.scrollIntoView({ behavior: "smooth" }));
        } else setError(r.status === "too_long" ? `${maxLength}자까지 쓸 수 있어요.` : (ERRORS[r.status] ?? "남기지 못했어요."));
      } catch {
        setError("남기지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFocusOnOpen(true);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className="mt-2 block w-full rounded-[20px] bg-surface p-4 text-left"
      >
        <span className="text-small font-semibold text-main">{chapter}장을 읽고 마음에 남은 것을 나눠 주세요</span>
        <span
          className={`mt-2 line-clamp-3 block min-h-[78px] rounded-[12px] bg-bg p-3 text-[14.5px] leading-[1.65] whitespace-pre-line ${
            text ? "text-text" : "text-mid"
          }`}
        >
          {text || "한 문장이어도 좋아요"}
        </span>
      </button>
      {open && (
        <DockForm
          dayNo={dayNo}
          chapter={chapter}
          maxLength={maxLength}
          text={text}
          setText={setText}
          autoFocus={focusOnOpen}
          pending={pending}
          error={error}
          onSubmit={submit}
          onClose={close}
        />
      )}
    </>
  );
}

const TEXTAREA =
  "mt-2 w-full resize-none rounded-[12px] bg-bg p-3 text-[14.5px] leading-[1.65] text-text outline-none placeholder:text-mid focus-visible:outline-2 focus-visible:outline-main";

/**
 * 화면 아래에 붙는 입력창. 열려 있는 동안 본문의 절을 누르면 "15:3" 이 커서 자리에 들어가고,
 * 바로 이어지는 절을 누르면 "15:3-4" 로 늘어난다(lib/share/verseRef). 고른 절은 본문에 옅게 표시한다.
 */
function DockForm({
  dayNo,
  chapter,
  maxLength,
  text,
  setText,
  autoFocus,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  dayNo: number;
  chapter: number;
  maxLength: number;
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  autoFocus: boolean;
  pending: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  // 절을 누르면 textarea 가 포커스를 잃으므로 마지막 커서 자리를 기억해 둔다
  const caret = useRef<number | null>(null);

  useEffect(() => {
    if (autoFocus) areaRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const root = document.getElementById(READER_ROOT_ID);
    root?.setAttribute("data-quoting", "");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onTap = (e: MouseEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-verse]");
      if (!row) return;
      const verse = Number(row.dataset.verse);
      setText((t) => {
        const r = insertVerse(t, caret.current ?? t.length, chapter, verse, maxLength);
        caret.current = r.caret;
        return r.text;
      });
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onTap);
    return () => {
      root?.removeAttribute("data-quoting");
      document.querySelectorAll("[data-verse][data-picked]").forEach((el) => el.removeAttribute("data-picked"));
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onTap);
    };
  }, [chapter, maxLength, onClose, setText]);

  // 글에 적힌 이 장의 절을 본문에 표시 — 고른 절이 어디인지 보이게
  useEffect(() => {
    const picked = referencedVerses(text, chapter);
    document.querySelectorAll<HTMLElement>("[data-verse]").forEach((el) => {
      el.toggleAttribute("data-picked", picked.has(Number(el.dataset.verse)));
    });
  }, [text, chapter]);

  return (
    <form
      onSubmit={onSubmit}
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
        ref={areaRef}
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
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-caption whitespace-nowrap text-mid tabular-nums" aria-live="polite">
          {text.length} / {maxLength}
        </span>
        <button type="submit" disabled={pending || !text.trim()} className={buttonClass("main", "h-11 !w-auto shrink-0 px-5 text-body")}>
          {pending ? "남기는 중…" : "나눔 남기기"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-caption text-main">
          {error}
        </p>
      )}
    </form>
  );
}
