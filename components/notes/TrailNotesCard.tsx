"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { setTrailNoteHiddenAction } from "@/app/actions/notes";
import { CardHead } from "@/components/ui";
import type { TrailNote } from "@/lib/data/notes";
import { NoteBubble } from "./NoteBubble";

/** 한 번에 보여 주는 사람 수 — 휴대폰 한 화면에서 말풍선을 끝까지 읽을 수 있는 만큼 */
const PER_PAGE = 3;
/** 다음 세 사람으로 넘어가는 간격 — 짧은 한마디 셋을 읽기에 넉넉하게 */
const AUTO_MS = 5000;
const ROW_STAGGER_MS = 110;
/** 나가는 세 사람이 빠지기 시작한 뒤 들어오기 */
const ENTER_AFTER_MS = 140;
const OUT_MS = 260;
/** 이만큼 옆으로 밀면 넘긴다 */
const SWIPE_PX = 48;

type View = { page: number; dir: 1 | -1; seq: number; out: { page: number; from: number } | null };

/**
 * 홈 "앞서 간 동행자들"(ADR-028): 세 사람씩 묶어 보여 주고, 몇 초마다 다음 세 사람이 옆에서 한 줄씩 "착착착" 들어온다.
 * 흐르는 글(마퀴)은 읽기 어려워서 멈춘 채 읽고 넘어가는 방식으로 바꿨다(2026-10-30).
 * - 손가락으로 좌우로 밀면 넘기고(세로 스크롤은 그대로), 누르고 있는 동안은 넘어가지 않는다
 * - 카드가 화면 밖이거나 탭이 가려져 있거나 "동작 줄이기"면 저절로 넘기지 않는다
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
  const pages: TrailNote[][] = [];
  for (let i = 0; i < notes.length; i += PER_PAGE) pages.push(notes.slice(i, i + PER_PAGE));
  const pageCount = pages.length;

  const [view, setView] = useState<View>({ page: 0, dir: 1, seq: 0, out: null });
  // 숨기기 등으로 한마디 수가 줄면 없는 묶음을 가리키지 않게
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

  // 나가던 세 사람은 다 빠진 뒤 지운다
  useEffect(() => {
    if (!view.out) return;
    const t = window.setTimeout(() => setView((v) => ({ ...v, out: null })), OUT_MS);
    return () => window.clearTimeout(t);
  }, [view.out]);

  // 처음 보일 때 들어오기, 보일 때만 넘기기
  const viewportRef = useRef<HTMLDivElement>(null);
  const visible = useRef(false);
  const [shown, setShown] = useState(false);
  const hasNotes = notes.length > 0;
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (e.isIntersecting) setShown(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNotes]);

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
  }, [view.seq, hasNotes]);

  // 좌우로 밀기: 가로로 확실히 움직였을 때만 잡는다 — 세로 스크롤을 방해하지 않게
  const drag = useRef<{ x: number; y: number; dx: number; active: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, active: false };
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
    pages[p]?.map((n, i) => (
      <NoteBubble
        key={n.id}
        layout="row"
        avatarKey={n.avatarKey}
        content={n.content}
        mine={n.mine}
        hidden={n.hidden}
        className={entering ? (shown ? "note-row-in" : "opacity-0") : ""}
        style={entering ? ({ "--d": `${(view.seq > 0 ? ENTER_AFTER_MS : 0) + i * ROW_STAGGER_MS}ms` } as React.CSSProperties) : undefined}
      >
        {isAdmin && entering && <HideButton id={n.id} hidden={n.hidden} />}
      </NoteBubble>
    ));

  const dirVar = { "--dir": view.dir } as React.CSSProperties;

  return (
    <section aria-labelledby="notes-title" className="mx-gutter mt-3 rounded-card bg-surface pt-5 pb-5">
      <div className="px-5">
        <CardHead id="notes-title" title={title} sub={sub} />
      </div>
      {notes.length === 0 ? (
        <div className="px-5 pt-3 text-small leading-6 text-mute">{empty}</div>
      ) : (
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
            style={{ minHeight }}
            className="mt-4 grid touch-pan-y overflow-hidden px-5 select-none"
          >
            {view.out && (
              <div
                key={`out-${view.seq}`}
                aria-hidden
                inert
                className="note-page-out pointer-events-none flex flex-col gap-3.5 [grid-area:1/1]"
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
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${i === page ? "w-4 bg-main" : "w-1.5 bg-line"}`}
                  />
                </button>
              ))}
            </div>
          )}
        </>
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
      className="mb-1 min-h-8 shrink-0 px-2 text-[11px] font-semibold text-main"
    >
      {hidden ? "복구" : "숨기기"}
    </button>
  );
}
