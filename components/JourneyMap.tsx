import { LOCATIONS, MAP_VIEWBOX, TERRAIN, type LocationId } from "@/lib/journey/locations";
import type { MapState } from "@/lib/journey/mapState";

/**
 * 여정 지도 기본판 (Phase 1, architecture 8.2). 인라인 SVG, 외부 의존성 없음.
 * 훅을 쓰지 않는 순수 렌더 컴포넌트라 서버·클라이언트 어디서든 쓸 수 있다.
 * 마커 이동 애니메이션은 transform transition 하나뿐이며 reduced-motion 에서는 꺼진다(globals.css).
 */
export function JourneyMap({
  state,
  avatarSeed,
  markerAt,
  compact = false,
  className = "",
}: {
  state: MapState;
  avatarSeed?: string;
  /** 마커 위치를 덮어쓴다(완료 연출에서 이전 → 다음 지점으로 옮길 때) */
  markerAt?: LocationId;
  /** 홈 미니 지도: 라벨을 줄이고 중부 지역만 확대 */
  compact?: boolean;
  className?: string;
}) {
  const marker = LOCATIONS[markerAt ?? state.marker];
  // 미니 지도는 이야기의 대부분이 일어나는 중부(요단~헤브론)를 보여 준다
  const viewBox = compact ? "100 180 260 220" : `0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`;
  const r = compact ? 4.2 : 4.6;

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label="여호수아 여정 지도"
      className={`block h-auto w-full ${className}`}
    >
      <defs>
        <clipPath id="marker-clip">
          <circle r="9" />
        </clipPath>
      </defs>

      {/* 땅과 바다 */}
      <rect x="0" y="0" width={MAP_VIEWBOX.width} height={MAP_VIEWBOX.height} fill="var(--color-paper-deep)" />
      <path d={TERRAIN.coast} fill="var(--color-mist-soft)" />
      <path d={TERRAIN.jordan} fill="none" stroke="var(--color-mist)" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse {...TERRAIN.galilee} fill="var(--color-mist-soft)" stroke="var(--color-mist)" strokeWidth="1" />
      <ellipse {...TERRAIN.deadSea} fill="var(--color-mist-soft)" stroke="var(--color-mist)" strokeWidth="1" />
      {!compact && (
        <g fill="var(--color-mist)" fontSize="9" letterSpacing="2" opacity="0.8">
          <text x="18" y="270" transform="rotate(-80 18 270)">지중해</text>
          <text x="280" y="400">사해</text>
          <text x="266" y="122">갈릴리</text>
        </g>
      )}

      {/* 경로: 걸은 길 실선, 아직 걷지 않은 길 점선 */}
      <g fill="none" strokeLinecap="round">
        {state.segments.map((s) => {
          const a = LOCATIONS[s.from];
          const b = LOCATIONS[s.to];
          return (
            <line
              key={s.day}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={s.walked ? "var(--color-olive)" : "var(--color-stone)"}
              strokeWidth={s.walked ? 2.2 : 1.2}
              strokeDasharray={s.walked ? undefined : "3 4"}
              opacity={s.walked ? 0.9 : 0.45}
            />
          );
        })}
      </g>

      {/* 지점 */}
      {state.locations.map(({ id, state: st }) => {
        const loc = LOCATIONS[id];
        const active = st !== "upcoming";
        const highlighted = state.highlight === id;
        const labelX = loc.labelSide === "left" ? loc.x - 8 : loc.x + 8;
        return (
          <g key={id}>
            {highlighted && (
              <circle cx={loc.x} cy={loc.y} r={r + 5} fill="none" stroke="var(--color-clay)" strokeWidth="1.4">
                <animate attributeName="r" values={`${r + 3};${r + 7};${r + 3}`} dur="2.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={loc.x}
              cy={loc.y}
              r={r}
              fill={active ? "var(--color-olive)" : "var(--color-card)"}
              stroke={active ? "var(--color-olive-deep)" : "var(--color-stone)"}
              strokeWidth="1.2"
              opacity={active ? 1 : 0.7}
            />
            {(!compact || active || highlighted) && (
              <text
                x={labelX}
                y={loc.y + 3.5}
                textAnchor={loc.labelSide === "left" ? "end" : "start"}
                fontSize={compact ? 9.5 : 10.5}
                fontWeight={active ? 600 : 400}
                fill={active ? "var(--color-ink)" : "var(--color-stone)"}
              >
                {loc.name}
              </text>
            )}
          </g>
        );
      })}

      {/* 현재 위치 마커 (내 아바타) */}
      <g
        style={{ transform: `translate(${marker.x}px, ${marker.y - 15}px)`, transition: "transform 1.2s ease-in-out" }}
      >
        <path d="M0 13 L-5 6 L5 6 Z" fill="var(--color-olive-deep)" />
        <circle r="10.5" fill="var(--color-card)" stroke="var(--color-olive-deep)" strokeWidth="1.5" />
        {avatarSeed ? (
          <image
            href={`/api/avatar/${encodeURIComponent(avatarSeed)}`}
            x="-9"
            y="-9"
            width="18"
            height="18"
            clipPath="url(#marker-clip)"
          />
        ) : (
          <circle r="5" fill="var(--color-olive)" />
        )}
      </g>
    </svg>
  );
}

export const MAP_CAPTION = "위치는 이야기 흐름을 위한 개략적 표현입니다";
