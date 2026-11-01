"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import type { ChapterStatus } from "@/lib/journey/mapState";
import {
  introMs,
  PATH_SEEN_COOKIE,
  PATH_SEEN_MAX_AGE,
  type PathMotion,
  START_MS,
  stepMs,
} from "@/lib/journey/pathMotion";
import { ChapterSheet } from "./ChapterSheet";

/**
 * 'ㄹ'자 진행도: 6장씩 4줄, 줄이 바뀔 때 반원으로 꺾인다(디자인 시안 v5).
 * - 칸 상태: 읽음(채움) / 공개됐지만 안 읽음(점선) / 아직 열리지 않음(옅은 테두리) — 칸마다 실제 완료 여부
 * - 내 아바타 = 1장부터 이어서 읽은 마지막 장(없으면 1장 앞 출발점)
 * - 깃발 = 오늘의 장(주일에는 가장 최근에 열린 장)
 * - 칸을 누르면 그 장 본문으로 바로 간다("이어 읽기"와 같은 경험 — 장 소개는 본문 맨 위에서).
 *   아직 열리지 않은 장만 언제 열리는지 작은 시트로 알린다(2026-10-26)
 * - [2026-11-01] 길은 그날 열린다: 아직 열리지 않은 장은 장소 대신 여는 날짜(11/12)만 보인다.
 *   그날 처음 볼 때(intro) 오늘 열린 장의 날짜가 장소 이름으로 바뀌며 톡 떠오른다
 */

const W = 330;
// 줄 간격은 깃발(칸 위 54px)과 그 옆 문구가 윗줄 장소 이름과 겹치지 않을 만큼 둔다
const X0 = 40;
const X1 = 290;
const DX = (X1 - X0) / 5;
const Y0 = 70;
const DY = 94;
const H = Y0 + 3 * DY + 42;
/** 줄이 바뀌는 곳의 곡선: 가로 반지름은 좌우 여백 안에 들도록 작게, 세로는 줄 간격의 절반 */
const RX = 37;
const RY = DY / 2;

function pos(n: number) {
  const row = Math.floor((n - 1) / 6);
  const i = (n - 1) % 6;
  return { x: row % 2 ? X1 - i * DX : X0 + i * DX, y: Y0 + row * DY, row };
}

/** a장 → b장 경로 (줄이 바뀌는 곳은 반원) */
function segment(a: number, b: number): string {
  const p = pos(a);
  let d = `M${p.x},${p.y}`;
  for (let n = a; n < b; n++) {
    const c = pos(n);
    const q = pos(n + 1);
    d += q.row === c.row ? ` L${q.x},${q.y}` : ` A${RX},${RY} 0 0 ${c.row % 2 ? 0 : 1} ${q.x},${q.y}`;
  }
  return d;
}

/** 출발 전 아바타 자리: 1장 칸 왼쪽 */
const START = { x: X0 - 30, y: Y0 };

export type ChapterPathProps = {
  statuses: ChapterStatus[];
  position: number;
  flag: { day: number; label: string; sub: string } | null;
  avatarKey: string;
  /** 이번에 보여 줄 연출(서버가 쿠키로 정한다, lib/journey/pathMotion) */
  motion?: PathMotion;
  /** 보고 나서 쿠키에 남길 값 */
  seen?: string;
  /** 오늘 열린 장 — 그날 처음 볼 때 이 칸의 장소 이름이 드러난다 */
  revealDay?: number | null;
};

/** 열리기 전 칸 아래 글자: 11/12 */
function shortDate(date: string) {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

const STATUS_LABEL: Record<ChapterStatus, string> = { done: "읽음", open: "읽을 차례", locked: "아직 열리지 않음" };


export function ChapterPath({ statuses, position, flag, avatarKey, motion = { kind: "none" }, seen, revealDay = null }: ChapterPathProps) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const select = (day: number) => {
    if (statuses[day - 1] === "locked") setOpenDay(day);
    else router.push(`/day/${day}`);
  };
  // 연출은 처음 그릴 때 정한 것만 — 새로고침(router.refresh)으로 props 가 바뀌어도 다시 하지 않는다
  const [anim] = useState(motion);
  const from = anim.kind === "step" ? anim.from : position;
  const per = anim.kind === "step" ? stepMs(position - from) : 0;
  const intro = anim.kind === "intro" ? introMs(position) : 0;
  const [meDay, setMeDay] = useState(from);

  useEffect(() => {
    if (seen) document.cookie = `${PATH_SEEN_COOKIE}=${encodeURIComponent(seen)}; path=/; max-age=${PATH_SEEN_MAX_AGE}; samesite=lax`;
  }, [seen]);

  // 한 칸씩 걸어간다
  useEffect(() => {
    if (anim.kind !== "step") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    for (let d = from + 1; d <= position; d++) {
      // 동작 줄이기면 한 번에 도착
      const at = reduced ? 0 : START_MS + (d - from - 1) * per;
      timers.push(window.setTimeout(() => setMeDay(d), at));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [anim.kind, from, position, per]);

  /** 칸이 "톡" 채워지는 때(ms). null 이면 처음부터 채워져 있다 */
  const popAt = (day: number): number | null => {
    if (statuses[day - 1] !== "done") return null;
    if (anim.kind === "step") return day > from && day <= position ? START_MS + (day - from - 0.2) * per : null;
    if (anim.kind === "intro") {
      if (day > position) return START_MS + intro + 100;
      return START_MS + (position > 1 ? ((day - 1) / (position - 1)) * intro : 0) + 60;
    }
    return null;
  };
  // 연출이 끝나는 때 — 깃발까지의 점선은 그 뒤에 나타난다
  const settleAt = anim.kind === "step" ? START_MS + (position - from) * per : anim.kind === "intro" ? START_MS + intro : 0;

  // 오늘 열린 장소 드러내기: 그날 처음 보는 연출(intro)에서만, 길 그리기가 끝난 뒤
  const reveal = (day: number) => anim.kind === "intro" && day === revealDay;

  const me = meDay > 0 ? pos(meDay) : START;
  const flagPos = flag ? pos(flag.day) : null;
  const total = statuses.length;
  const read = statuses.filter((s) => s === "done").length;
  const pathFrom = Math.max(from, 1);

  return (
    <div className="relative mt-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={`24장 진행도: ${read}장 읽음${position ? `, ${position}장까지 이어 읽음` : ""}${flag ? `, ${flag.label}` : ""}`}
        className="block h-auto w-full font-sans"
      >
        <path d={segment(1, total)} fill="none" stroke="var(--color-soft)" strokeWidth="6" strokeLinecap="round" />
        {anim.kind === "none" && position > 1 && <Progress d={segment(1, position)} />}
        {anim.kind === "intro" && position > 1 && (
          <Progress d={segment(1, position)} draw={{ delay: START_MS, duration: intro, ease: "var(--ease-journey)" }} />
        )}
        {anim.kind === "step" && (
          <>
            {pathFrom > 1 && <Progress d={segment(1, pathFrom)} />}
            {position > pathFrom && (
              <Progress
                d={segment(pathFrom, position)}
                // 아바타가 칸에 닿는 속도에 맞춰 일정하게
                draw={{ delay: START_MS + (from === 0 ? per : 0), duration: (position - pathFrom - 0.2) * per, ease: "linear" }}
              />
            )}
          </>
        )}
        {flag && flag.day > Math.max(position, 1) && (
          <path
            d={segment(Math.max(position, 1), flag.day)}
            fill="none"
            stroke="var(--color-main)"
            strokeWidth="2"
            strokeDasharray="1 6"
            strokeLinecap="round"
            className={settleAt ? "map-fade-in" : undefined}
            style={settleAt ? { animationDelay: `${settleAt}ms` } : undefined}
          />
        )}

        {JOURNEY_DAYS.map((d, i) => {
          const p = pos(d.day);
          const st = statuses[i];
          const strong = d.day === flag?.day || d.day === position;
          const pop = popAt(d.day);
          // 톡 채워지기 전에는 실선 테두리만 — 그 위에 채운 원이 떠오른다
          const filled = st === "done" && pop === null;
          return (
            <g
              key={d.day}
              role={st === "locked" ? "button" : "link"}
              tabIndex={0}
              aria-label={st === "locked" ? `${d.day}장, ${STATUS_LABEL[st]}` : `${d.day}장 ${d.place}, ${STATUS_LABEL[st]}`}
              aria-haspopup={st === "locked" ? "dialog" : undefined}
              className="cursor-pointer outline-none [&:focus-visible>circle:nth-child(2)]:stroke-[3]"
              onClick={() => select(d.day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select(d.day);
                }
              }}
            >
              {/* 터치 영역 44px 이상 */}
              <circle cx={p.x} cy={p.y} r="24" fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r="14"
                fill={filled ? "var(--color-main)" : "var(--color-surface)"}
                stroke={st === "locked" ? "var(--color-line)" : "var(--color-main)"}
                strokeWidth={st === "open" ? 1.8 : 1.4}
                strokeDasharray={st === "open" ? "3.4 2.6" : undefined}
              />
              <text
                x={p.x}
                y={p.y + 4.2}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={filled ? "#fff" : st === "locked" ? "var(--color-mid)" : "var(--color-main)"}
              >
                {d.day}
              </text>
              {pop !== null && (
                <g className="path-pop" style={{ animationDelay: `${pop}ms` }} aria-hidden>
                  <circle cx={p.x} cy={p.y} r="14" fill="var(--color-main)" />
                  <text x={p.x} y={p.y + 4.2} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
                    {d.day}
                  </text>
                </g>
              )}
              {st === "locked" || reveal(d.day) ? (
                <text
                  x={p.x}
                  y={p.y + 33}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={500}
                  fill="var(--color-mid)"
                  className={reveal(d.day) ? "path-label-out" : undefined}
                  style={reveal(d.day) ? { animationDelay: `${settleAt}ms` } : undefined}
                >
                  {shortDate(d.readingDate)}
                </text>
              ) : null}
              {st !== "locked" && (
                <text
                  x={p.x}
                  y={p.y + 33}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={strong ? 700 : 500}
                  fill={strong ? "var(--color-main)" : "var(--color-mute)"}
                  className={reveal(d.day) ? "path-label-in" : undefined}
                  style={reveal(d.day) ? { animationDelay: `${settleAt + 120}ms` } : undefined}
                >
                  {d.place}
                </text>
              )}
            </g>
          );
        })}

        {flag && flagPos && <PathFlag x={flagPos.x} y={flagPos.y} label={flag.label} sub={flag.sub} />}
      </svg>

      {/* 내 아바타 (칸 위에 겹쳐 놓고, 위치가 바뀌면 한 칸씩 통통 걸어간다) */}
      <div
        className="pointer-events-none absolute z-[2] -mt-[18px] -ml-[18px] size-9 transition-[left,top] duration-700 ease-journey"
        style={{
          left: `${(me.x / W) * 100}%`,
          top: `${(me.y / H) * 100}%`,
          ...(per ? { transitionDuration: `${per * 0.8}ms`, transitionTimingFunction: "ease-in-out" } : null),
        }}
        aria-hidden
      >
        <div
          key={meDay}
          className={`size-9 rounded-full shadow-[0_0_0_2.5px_var(--color-surface),0_0_0_4.5px_var(--color-main),0_6px_14px_-4px_rgba(0,0,0,0.3)] ${
            anim.kind === "intro" ? "path-pop" : per && meDay !== from ? "path-hop" : ""
          }`}
          style={
            anim.kind === "intro"
              ? { animationDelay: `${START_MS + intro}ms` }
              : per
                ? { animationDuration: `${per * 0.8}ms` }
                : undefined
          }
        >
          <Avatar avatarKey={avatarKey} size={36} ring={false} />
        </div>
      </div>

      {openDay !== null && <ChapterSheet day={JOURNEY_DAYS[openDay - 1]} onClose={() => setOpenDay(null)} />}
    </div>
  );
}

/** 걸은 길(진한 선). draw 가 있으면 pathLength=1 기준으로 그려 나간다 */
function Progress({ d, draw }: { d: string; draw?: { delay: number; duration: number; ease: string } }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--color-main)"
      strokeWidth="6"
      strokeLinecap="round"
      pathLength={draw ? 1 : undefined}
      className={draw ? "path-draw" : undefined}
      style={draw ? { animation: `map-draw ${Math.max(draw.duration, 1)}ms ${draw.ease} ${draw.delay}ms forwards` } : undefined}
    />
  );
}

/**
 * 깃발 천의 물결 — 깃대에서 꼬리 쪽으로 물결이 지나간다.
 * 위·아래 가장자리를 같은 만큼 함께 움직여 천의 폭이 늘 같다 — 처음엔 두 가장자리가 따로 움직여
 * 천이 꿈틀거리듯 오므라들고 늘어나 보였다. 깃대 쪽은 움직이지 않고, 꼬리로 갈수록 더 흔들린다.
 * 천 길이는 24(세로 15의 약 1.5배) — 28이면 옆 이름표·짧은 깃대에 비해 길어 보였다.
 */
function flagPath(x: number, top: number, phase: number, amp: number) {
  const dy = (px: number) => Math.round((px / 24) * amp * Math.sin((2 * Math.PI * px) / 29 - phase) * 10) / 10;
  const [a, b, c, n] = [dy(9), dy(16), dy(24), dy(20.5)];
  return (
    `M${x + 1},${top} C${x + 9},${top - 1 + a} ${x + 16},${top + 1 + b} ${x + 24},${top + 1 + c} ` +
    `L${x + 20.5},${top + 8.5 + n} L${x + 24},${top + 16 + c} ` +
    `C${x + 16},${top + 15 + b} ${x + 9},${top + 13 + a} ${x + 1},${top + 15}Z`
  );
}

/**
 * 바람(2026-10-30): 늘 펄럭이면 읽는 동안 시야 한쪽이 계속 신경 쓰여서, 들어올 때 한 번 크게 펄럭이고
 * 그 뒤로는 잔잔히 살랑이다가 8~12초마다 불규칙하게 바람이 분다. false 면 늘 바람이 부는 것처럼 계속 펄럭인다.
 */
const FLAG_GUSTS = true;
const FLAG = {
  /** 바람이 셀 때 / 잔잔할 때 꼬리 끝 흔들림 */
  gustAmp: 3.4,
  calmAmp: 0.7,
  /** 물결 하나가 지나가는 시간(ms) — 바람이 셀수록 빠르게 */
  gustPeriod: 1300,
  calmPeriod: 3600,
  /** 들어올 때 바람 / 이후 바람 길이, 바람 사이 쉬는 시간(ms) */
  firstGust: 4200,
  gust: [2600, 3800],
  rest: [8000, 12000],
};
const between = ([lo, hi]: number[]) => lo + Math.random() * (hi - lo);

function PathFlag({ x, y, label, sub }: { x: number; y: number; label: string; sub: string }) {
  const top = y - 54;
  const left = x > 200;
  const tx = left ? x - 8 : x + 30;
  const clothRef = useRef<SVGPathElement>(null);

  // SMIL 로는 바람 세기를 바꿀 수 없어 프레임마다 모양을 직접 그린다(작은 path 하나라 가볍다).
  // 화면 밖이면 멈추고, "동작 줄이기"면 처음 모양 그대로 둔다
  useEffect(() => {
    const cloth = clothRef.current;
    if (!cloth || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = performance.now();
    let phase = 0;
    let gustStart = last;
    let gustLength = FLAG.firstGust;
    let nextGust = gustStart + gustLength + between(FLAG.rest);

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      if (now >= nextGust) {
        gustStart = now;
        gustLength = between(FLAG.gust);
        nextGust = now + gustLength + between(FLAG.rest);
      }
      // 바람 세기 0→1→0: 부드럽게 불었다 잦아든다
      const t = (now - gustStart) / gustLength;
      const wind = !FLAG_GUSTS ? 1 : t < 1 ? Math.sin(Math.PI * t) ** 2 : 0;
      const amp = FLAG.calmAmp + (FLAG.gustAmp - FLAG.calmAmp) * wind;
      const period = FLAG.calmPeriod + (FLAG.gustPeriod - FLAG.calmPeriod) * wind;
      phase = (phase + (2 * Math.PI * dt) / period) % (2 * Math.PI);
      cloth.setAttribute("d", flagPath(x, top, phase, amp));
      frame = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(frame);
      if (e.isIntersecting) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    });
    io.observe(cloth);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [x, top]);

  return (
    <g aria-hidden>
      <line x1={x} y1={y - 14} x2={x} y2={top} stroke="var(--color-main)" strokeWidth="2" strokeLinecap="round" />
      <path ref={clothRef} d={flagPath(x, top, 0, FLAG.calmAmp)} fill="var(--color-main)" />
      <text x={tx} y={top + 10} textAnchor={left ? "end" : "start"} fontSize="11.5" fontWeight="700" fill="var(--color-main)">
        {label}
      </text>
      <text x={tx} y={top + 24} textAnchor={left ? "end" : "start"} fontSize="10.5" fontWeight="500" fill="var(--color-mute)">
        {sub}
      </text>
    </g>
  );
}
