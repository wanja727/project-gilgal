"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

/**
 * 도착 연출에서 내 아바타가 길을 따라 이전 장소 → 이번 장소로 걸어간다.
 * 길 그리기(.map-draw: 0.35초 뒤 1.3초, --ease-journey)와 같은 시간·같은 가속으로 움직여 선 끝과 함께 도착한다.
 * 아바타는 장소 아이콘 옆(장소마다 다른 오프셋)에 있으므로 길 위의 점에 오프셋을 서서히 바꿔 더한다.
 * 움직임 줄이기 설정이면 처음부터 도착 위치에 둔다.
 */
export function MovingAvatar({
  d,
  fromOffset,
  toOffset,
  delayMs = 350,
  durationMs = 1300,
  children,
}: {
  /** 장소 중심을 잇는 길 (진한 구간과 같은 곡선) */
  d: string;
  fromOffset: Point;
  toOffset: Point;
  delayMs?: number;
  durationMs?: number;
  /** (0,0) 기준으로 그린 아바타 */
  children: React.ReactNode;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const g = groupRef.current;
    if (!path || !g) return;
    const length = path.getTotalLength();
    const place = (progress: number) => {
      const p = path.getPointAtLength(progress * length);
      const dx = fromOffset.x + (toOffset.x - fromOffset.x) * progress;
      const dy = fromOffset.y + (toOffset.y - fromOffset.y) * progress;
      g.setAttribute("transform", `translate(${p.x + dx} ${p.y + dy})`);
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      place(1);
      return;
    }
    let frame = 0;
    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      place(journeyEase(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [d, fromOffset.x, fromOffset.y, toOffset.x, toOffset.y, delayMs, durationMs]);

  // 서버 렌더·첫 그림: 출발 장소 옆
  const m = /^M([-\d.]+),([-\d.]+)/.exec(d);
  const sx = (m ? Number(m[1]) : 0) + fromOffset.x;
  const sy = (m ? Number(m[2]) : 0) + fromOffset.y;

  return (
    <>
      <path ref={pathRef} d={d} fill="none" stroke="none" />
      <g ref={groupRef} transform={`translate(${sx} ${sy})`}>
        {children}
      </g>
    </>
  );
}

/** CSS --ease-journey = cubic-bezier(0.6, 0, 0.25, 1) 와 같은 곡선 (뉴턴법으로 x → t 를 푼다) */
function journeyEase(x: number): number {
  const [x1, y1, x2, y2] = [0.6, 0, 0.25, 1];
  const bez = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  const dbez = (t: number, a: number, b: number) => 3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t ** 2;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const dx = dbez(t, x1, x2);
    if (Math.abs(dx) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - (bez(t, x1, x2) - x) / dx));
  }
  return bez(t, y1, y2);
}
