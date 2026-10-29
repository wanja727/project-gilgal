"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setTrailNoteHiddenAction } from "@/app/actions/notes";
import { CardHead } from "@/components/ui";
import type { TrailNote } from "@/lib/data/notes";
import { NoteBubble } from "./NoteBubble";

const SPEED_PX_PER_SEC = 18;
const RESUME_AFTER_MS = 3000;
const POP_STAGGER_MS = 90;

/**
 * 홈 "앞서 간 동행자들"(ADR-028): 아바타 말풍선이 옆으로 늘어서 천천히 흘러간다 — 사람들이 걸어가듯.
 * - 카드가 처음 보이면 말풍선이 하나씩 떠오른 뒤 흐르기 시작한다
 * - 끝까지 가면 처음 사람이 다시 이어 붙어 끊김 없이 돈다(같은 줄을 한 번 더 그려 둔다)
 * - 손으로 누르거나 밀면 바로 멈추고, 손을 떼고 3초 뒤 그 자리에서 다시 흐른다
 * - 카드가 화면 밖이거나 "동작 줄이기"면 흐르지 않는다. 다 들어가는 수면 흐르지 않고 가운데에 모은다
 */
export function TrailNotesCard({
  title,
  sub,
  notes,
  isAdmin,
  empty,
  children,
}: {
  title: string;
  sub?: string;
  notes: TrailNote[];
  isAdmin: boolean;
  /** 아직 한마디가 없을 때 문구 */
  empty: React.ReactNode;
  /** 카드 아래(안내 문구·내 한마디 입력) */
  children?: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [shown, setShown] = useState(false);

  // 한 줄이 카드보다 길 때만 흐른다
  useEffect(() => {
    const scroller = scrollerRef.current;
    const group = groupRef.current;
    if (!scroller || !group) return;
    const ro = new ResizeObserver(() => setOverflowing(group.scrollWidth > scroller.clientWidth + 1));
    ro.observe(scroller);
    ro.observe(group);
    return () => ro.disconnect();
  }, [notes.length]);

  // 처음 보일 때 떠오르기, 보일 때만 흐르기
  const visible = useRef(false);
  const hasNotes = notes.length > 0;
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (e.isIntersecting) setShown(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNotes]);

  useEffect(() => {
    const el = scrollerRef.current;
    const group = groupRef.current;
    if (!el || !group || !overflowing || !shown) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let pos = el.scrollLeft;
    let held = false;
    // 떠오르기가 끝난 다음부터 흐른다
    let pausedUntil = performance.now() + Math.min(notes.length, 8) * POP_STAGGER_MS + 500;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      if (!held && visible.current && now >= pausedUntil) {
        const loop = group.offsetWidth; // 한 줄(뒤 여백 포함) 길이 — 여기까지 가면 처음으로
        pos += (SPEED_PX_PER_SEC * dt) / 1000;
        if (pos >= loop) pos -= loop;
        el.scrollLeft = pos;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const hold = () => {
      held = true;
    };
    const release = () => {
      held = false;
      pausedUntil = performance.now() + RESUME_AFTER_MS;
    };
    // 손으로 민 스크롤: 우리가 옮긴 자리와 다르면 사람이 움직인 것 — 그 자리부터 다시
    const onScroll = () => {
      if (Math.abs(el.scrollLeft - pos) > 1.5) {
        const loop = group.offsetWidth;
        pos = el.scrollLeft % loop;
        if (pos !== el.scrollLeft) el.scrollLeft = pos;
        pausedUntil = performance.now() + RESUME_AFTER_MS;
      }
    };
    el.addEventListener("pointerdown", hold);
    el.addEventListener("touchstart", hold, { passive: true });
    window.addEventListener("pointerup", release);
    window.addEventListener("touchend", release);
    el.addEventListener("wheel", release, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("focusin", hold);
    el.addEventListener("focusout", release);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("touchstart", hold);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("touchend", release);
      el.removeEventListener("wheel", release);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("focusin", hold);
      el.removeEventListener("focusout", release);
    };
  }, [overflowing, shown, notes.length]);

  const row = (clone: boolean) => (
    <div
      ref={clone ? undefined : groupRef}
      aria-hidden={clone || undefined}
      inert={clone || undefined}
      className="flex shrink-0 items-end gap-3 pr-3"
    >
      {notes.map((n, i) => (
        <NoteBubble
          key={n.id}
          avatarKey={n.avatarKey}
          content={n.content}
          mine={n.mine}
          hidden={n.hidden}
          className={shown ? "animate-[bubble-pop_.45s_var(--ease-sheet)_both]" : "opacity-0"}
          style={shown && !clone ? { animationDelay: `${Math.min(i, 8) * POP_STAGGER_MS}ms` } : undefined}
        >
          {isAdmin && !clone && <HideButton id={n.id} hidden={n.hidden} />}
        </NoteBubble>
      ))}
    </div>
  );

  return (
    <section aria-labelledby="notes-title" className="mx-gutter mt-3 rounded-card bg-surface pt-5 pb-5">
      <div className="px-5">
        <CardHead id="notes-title" title={title} sub={sub} />
      </div>
      {notes.length === 0 ? (
        <div className="px-5 pt-3 text-small leading-6 text-mute">{empty}</div>
      ) : (
        <div
          ref={scrollerRef}
          className="mt-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className={`flex w-max py-1 pl-5 ${overflowing ? "" : "mx-auto"}`}>
            {row(false)}
            {overflowing && row(true)}
          </div>
        </div>
      )}
      {children && <div className="mt-4 px-5">{children}</div>}
    </section>
  );
}

function HideButton({ id, hidden }: { id: number; hidden: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setTrailNoteHiddenAction(id, !hidden);
          router.refresh();
        })
      }
      className="min-h-8 px-2 text-[11px] font-semibold text-main"
    >
      {hidden ? "복구" : "숨기기"}
    </button>
  );
}
