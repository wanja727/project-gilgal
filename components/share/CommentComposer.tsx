"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createCommentAction } from "@/app/actions/comments";
import { Avatar } from "@/components/Avatar";
import { READER_ROOT_ID } from "@/components/reading/ReaderSettingsButton";
import { buttonClass, CloseIcon } from "@/components/ui";
import { formatVerseRef, insertVerse, referencedVerses, removeVerse, splitVerseRefs, type VerseRef } from "@/lib/share/verseRef";
import { VerseSheet } from "./VerseRefText";

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
 * 쓰던 나눔 임시저장 — 남기기 전에 화면이 닫혀도 다시 들어오면 이어 쓴다(카카오톡 대화방 입력창처럼, 2026-10-29).
 * 이 기기 브라우저에만 남는다(localStorage). 남기면 지우고, 오래된 글(30일)은 버린다. 저장소를 못 쓰면 조용히 넘어간다.
 */
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const noSubscribe = () => () => {};

function loadDraft(key: string): string {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return "";
    const { text, at } = JSON.parse(raw) as { text?: unknown; at?: unknown };
    if (typeof text !== "string" || typeof at !== "number" || Date.now() - at > DRAFT_TTL_MS) return "";
    return text;
  } catch {
    return "";
  }
}

function saveDraft(key: string, text: string) {
  try {
    if (text.trim()) localStorage.setItem(key, JSON.stringify({ text, at: Date.now() }));
    else localStorage.removeItem(key);
  } catch {
    /* 저장소를 못 쓰는 브라우저 — 임시저장 없이 */
  }
}

/**
 * 나눔 쓰기 — 성경 해설이 아니라 읽고 마음에 남은 것을 나누는 자리.
 * 실제로 쓰는 곳은 화면 아래에 붙는 입력창 하나다. 나눔은 보통 본문을 다시 보며 쓰므로 본문은 그대로 스크롤되고
 * 입력창만 아래에 머문다(2026-10-29). 본문 아래 자리는 입력창과 똑같이 생기면 같은 칸이 하나 더 뜨는 것처럼 보여서
 * "누르면 쓰기 창이 열리는 한 줄"로 둔다.
 * draftKey: 임시저장 자리(캠페인·아바타 seed·장). 같은 기기를 다른 사람이 써도 섞이지 않게 사람별로 나눈다.
 */
export function CommentComposer({
  dayNo,
  chapter,
  maxLength,
  avatarKey,
  draftKey,
}: {
  dayNo: number;
  chapter: number;
  maxLength: number;
  avatarKey: string;
  draftKey: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const storageKey = `gilgal:draft:${draftKey}`;
  const [text, setText] = useState(() => (typeof window === "undefined" ? "" : loadDraft(storageKey)));
  // 서버 렌더에는 임시저장이 없으므로, 화면이 붙기(hydration) 전까지는 쓰던 글을 보여 주지 않는다 — 어긋남 방지
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const shown = hydrated ? text.trim() : "";

  useEffect(() => saveDraft(storageKey, text), [storageKey, text]);
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
          saveDraft(storageKey, "");
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
        className="mt-2 flex w-full items-center gap-3 rounded-[20px] bg-surface py-3 pr-3 pl-3.5 text-left"
      >
        <Avatar avatarKey={avatarKey} size={34} ring={false} />
        <span className="min-w-0 flex-1">
          {shown ? (
            <>
              <span className="block text-caption font-semibold text-main">쓰던 나눔 이어 쓰기</span>
              <span className="mt-0.5 block truncate text-sub text-mute">{shown}</span>
            </>
          ) : (
            <span className="block text-sub text-mute">{chapter}장을 읽고 마음에 남은 것을 나눠 주세요</span>
          )}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft text-main" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]">
            <path d="M4 20h4L19 9l-4-4L4 16z" />
            <path d="M13.5 6.5l4 4" />
          </svg>
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

// 입력칸과 그 뒤에 겹쳐 그리는 강조 글자는 글꼴·여백·줄바꿈이 똑같아야 글자 위치가 맞는다
const FIELD_TEXT = "p-3 text-[14.5px] leading-[1.65] break-keep [overflow-wrap:anywhere] whitespace-pre-wrap";

/**
 * 화면 아래에 붙는 입력창. 열려 있는 동안 본문의 절을 누르면 "15:3" 이 커서 자리에 들어가고,
 * 바로 이어지는 절을 누르면 "15:3-4" 로 늘어나고, 고른 절을 다시 누르면 빠진다(lib/share/verseRef). 고른 절은 본문에 옅게 표시한다.
 * 들어간 구절은 입력칸 위 칩으로도 보이고(누르면 그 절 본문 시트), 입력칸 안에서도 배경색으로 강조한다 —
 * 입력칸은 일반 textarea 그대로 두고 같은 글을 뒤에 겹쳐 구절 부분만 칠한다(한글 입력에 영향 없음, 2026-10-29).
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
  const backdropRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<VerseRef | null>(null);
  // 시트가 떠 있을 때 Esc 는 시트만 닫는다
  const sheetOpen = useRef(false);
  useEffect(() => {
    sheetOpen.current = sheet !== null;
  }, [sheet]);
  // 절을 누르면 textarea 가 포커스를 잃으므로 마지막 커서 자리를 기억해 둔다
  const caret = useRef<number | null>(null);

  useEffect(() => {
    if (autoFocus) areaRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const root = document.getElementById(READER_ROOT_ID);
    root?.setAttribute("data-quoting", "");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !sheetOpen.current && onClose();
    const onTap = (e: MouseEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-verse]");
      if (!row) return;
      const verse = Number(row.dataset.verse);
      setText((t) => {
        // 이미 고른 절을 다시 누르면 선택 취소
        if (referencedVerses(t, chapter).has(verse)) {
          const next = removeVerse(t, chapter, verse);
          caret.current = Math.min(caret.current ?? next.length, next.length);
          return next;
        }
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

  // 글에 들어간 구절(순서대로, 같은 표기는 한 번)
  const refs = [...new Map(splitVerseRefs(text).flatMap((s) => (s.ref ? [[formatVerseRef(s.ref), s.ref] as const] : []))).values()];

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
          <p className="mt-0.5 text-caption text-mute">본문의 절을 누르면 구절이 들어가고, 다시 누르면 빠져요</p>
        </div>
        <button type="button" onClick={onClose} aria-label="나눔 쓰기 닫기" className="-mr-2 grid size-11 shrink-0 place-items-center text-mute">
          <CloseIcon className="size-5" />
        </button>
      </div>
      {refs.length > 0 && (
        <ul aria-label="고른 구절" className="mt-2 flex flex-wrap gap-1.5">
          {refs.map((r) => (
            <li key={formatVerseRef(r)} className="animate-[rise_.25s_ease-out]">
              <button
                type="button"
                onClick={() => setSheet(r)}
                aria-haspopup="dialog"
                aria-label={`여호수아 ${formatVerseRef(r)} 본문 보기`}
                className="inline-flex h-8 items-center gap-1 rounded-chip bg-soft px-3 text-caption font-bold text-main"
              >
                {formatVerseRef(r)}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-3.5 text-mute" aria-hidden>
                  <path d="M4 12s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" />
                  <circle cx="12" cy="12" r="2.2" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-2 overflow-hidden rounded-[12px] bg-bg">
        {/* 강조용 뒷면: 글자는 투명, 구절 부분만 배경색 — 위 textarea 글자와 위치가 겹친다 */}
        <div ref={backdropRef} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden text-transparent ${FIELD_TEXT}`}>
          {splitVerseRefs(text).map((s, i) =>
            s.ref ? (
              <mark key={i} className="rounded-[4px] bg-water/45 text-transparent">
                {s.text}
              </mark>
            ) : (
              <span key={i}>{s.text}</span>
            ),
          )}
          {/* 끝 줄바꿈도 같은 높이가 되게 */}
          {"​"}
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
          onScroll={(e) => {
            if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          maxLength={maxLength}
          rows={3}
          placeholder="한 문장이어도 좋아요"
          className={`relative block w-full resize-none bg-transparent text-text outline-none placeholder:text-mid focus-visible:outline-2 focus-visible:outline-main ${FIELD_TEXT}`}
        />
      </div>
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
      {sheet && <VerseSheet verseRef={sheet} onClose={() => setSheet(null)} />}
    </form>
  );
}
