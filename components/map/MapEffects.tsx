import type { MapEffect } from "@/lib/journey/days";
import { SITES, TERRAIN } from "@/lib/journey/locations";

/**
 * 장소 사건 연출(2026-11-04, ADR-037 · implementation-plan T23). 지도 위에 1~3초 한 번 재생된다.
 * 사건을 그림으로 보여 줄 뿐 의미를 설명하지 않는다(본문 해석 금지 원칙). 정복 장면은 무너짐 정도로만 부드럽게.
 * 시간은 CSS 변수 --fx-delay(길 그리기·아바타 도착 뒤) 기준이고, 움직임 줄이기 설정이면 그리지 않는다(globals.css .fx).
 * 훅이 없어 JourneyMap 과 같이 서버·클라이언트 어디서든 그린다. key 가 바뀌면 다시 재생된다.
 *
 * layer: under = 강·길 위, 장소 아이콘 아래(요단 물길) / over = 장소 아이콘 위(행렬·외침)
 */
export const PLAYABLE_EFFECTS: readonly MapEffect[] = ["cross-jordan", "walls-fall"];

export function MapEffectLayer({ kind, layer, delay }: { kind: MapEffect; layer: "under" | "over"; delay: number }) {
  const style = { "--fx-delay": `${delay}s` } as React.CSSProperties;
  if (kind === "cross-jordan" && layer === "under") return <JordanStops style={style} />;
  if (kind === "walls-fall" && layer === "over") return <JerichoWalls style={style} />;
  return null;
}

/**
 * 3장: 건너는 자리 아래 물길이 마르고(바닥만 점선으로 남음) 위쪽에 물이 쌓였다가(3:16),
 * 다 건넌 뒤 물이 다시 흐른다(4:18).
 */
function JordanStops({ style }: { style: React.CSSProperties }) {
  const heap = TERRAIN.jordanHeap;
  return (
    <g aria-hidden className="fx" style={style}>
      <g className="fx-jordan-dry">
        {/* 물길을 바탕색으로 덮고, 마른 강바닥을 점선으로 */}
        <path d={TERRAIN.jordanBelowCrossing} fill="none" stroke="var(--color-surface)" strokeWidth="4" strokeLinecap="round" />
        <path d={TERRAIN.jordanBelowCrossing} fill="none" stroke="var(--color-mid)" strokeWidth="1.2" strokeDasharray="2 3" strokeLinecap="round" />
      </g>
      <ellipse
        className="fx-jordan-heap"
        cx={heap.x}
        cy={heap.y}
        rx="6"
        ry="10"
        fill="var(--color-water)"
        style={{ transformOrigin: `${heap.x}px ${heap.y + 10}px` }}
      />
    </g>
  );
}

/**
 * 6장: 작은 행렬이 성 둘레를 일곱 바퀴 돌고(6:15), 외치는 소리가 퍼지고, 성벽 조각이 떨어진다(6:20).
 * 아이콘 흔들림은 JourneyMap 이 장소 아이콘에 .fx-shake 를 붙인다.
 */
function JerichoWalls({ style }: { style: React.CSSProperties }) {
  const { x, y } = SITES.jericho;
  // 선택 테두리(18) 바깥을 돈다
  const R = 25;
  // 행렬: 맨 앞 점(나팔)부터 뒤로 조금씩 — 둘레를 따라 줄지어 걷는 모양
  const marchers = [0, -14, -26, -38, -50].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    return { cx: x + R * Math.sin(a), cy: y - R * Math.cos(a), r: i === 0 ? 3 : 2.3 };
  });
  // 성벽 조각: 아이콘 아래 가장자리에서 떨어진다(아이콘 안쪽은 같은 남색이라 묻힌다)
  const rubble = [-11, -6, -1, 4, 9].map((dx, i) => ({ x: x + dx, y: y + 12 + Math.abs(dx) * -0.25 + (i % 2) * 2, d: i * 0.05 }));
  const origin = { transformOrigin: `${x}px ${y}px` };
  return (
    <g aria-hidden className="fx" style={style} pointerEvents="none">
      <circle className="fx-track" cx={x} cy={y} r={R} fill="none" stroke="var(--color-mid)" strokeWidth="1.2" strokeDasharray="2 4" />
      <g className="fx-orbit" style={origin}>
        {marchers.map((m, i) => (
          <circle key={i} cx={m.cx} cy={m.cy} r={m.r} fill="var(--color-main)" />
        ))}
      </g>
      <circle className="fx-shout" cx={x} cy={y} r="16" fill="none" stroke="var(--color-main)" strokeWidth="2" style={origin} />
      {rubble.map((r, i) => (
        <rect
          key={i}
          className="fx-rubble"
          x={r.x - 1.8}
          y={r.y - 1.8}
          width="3.6"
          height="3.6"
          rx=".7"
          fill="var(--color-main)"
          style={{ animationDelay: `calc(var(--fx-delay) + ${2.25 + r.d}s)` }}
        />
      ))}
    </g>
  );
}
