"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/Avatar";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import type { ChapterStatus } from "@/lib/journey/mapState";
import { ChapterSheet } from "./ChapterSheet";

/**
 * 'ㄹ'자 진행도: 6장씩 4줄, 줄이 바뀔 때 반원으로 꺾인다(디자인 시안 v5).
 * - 칸 상태: 읽음(채움) / 공개됐지만 안 읽음(점선) / 아직 열리지 않음(옅은 테두리) — 칸마다 실제 완료 여부
 * - 내 아바타 = 1장부터 이어서 읽은 마지막 장(없으면 1장 앞 출발점)
 * - 깃발 = 오늘의 장(주일에는 가장 최근에 열린 장)
 * - 칸을 누르면 그 장 본문으로 바로 간다("이어 읽기"와 같은 경험 — 장 소개는 본문 맨 위에서).
 *   아직 열리지 않은 장만 언제 열리는지 작은 시트로 알린다(2026-10-26)
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
};

const STATUS_LABEL: Record<ChapterStatus, string> = { done: "읽음", open: "읽을 차례", locked: "아직 열리지 않음" };

export function ChapterPath({ statuses, position, flag, avatarKey }: ChapterPathProps) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const select = (day: number) => {
    if (statuses[day - 1] === "locked") setOpenDay(day);
    else router.push(`/day/${day}`);
  };
  const me = position > 0 ? pos(position) : START;
  const flagPos = flag ? pos(flag.day) : null;
  const total = statuses.length;
  const read = statuses.filter((s) => s === "done").length;

  return (
    <div className="relative mt-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={`24장 진행도: ${read}장 읽음${position ? `, ${position}장까지 이어 읽음` : ""}${flag ? `, ${flag.label}` : ""}`}
        className="block h-auto w-full font-sans"
      >
        <path d={segment(1, total)} fill="none" stroke="var(--color-soft)" strokeWidth="6" strokeLinecap="round" />
        {position > 1 && (
          <path d={segment(1, position)} fill="none" stroke="var(--color-main)" strokeWidth="6" strokeLinecap="round" />
        )}
        {flag && flag.day > Math.max(position, 1) && (
          <path
            d={segment(Math.max(position, 1), flag.day)}
            fill="none"
            stroke="var(--color-main)"
            strokeWidth="2"
            strokeDasharray="1 6"
            strokeLinecap="round"
          />
        )}

        {JOURNEY_DAYS.map((d, i) => {
          const p = pos(d.day);
          const st = statuses[i];
          const strong = d.day === flag?.day || d.day === position;
          return (
            <g
              key={d.day}
              role={st === "locked" ? "button" : "link"}
              tabIndex={0}
              aria-label={`${d.day}장 ${d.place}, ${STATUS_LABEL[st]}`}
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
                fill={st === "done" ? "var(--color-main)" : "var(--color-surface)"}
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
                fill={st === "done" ? "#fff" : st === "open" ? "var(--color-main)" : "var(--color-mid)"}
              >
                {d.day}
              </text>
              <text
                x={p.x}
                y={p.y + 33}
                textAnchor="middle"
                fontSize="10"
                fontWeight={strong ? 700 : 500}
                fill={strong ? "var(--color-main)" : "var(--color-mute)"}
              >
                {d.place}
              </text>
            </g>
          );
        })}

        {flag && flagPos && <PathFlag x={flagPos.x} y={flagPos.y} label={flag.label} sub={flag.sub} />}
      </svg>

      {/* 내 아바타 (칸 위에 겹쳐 놓고, 위치가 바뀌면 미끄러지듯 이동) */}
      <div
        className="pointer-events-none absolute z-[2] -mt-[18px] -ml-[18px] size-9 rounded-full shadow-[0_0_0_2.5px_var(--color-surface),0_0_0_4.5px_var(--color-main),0_6px_14px_-4px_rgba(0,0,0,0.3)] transition-[left,top] duration-700 ease-journey"
        style={{ left: `${(me.x / W) * 100}%`, top: `${(me.y / H) * 100}%` }}
        aria-hidden
      >
        <Avatar avatarKey={avatarKey} size={36} ring={false} />
      </div>

      {openDay !== null && (
        <ChapterSheet day={JOURNEY_DAYS[openDay - 1]} onClose={() => setOpenDay(null)} />
      )}
    </div>
  );
}

/**
 * 깃발 천의 물결 — 위·아래 가장자리 곡선의 제어점과 꼬리 끝을 조금씩 옮긴 세 모양.
 * 같은 명령 구조라 SMIL <animate> 로 모양 사이를 부드럽게 오간다(CSS d 애니메이션은 Safari 미지원).
 * 깃대 쪽(x+1)은 고정이라 천만 바람에 날린다.
 */
const FLAG_WAVES: [number, number, number, number, number, number, number, number, number, number][] = [
  // 위 곡선 c1y, c2y, 끝y · 꼬리 홈 x · 아래 끝 x/y · 아래 곡선 c1y, c2y · 위 끝 x · 꼬리 홈 y
  [-2, 4, 2, 24, 28, 16, 18, 12, 28, 9],
  [3, -2, 1, 25, 28, 15, 12, 18, 28, 8.5],
  [-1, 1, 3, 23, 27, 17, 15, 16, 27, 10],
];
function flagPath(x: number, top: number, w: (typeof FLAG_WAVES)[number]) {
  const [c1, c2, end, notchX, bx, by, d1, d2, ex, notchY] = w;
  return (
    `M${x + 1},${top} C${x + 10},${top + c1} ${x + 18},${top + c2} ${x + ex},${top + end} ` +
    `L${x + notchX},${top + notchY} L${x + bx},${top + by} ` +
    `C${x + 18},${top + d1} ${x + 10},${top + d2} ${x + 1},${top + 15}Z`
  );
}

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

function PathFlag({ x, y, label, sub }: { x: number; y: number; label: string; sub: string }) {
  const top = y - 54;
  const left = x > 200;
  const tx = left ? x - 8 : x + 34;
  // SMIL 은 CSS 의 "동작 줄이기" 규칙이 닿지 않아 직접 확인한다
  const still = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [a, b, c] = FLAG_WAVES.map((w) => flagPath(x, top, w));
  return (
    <g aria-hidden>
      <line x1={x} y1={y - 14} x2={x} y2={top} stroke="var(--color-main)" strokeWidth="2" strokeLinecap="round" />
      <path d={a} fill="var(--color-main)">
        {!still && (
          <animate
            attributeName="d"
            dur="2.4s"
            repeatCount="indefinite"
            values={`${a};${b};${c};${a}`}
            calcMode="spline"
            keyTimes="0;0.35;0.7;1"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
          />
        )}
      </path>
      <text x={tx} y={top + 10} textAnchor={left ? "end" : "start"} fontSize="11.5" fontWeight="700" fill="var(--color-main)">
        {label}
      </text>
      <text x={tx} y={top + 24} textAnchor={left ? "end" : "start"} fontSize="10.5" fontWeight="500" fill="var(--color-mute)">
        {sub}
      </text>
    </g>
  );
}
