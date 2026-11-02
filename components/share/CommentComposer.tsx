"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { flushSync } from "react-dom";
import { createCommentAction } from "@/app/actions/comments";
import { flashLift } from "@/components/motion/flashLift";
import { shareAnchor } from "@/lib/share/anchor";
import { markJustPosted } from "@/lib/share/justPosted";
import { Avatar } from "@/components/Avatar";
import { READER_ROOT_ID } from "@/components/reading/ReaderSettingsButton";
import { buttonClass, CloseIcon } from "@/components/ui";
import { highlightStore } from "@/lib/reading/highlightStore";
import {
  addVerses,
  formatVerseRef,
  referencedVerses,
  splitVerseRefs,
  tapVerse,
  toRanges,
  type VerseRef,
} from "@/lib/share/verseRef";
import { VersePeek } from "./VerseRefText";

const ERRORS: Record<string, string> = {
  invalid: "내용을 적어 주세요.",
  locked: "아직 열리지 않은 장이에요.",
  limit: "오늘은 나눔을 충분히 남겼어요. 내일 또 나눠 주세요.",
  exists: "이 장에는 이미 나눔을 남겼어요. 남긴 나눔을 고쳐 주세요.",
};

const OPEN_EVENT = "gilgal:compose";

/** 도착 화면의 "나눔 남기기" 등 다른 곳에서 아래 입력창을 연다 */
export function openComposer() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const QUOTE_EVENT = "gilgal:quote";
export type QuoteDetail = { chapter: number; verses: number[] };

/**
 * 본문 도구의 "나눔에 넣기" — 고른 절을 구절 표기로 넣으며 입력창을 연다(2026-11-03).
 * 이 장에 나눔이 없으면 새 나눔(CommentComposer), 있으면 내 나눔 고치기(CommentCard)가 받는다.
 */
export function quoteVerses(chapter: number, verses: number[]) {
  window.dispatchEvent(new CustomEvent<QuoteDetail>(QUOTE_EVENT, { detail: { chapter, verses } }));
}

/** quoteVerses 를 받는 쪽 — 받으면 onQuote(넣을 절) */
export function useQuoteListener(enabled: boolean, onQuote: (d: QuoteDetail) => void) {
  useEffect(() => {
    if (!enabled) return;
    const on = (e: Event) => onQuote((e as CustomEvent<QuoteDetail>).detail);
    window.addEventListener(QUOTE_EVENT, on);
    return () => window.removeEventListener(QUOTE_EVENT, on);
  }, [enabled, onQuote]);
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
 * mineId: 이 장에 이미 남긴 내 나눔(한 사람은 한 장에 하나, ADR-034) — 있으면 쓰기 대신 "내 나눔 보기"로 그 나눔에 데려간다.
 */
export function CommentComposer({
  dayNo,
  chapter,
  maxLength,
  avatarKey,
  draftKey,
  mineId = null,
}: {
  dayNo: number;
  chapter: number;
  maxLength: number;
  avatarKey: string;
  draftKey: string;
  mineId?: number | null;
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

  // 이미 남긴 나눔이 있으면 그 나눔을 가운데로 데려와 알린다(셀 카드·홈 말풍선과 같은 강조)
  const showMine = useCallback(() => {
    const el = mineId ? document.getElementById(shareAnchor(mineId)) : null;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    window.setTimeout(() => flashLift(el), 450);
  }, [mineId]);

  useEffect(() => {
    // 도착 화면에서 열 때는 키보드를 바로 올리지 않는다 — 먼저 본문을 다시 볼 수 있게
    const onOpen = () => {
      if (mineId) return showMine();
      setFocusOnOpen(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [mineId, showMine]);

  const close = useCallback(() => setOpen(false), []);

  // 본문에서 고른 절을 받아 글 끝에 넣고 입력창을 연다
  const onQuote = useCallback(
    ({ chapter: c, verses }: QuoteDetail) => {
      setText((t) => addVerses(t, t.length, c, verses, maxLength).text);
      setFocusOnOpen(true);
      setOpen(true);
    },
    [maxLength],
  );
  useQuoteListener(!mineId, onQuote);

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
          markJustPosted();
          router.refresh();
          // 방금 남긴 나눔이 최신순 맨 위에 — 이어서 다른 동행자 나눔을 읽게 목록으로 내려간다
          requestAnimationFrame(() => document.getElementById("share")?.scrollIntoView({ behavior: "smooth" }));
        } else setError(r.status === "too_long" ? `${maxLength}자까지 쓸 수 있어요.` : (ERRORS[r.status] ?? "남기지 못했어요."));
      } catch {
        setError("남기지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    });
  };

  if (mineId) {
    return (
      <button
        type="button"
        onClick={showMine}
        className="mt-2 flex w-full items-center gap-3 rounded-[20px] bg-surface py-3 pr-3 pl-3.5 text-left"
      >
        <Avatar avatarKey={avatarKey} size={34} ring={false} />
        <span className="min-w-0 flex-1">
          <span className="block text-caption font-semibold text-main">이 장의 나눔을 남겼어요</span>
          <span className="mt-0.5 block text-sub text-mute">내 나눔 보기 · 고치려면 내 나눔의 ‘수정’</span>
        </span>
      </button>
    );
  }

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
        <ComposerDock
          id={`dock-${dayNo}`}
          title={`${chapter}장을 읽고 마음에 남은 것은?`}
          submitLabel="나눔 남기기"
          pendingLabel="남기는 중…"
          quoting
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

/** 입력창이 열릴 때 알린다 — 다른 입력창·본문 도구(VerseTools)가 비켜 준다 */
export const DOCK_EVENT = "gilgal:dock-open";

/**
 * 화면 아래에 붙는 입력창 — 새 나눔과 나눔 고치기가 함께 쓴다(2026-10-29). 한 번에 하나만 열린다.
 * quoting: 본문이 있는 화면(장 본문)에서만 절 누르기로 구절을 넣는다. 열려 있는 동안 본문의 절을 누르면 "15:3" 이 커서 자리에 들어가고,
 * 바로 이어지는 절을 누르면 "15:3-4" 로 늘어나고, 고른 절을 다시 누르면 빠진다(lib/share/verseRef). 고른 절은 본문에 옅게 표시한다.
 * 들어간 구절은 입력칸 위 칩으로도 보이고(누르면 그 절 본문 시트), 입력칸 안에서도 배경색으로 강조한다 —
 * 입력칸은 일반 textarea 그대로 두고 같은 글을 뒤에 겹쳐 구절 부분만 칠한다(한글 입력에 영향 없음, 2026-10-29).
 *
 * 모바일에서 구절 고르기(2026-11-03): 자판이 떠 있으면 본문이 가려 구절을 고르기 어렵다. 본문 쪽을 끌어 넘기면
 * 자판을 내리고 입력창을 한 줄(쓰던 글)로 접는다. "이어 쓰기"로 다시 펼친다.
 * (따로 두었던 "본문에서 고르기" 버튼은 버튼 없이도 고를 수 있어 헷갈린다는 의견으로 뺐다)
 * 내 형광펜(ADR-035)이 있으면 칩으로 보여 줘 누르면 바로 구절로 들어간다.
 */
export function ComposerDock({
  id,
  title,
  submitLabel,
  pendingLabel = "저장하는 중…",
  quoting = false,
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
  id: string;
  title: string;
  submitLabel: string;
  pendingLabel?: string;
  quoting?: boolean;
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
  // 칩을 눌러 펼친 구절(나눔 카드와 같은 펼침)
  const [peek, setPeek] = useState<VerseRef | null>(null);
  const closePeek = useCallback(() => setPeek(null), []);
  // 시트가 떠 있을 때 Esc 는 시트만 닫는다
  const sheetOpen = useRef(false);
  useEffect(() => {
    sheetOpen.current = peek !== null;
    if (!peek) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPeek(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [peek]);
  // 절을 누르면 textarea 가 포커스를 잃으므로 마지막 커서 자리를 기억해 둔다
  const caret = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [compact, setCompact] = useState(false);
  const highlights = useSyncExternalStore(highlightStore.subscribe, highlightStore.get, highlightStore.getServer);

  const collapse = useCallback(() => {
    areaRef.current?.blur();
    setCompact(true);
  }, []);
  // 펼치면서 바로 포커스 — 누른 그 순간에 포커스해야 모바일 자판이 올라온다(그래서 flushSync)
  const expand = () => {
    flushSync(() => setCompact(false));
    const a = areaRef.current;
    if (!a) return;
    a.focus({ preventScroll: true });
    const c = Math.min(caret.current ?? a.value.length, a.value.length);
    a.setSelectionRange(c, c);
  };
  /**
   * 고른 구절 칩 누르기 — "본문이 화면에 있으면 거기로, 없으면 펼쳐서"(2026-11-03).
   * 이 장 본문 화면이면 입력창을 접고 그 절로 데려가 잠깐 반짝인다(앞뒤 흐름을 보고, 거기서 바로 빼거나 늘릴 수 있게).
   * 다른 장 구절이나 본문이 없는 화면(나눔 탭에서 고치기)은 입력창 안에 펼친다.
   */
  const showRef = (r: VerseRef) => {
    const rows =
      quoting && r.chapter === chapter
        ? [...document.querySelectorAll<HTMLElement>(`#${READER_ROOT_ID} [data-verse]`)].filter((el) => {
            const v = Number(el.dataset.verse);
            return v >= r.from && v <= r.to;
          })
        : [];
    if (rows.length === 0) {
      setPeek((p) => (p && formatVerseRef(p) === formatVerseRef(r) ? null : r));
      return;
    }
    setPeek(null);
    collapse();
    // 접혀 아래 여백이 바뀐 뒤에 위치를 잰다
    requestAnimationFrame(() => {
      rows[0].scrollIntoView({ block: rows.length > 2 ? "start" : "center", behavior: "smooth" });
      window.setTimeout(() => {
        rows.forEach((el) => {
          el.removeAttribute("data-flash");
          void el.offsetWidth; // 같은 절을 다시 눌러도 처음부터
          el.setAttribute("data-flash", "");
          el.addEventListener("animationend", () => el.removeAttribute("data-flash"), { once: true });
        });
      }, 350);
    });
  };

  // 입력창 밖(본문)을 손가락으로 끌면 접는다 — 자판이 올라오며 생기는 스크롤에는 반응하지 않게 터치 이동만 본다
  useEffect(() => {
    if (!quoting) return;
    let startY: number | null = null;
    const onStart = (e: TouchEvent) => {
      startY = formRef.current?.contains(e.target as Node) ? null : e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null || Math.abs(e.touches[0].clientY - startY) < 12) return;
      startY = null;
      collapse();
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
    };
  }, [quoting, collapse]);

  useEffect(() => {
    const a = areaRef.current;
    if (!autoFocus || !a) return;
    a.focus({ preventScroll: true });
    // 본문에서 넣은 구절 뒤(글 끝)에서 이어 쓰게
    a.setSelectionRange(a.value.length, a.value.length);
  }, [autoFocus]);

  // 다른 입력창(새 나눔 ↔ 나눔 고치기)이 열리면 이 창은 닫는다
  useEffect(() => {
    const token = {};
    const onOther = (e: Event) => (e as CustomEvent).detail !== token && onClose();
    window.dispatchEvent(new CustomEvent(DOCK_EVENT, { detail: token }));
    window.addEventListener(DOCK_EVENT, onOther);
    return () => window.removeEventListener(DOCK_EVENT, onOther);
  }, [onClose]);

  useEffect(() => {
    if (!quoting) {
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && !sheetOpen.current && onClose();
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !sheetOpen.current && onClose();
    const onTap = (e: MouseEvent) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-verse]");
      if (!row) return;
      const verse = Number(row.dataset.verse);
      setText((t) => {
        const r = tapVerse(t, caret.current ?? t.length, chapter, verse, maxLength);
        caret.current = r.caret;
        return r.text;
      });
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onTap);
    return () => {
      document.querySelectorAll("[data-verse][data-picked]").forEach((el) => el.removeAttribute("data-picked"));
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onTap);
    };
  }, [quoting, chapter, maxLength, onClose, setText]);

  // 접힘 여부도 본문에 알린다 — 접히면 아래 여백을 줄여 본문을 더 보여 준다
  useEffect(() => {
    if (!quoting) return;
    const root = document.getElementById(READER_ROOT_ID);
    root?.setAttribute("data-quoting", compact ? "compact" : "");
    return () => root?.removeAttribute("data-quoting");
  }, [quoting, compact]);

  // 글에 들어간 구절(순서대로, 같은 표기는 한 번)
  const refs = [...new Map(splitVerseRefs(text).flatMap((s) => (s.ref ? [[formatVerseRef(s.ref), s.ref] as const] : []))).values()];
  // 아직 글에 넣지 않은 내 형광펜 — 이어진 절은 한 칩으로
  const picked = referencedVerses(text, chapter);
  const hlRanges =
    quoting && highlights.chapter === chapter ? toRanges(chapter, [...highlights.verses].filter((v) => !picked.has(v))) : [];
  const addRange = (r: VerseRef) => {
    const verses = Array.from({ length: r.to - r.from + 1 }, (_, i) => r.from + i);
    const next = addVerses(text, caret.current ?? text.length, chapter, verses, maxLength);
    caret.current = next.caret;
    setText(next.text);
    // 넣은 자리 뒤로 커서를 옮겨 이어 쓰게(칩은 포커스를 빼앗지 않는다)
    requestAnimationFrame(() => {
      if (document.activeElement === areaRef.current) areaRef.current?.setSelectionRange(next.caret, next.caret);
    });
  };


  // 글에 적힌 이 장의 절을 본문에 표시 — 고른 절이 어디인지 보이게
  useEffect(() => {
    if (!quoting) return;
    const picked = referencedVerses(text, chapter);
    document.querySelectorAll<HTMLElement>("[data-verse]").forEach((el) => {
      el.toggleAttribute("data-picked", picked.has(Number(el.dataset.verse)));
    });
  }, [quoting, text, chapter]);

  if (compact) {
    return (
      <form
        ref={formRef}
        onSubmit={(e) => e.preventDefault()}
        aria-label={`${title} (접힘)`}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md rounded-t-[20px] bg-surface px-4 pt-2.5 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-6px_24px_rgba(0,0,0,0.1)]"
      >
        <div className="flex items-center gap-2">
          <button type="button" onClick={expand} className="min-w-0 flex-1 py-0.5 text-left">
            <span className="block text-caption text-mute">본문의 절을 누르면 구절이 들어가요</span>
            <span className={`mt-0.5 block truncate text-small ${text.trim() ? "font-semibold text-main" : "text-mid"}`}>
              {text.trim() || "아직 쓴 글이 없어요"}
            </span>
          </button>
          <button type="button" onClick={expand} className={buttonClass("main", "h-10 !w-auto shrink-0 px-4 text-small")}>
            이어 쓰기
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      aria-label={title}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md animate-[rise_.3s_var(--ease-sheet)] rounded-t-[24px] bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),14px)] shadow-[0_-6px_24px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="pt-1.5">
          <label htmlFor={id} className="block text-small font-semibold text-main">
            {title}
          </label>
          {quoting && <p className="mt-0.5 text-caption text-mute">본문의 절을 누르면 구절이 들어가고, 다시 누르면 빠져요</p>}
        </div>
        <button type="button" onClick={onClose} aria-label={`${title} 닫기`} className="-mr-2 grid size-11 shrink-0 place-items-center text-mute">
          <CloseIcon className="size-5" />
        </button>
      </div>
      {(refs.length > 0 || hlRanges.length > 0) && (
        <ul aria-label="고른 구절" className="mt-2 flex flex-wrap gap-1.5">
          {refs.map((r) => {
            const on = peek !== null && formatVerseRef(peek) === formatVerseRef(r);
            return (
              <li key={formatVerseRef(r)} className="animate-[rise_.25s_ease-out]">
                <button
                  type="button"
                  onClick={() => showRef(r)}
                  aria-label={`여호수아 ${formatVerseRef(r)} 본문 보기`}
                  className={`inline-flex h-8 items-center rounded-chip px-3 text-caption font-bold transition-colors ${
                    on ? "bg-main text-surface" : "bg-soft text-main"
                  }`}
                >
                  {formatVerseRef(r)}
                </button>
              </li>
            );
          })}
          {/* 아직 넣지 않은 내 형광펜 — 본문과 같은 노란색, 누르면 커서 자리에 들어간다 */}
          {hlRanges.map((r) => (
            <li key={`hl-${formatVerseRef(r)}`}>
              <button
                type="button"
                // 칩을 눌러도 입력칸 포커스(모바일 자판)를 그대로 둔다
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => addRange(r)}
                aria-label={`내 형광펜 구절 ${formatVerseRef(r)} 넣기`}
                className="inline-flex h-8 items-center gap-1 rounded-chip bg-hl px-3 text-caption font-bold text-main"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="size-3" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {formatVerseRef(r)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* 고른 구절 본문 — 입력창 안에서 짧게 펼쳐(길면 스크롤) 쓰던 글을 가리지 않는다 */}
      <VersePeek
        verseRef={peek && refs.some((r) => formatVerseRef(r) === formatVerseRef(peek)) ? peek : null}
        onClose={closePeek}
        className="pt-2"
        panelClass="max-h-[28dvh] overflow-y-auto"
      />
      <div className="relative mt-2 overflow-hidden rounded-[12px] bg-bg">
        {/* 강조용 뒷면: 글자는 투명, 구절 부분만 배경색 — 위 textarea 글자와 위치가 겹친다 */}
        <div ref={backdropRef} aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden text-transparent ${FIELD_TEXT}`}>
          {splitVerseRefs(text).map((s, i) =>
            s.ref ? (
              <mark key={i} className="rounded-[4px] bg-line text-transparent">
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
          id={id}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            caret.current = e.target.selectionStart;
          }}
          onSelect={(e) => (caret.current = e.currentTarget.selectionStart)}
          onFocus={() => setCompact(false)}
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
          {pending ? pendingLabel : submitLabel}
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
