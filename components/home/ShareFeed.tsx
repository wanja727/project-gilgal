"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { SharedComment } from "@/lib/data/comments";
import { JOURNEY_DAYS } from "@/lib/journey/days";

/** 한 번에 보이는 나눔 수 */
const VISIBLE = 3;
/** 한 칸씩 올라가는 간격 — 두 줄 나눔을 읽기에 넉넉하게. 한 나눔은 세 칸을 지나는 동안(약 20초) 화면에 머문다 */
const INTERVAL_MS = 6500;
const MOVE_MS = 450;

/**
 * 홈 나눔 미리보기 목록(2026-10-30): 몇 초마다 맨 위 나눔이 접혀 올라가고 아래에서 다음 나눔이 들어온다.
 * 한 묶음씩 갈아 끼우는 대신 한 칸씩 흘러서, 읽던 나눔이 갑자기 사라지지 않는다.
 * - 누르고 있거나(터치·마우스 올림·키보드 초점) 카드가 화면 밖이거나 탭이 가려져 있으면 멈춘다
 * - 나눔이 세 개 이하이거나 "동작 줄이기"면 흐르지 않는다
 */
export function ShareFeed({ comments, showChapter }: { comments: SharedComment[]; showChapter: boolean }) {
  const n = comments.length;
  const rotating = n > VISIBLE;
  const [view, setView] = useState<{ start: number; seq: number; leaving: SharedComment | null }>({
    start: 0,
    seq: 0,
    leaving: null,
  });
  const listRef = useRef<HTMLUListElement>(null);
  const held = useRef(false);
  const visible = useRef(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !rotating || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    io.observe(el);
    let timer = 0;
    const arm = (ms: number) => {
      timer = window.setTimeout(() => {
        // 지금은 넘길 때가 아니면 조금 뒤 다시 본다
        if (held.current || !visible.current || document.hidden) return arm(1000);
        setView((v) => ({ start: (v.start + 1) % n, seq: v.seq + 1, leaving: comments[v.start % n] }));
        arm(INTERVAL_MS);
      }, ms);
    };
    arm(INTERVAL_MS);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [rotating, n, comments]);

  // 접혀 올라간 나눔은 다 접힌 뒤 지운다
  useEffect(() => {
    if (!view.leaving) return;
    const t = window.setTimeout(() => setView((v) => ({ ...v, leaving: null })), MOVE_MS);
    return () => window.clearTimeout(t);
  }, [view.leaving]);

  const shown = Array.from({ length: Math.min(VISIBLE, n) }, (_, i) => comments[(view.start + i) % n]);
  const hold = () => (held.current = true);
  const release = () => (held.current = false);

  return (
    <ul
      ref={listRef}
      className="mt-2"
      onPointerDown={hold}
      onPointerUp={release}
      onPointerCancel={release}
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocus={hold}
      onBlur={release}
    >
      {view.leaving && <Row key={`out-${view.leaving.id}`} c={view.leaving} showChapter={showChapter} className="feed-out" />}
      {shown.map((c, i) => (
        <Row
          key={c.id}
          c={c}
          showChapter={showChapter}
          // 새로 들어오는 맨 아래 칸만
          className={view.seq > 0 && i === shown.length - 1 ? "feed-in" : ""}
        />
      ))}
    </ul>
  );
}

function Row({ c, showChapter, className }: { c: SharedComment; showChapter: boolean; className: string }) {
  return (
    <li className={`border-t border-soft first:border-t-0 ${className}`} aria-hidden={className === "feed-out" || undefined}>
      <div className="min-h-0 overflow-hidden">
        <Link href={`/day/${c.dayNo}#share`} className="flex items-start gap-3 py-3.5" tabIndex={className === "feed-out" ? -1 : undefined}>
          <Avatar avatarKey={c.author.avatarKey} size={30} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-small font-semibold text-main">
              <span className="truncate">{c.author.name}</span>
              <span className="shrink-0 text-caption font-medium text-mute">
                {showChapter ? `${c.dayNo}장 · ${JOURNEY_DAYS[c.dayNo - 1].place}` : c.timeLabel}
              </span>
            </p>
            <p className="mt-1 line-clamp-2 text-sub leading-[1.6] text-text">{c.content}</p>
          </div>
          {c.likeCount > 0 && (
            <span className="flex shrink-0 items-start gap-1 pt-0.5 text-caption font-semibold text-mute" aria-label={`공감 ${c.likeCount}`}>
              <svg viewBox="0 0 24 24" className="mt-px size-[13px]" fill="currentColor" aria-hidden>
                <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
              </svg>
              {c.likeCount}
            </span>
          )}
        </Link>
      </div>
    </li>
  );
}
