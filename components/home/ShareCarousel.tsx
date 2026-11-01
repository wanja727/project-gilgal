"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { setLikeAction } from "@/app/actions/comments";
import { Avatar } from "@/components/Avatar";
import { shareAnchor } from "@/components/share/CommentCard";
import type { SharedComment } from "@/lib/data/comments";
import { JOURNEY_DAYS } from "@/lib/journey/days";

/** 한 번에 보여 주는 나눔 수 */
const PER_PAGE = 3;
/**
 * 다음 세 나눔으로 넘어가는 간격 — 세 줄까지 보이는 나눔 셋을 읽고도 조금 남게.
 * 자주 넘기는 것보다 넘어가는 순간의 연출(밀려나고 착착 들어오기)이 살아 있는 느낌을 준다
 */
const AUTO_MS = 11000;
const ROW_STAGGER_MS = 110;
/** 나가는 세 나눔이 빠지기 시작한 뒤 들어오기 */
const ENTER_AFTER_MS = 140;
const OUT_MS = 260;
/** 이만큼 옆으로 밀면 넘긴다 */
const SWIPE_PX = 48;

type View = { page: number; dir: 1 | -1; seq: number; out: { page: number; from: number } | null };

/**
 * 홈 나눔 미리보기(2026-11-01): 아바타 옆 말풍선으로 세 나눔씩 보여 주고, 몇 초마다 다음 세 나눔이 옆에서 한 줄씩 "착착착" 들어온다.
 * 한마디 카드(ADR-028, 대체됨 ADR-029)의 넘김 연출을 나눔에 옮겨 왔다. 말풍선 옆 하트로 홈에서 바로 공감할 수 있다.
 * - 손가락으로 좌우로 밀면 넘기고(세로 스크롤은 그대로), 누르고 있는 동안은 넘어가지 않는다
 * - 카드가 화면 밖이거나 탭이 가려져 있거나 "동작 줄이기"면 저절로 넘기지 않는다
 */
export function ShareCarousel({ comments, showChapter }: { comments: SharedComment[]; showChapter: boolean }) {
  const pages: SharedComment[][] = [];
  for (let i = 0; i < comments.length; i += PER_PAGE) pages.push(comments.slice(i, i + PER_PAGE));
  const pageCount = pages.length;

  const [view, setView] = useState<View>({ page: 0, dir: 1, seq: 0, out: null });
  const page = Math.min(view.page, Math.max(pageCount - 1, 0));

  const go = useCallback(
    (target: number, dir: 1 | -1, from = 0) => {
      if (pageCount < 2) return;
      setView((v) => ({
        page: ((target % pageCount) + pageCount) % pageCount,
        dir,
        seq: v.seq + 1,
        out: { page: Math.min(v.page, pageCount - 1), from },
      }));
    },
    [pageCount],
  );

  // 나가던 세 나눔은 다 빠진 뒤 지운다
  useEffect(() => {
    if (!view.out) return;
    const t = window.setTimeout(() => setView((v) => ({ ...v, out: null })), OUT_MS);
    return () => window.clearTimeout(t);
  }, [view.out]);

  // 처음 보일 때 들어오기, 보일 때만 넘기기
  const viewportRef = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (e.isIntersecting) setShown(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const held = useRef(false);
  useEffect(() => {
    if (!shown || pageCount < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 0;
    const arm = (ms: number) => {
      t = window.setTimeout(() => {
        // 지금은 넘길 때가 아니면 조금 뒤 다시 본다
        if (held.current || !visible.current || document.hidden) arm(1000);
        else go(page + 1, 1);
      }, ms);
    };
    arm(AUTO_MS);
    return () => window.clearTimeout(t);
    // view.seq: 손으로 넘겼을 때도 다음 넘김까지 처음부터 다시 센다
  }, [shown, pageCount, page, view.seq, go]);

  // 묶음마다 줄 수가 달라도 카드 높이가 들썩이지 않게 — 가장 컸던 높이를 유지
  const currentRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState(0);
  useEffect(() => {
    const el = currentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setMinHeight((h) => Math.max(h, el.offsetHeight)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [view.seq]);

  // 좌우로 밀기: 가로로 확실히 움직였을 때만 잡는다 — 세로 스크롤을 방해하지 않게
  const drag = useRef<{ x: number; y: number; dx: number; active: boolean } | null>(null);
  // 밀어서 넘긴 직후 손을 뗀 자리의 말풍선 링크가 눌리지 않게
  const swiped = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, active: false };
    swiped.current = false;
    held.current = true;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = currentRef.current;
    if (!d || !el || pageCount < 2) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        held.current = false;
      } else if (Math.abs(dx) > 8) {
        d.active = true;
        swiped.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        el.style.transition = "none";
      }
      return;
    }
    d.dx = dx;
    el.style.transform = `translateX(${dx}px)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    held.current = false;
    if (!d?.active) return;
    if (Math.abs(d.dx) >= SWIPE_PX) {
      go(d.dx < 0 ? page + 1 : page - 1, d.dx < 0 ? 1 : -1, d.dx);
    } else if (currentRef.current) {
      // 덜 밀었으면 제자리로
      currentRef.current.style.transition = "transform .25s var(--ease-sheet)";
      currentRef.current.style.transform = "";
    }
  };

  const rows = (p: number, entering: boolean) =>
    pages[p]?.map((c, i) => (
      <ShareBubble
        key={c.id}
        c={c}
        showChapter={showChapter}
        className={entering ? (shown ? "bubble-row-in" : "opacity-0") : ""}
        style={entering ? ({ "--d": `${(view.seq > 0 ? ENTER_AFTER_MS : 0) + i * ROW_STAGGER_MS}ms` } as React.CSSProperties) : undefined}
      />
    ));

  const dirVar = { "--dir": view.dir } as React.CSSProperties;

  return (
    <>
      <div
        ref={viewportRef}
        aria-roledescription="carousel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          // 마우스를 누른 채 밖으로 나가면(끌기 전) 멈춤을 풀어 준다
          if (!drag.current?.active) {
            drag.current = null;
            held.current = false;
          }
        }}
        onClickCapture={(e) => {
          if (swiped.current) {
            e.preventDefault();
            e.stopPropagation();
            swiped.current = false;
          }
        }}
        // 키보드로 말풍선·하트에 머무는 동안도 넘기지 않는다
        onFocus={() => (held.current = true)}
        onBlur={() => (held.current = false)}
        style={{ minHeight }}
        className="-mx-5 mt-4 grid touch-pan-y overflow-hidden px-5 select-none"
      >
        {view.out && (
          <div
            key={`out-${view.seq}`}
            aria-hidden
            inert
            className="bubble-page-out pointer-events-none flex flex-col gap-3.5 [grid-area:1/1]"
            style={{ ...dirVar, "--from": `${view.out.from}px` } as React.CSSProperties}
          >
            {rows(view.out.page, false)}
          </div>
        )}
        <div
          key={view.seq}
          ref={currentRef}
          aria-label={pageCount > 1 ? `${pageCount}묶음 중 ${page + 1}번째` : undefined}
          className="flex flex-col gap-3.5 self-start [grid-area:1/1]"
          style={dirVar}
        >
          {rows(page, true)}
        </div>
      </div>
      {pageCount > 1 && (
        <div className="mt-2 flex justify-center">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}번째 묶음 보기`}
              aria-current={i === page || undefined}
              onClick={() => i !== page && go(i, i > page ? 1 : -1)}
              className="flex h-6 items-center px-1"
            >
              <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === page ? "w-4 bg-main" : "w-1.5 bg-line"}`} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/** 나눔 한 개: 아바타 옆 말풍선(누르면 그 장 본문 아래의 이 나눔으로 — 가서 강조된다) + 공감 하트 */
function ShareBubble({
  c,
  showChapter,
  className,
  style,
}: {
  c: SharedComment;
  showChapter: boolean;
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <figure className={`flex items-end gap-2.5 ${className}`} style={style}>
      <Avatar avatarKey={c.author.avatarKey} size={36} className="mb-1 shrink-0" />
      {/* 꼬리 쪽 모서리를 덜 둥글게 — 옆 아바타가 하는 말로 읽히게 */}
      <blockquote className="min-w-0 flex-1 rounded-[16px] rounded-bl-[5px] bg-bg">
        <Link href={`/day/${c.dayNo}#${shareAnchor(c.id)}`} draggable={false} className="block px-3.5 pt-2 pb-2.5">
          <span className="flex items-center gap-1.5 text-caption">
            <b className="truncate font-semibold text-main">{c.author.name}</b>
            <span className="shrink-0 text-mute">
              {showChapter ? `${c.dayNo}장 · ${JOURNEY_DAYS[c.dayNo - 1].place}` : c.timeLabel}
            </span>
          </span>
          <span className="mt-0.5 line-clamp-3 text-[13.5px] leading-[1.5] font-medium break-keep [overflow-wrap:anywhere] text-text">
            {c.content}
          </span>
        </Link>
      </blockquote>
      <LikeHeart id={c.id} liked={c.likedByMe} count={c.likeCount} />
    </figure>
  );
}

/**
 * 홈에서 바로 공감(2026-11-01). 보기만 하던 카드를 반응하는 카드로 — 누르면 하트가 통 튀고 숫자가 바로 바뀐다.
 * 묶음이 넘어갔다 돌아와도 누른 상태가 남도록 서버 결과를 모듈에 기억해 둔다(새로고침하면 서버 값으로).
 */
const likeMemo = new Map<number, { liked: boolean; count: number }>();

function LikeHeart({ id, liked: initialLiked, count: initialCount }: { id: number; liked: boolean; count: number }) {
  const [state, setState] = useState(() => likeMemo.get(id) ?? { liked: initialLiked, count: initialCount });
  const [pop, setPop] = useState(0);
  const [, startTransition] = useTransition();

  const toggle = () => {
    const prev = state;
    const next = { liked: !prev.liked, count: prev.count + (prev.liked ? -1 : 1) };
    // 낙관적 반영 → 서버 결과로 맞춘다
    setState(next);
    likeMemo.set(id, next);
    if (next.liked) setPop((n) => n + 1);
    startTransition(async () => {
      try {
        const r = await setLikeAction(id, next.liked);
        const settled = r.status === "ok" ? { liked: r.liked, count: r.likeCount } : prev;
        setState(settled);
        likeMemo.set(id, settled);
      } catch {
        setState(prev);
        likeMemo.set(id, prev);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.liked}
      aria-label={`공감 ${state.count}`}
      className={`flex min-h-11 w-9 shrink-0 flex-col self-center items-center justify-center gap-0.5 text-[11.5px] font-semibold ${
        state.liked ? "text-main" : "text-mute"
      }`}
    >
      <svg
        key={pop}
        viewBox="0 0 24 24"
        className={`size-[18px] ${pop ? "like-pop" : ""}`}
        fill={state.liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
      </svg>
      <span className="min-h-[14px] leading-none">{state.count > 0 ? state.count : ""}</span>
    </button>
  );
}
