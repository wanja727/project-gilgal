import { avatarUrl } from "@/lib/avatarSeed";
import {
  DEFAULT_AVATAR_OFFSET,
  MAP_VIEWBOX,
  SITE_IDS,
  SITES,
  TERRAIN,
  type SiteId,
} from "@/lib/journey/locations";
import type { MapView } from "@/lib/journey/mapState";
import { MovingAvatar } from "./MovingAvatar";
import { SiteGlyphPaths } from "./SiteGlyph";

/**
 * 여정 지도 — 교육용 개념도(schematic), 인라인 SVG 하나로 모든 쓰임새를 처리한다(architecture 8.2).
 * 훅이 없는 렌더 컴포넌트라 서버·클라이언트 어디서든 쓸 수 있다. onSelectSite 를 넘길 때만 클라이언트에서 쓴다.
 *
 * 쓰임새
 * - 여정 탭: 전체 지도 + 선택한 장소(selected) + 장소 누르기(onSelectSite)
 * - 장 정보 시트·본문 무대: focus 한 장소만 강조, crop 으로 확대, 길·아바타·깃발 없음
 * - 도착 화면: arrival 로 이전 장소 → 이번 장소 길 그리기(아바타도 길을 따라 걸어감), 3장이면 가나안 채우기 연출
 */
export type JourneyMapProps = {
  view: MapView;
  /** 내 아바타 (view.me 지점 옆, 위에 "내 위치" 이름표) */
  avatarSeed?: string;
  /** 깃발 위 이름표 (예: "오늘 10장"). 없으면 깃발만 */
  flagLabel?: string | null;
  /** 선택한 장소 테두리 */
  selected?: SiteId | null;
  /** 이 장소만 강조 (길·아바타·깃발을 그리지 않는다) */
  focus?: SiteId | null;
  /** 확대 영역 viewBox (cropAround · cropAroundLeg) */
  crop?: string;
  /** 모든 지명과 지역 이름 표시 */
  labels?: boolean;
  /** 도착 연출: 마지막 걸은 길을 그리고, 3장이면 요단을 건너 가나안을 채운다 */
  arrival?: { crossJordan: boolean } | null;
  /**
   * 진하게 보여 줄 구간. 지나온 길은 모두 옅게 그리고 이 구간만 진하게 그려 산만하지 않게 한다.
   * 없으면 걸은 길의 마지막 구간. locked 면 아직 열리지 않은 장이라 점선으로 그린다.
   * key 가 바뀌면 길 그리기 연출을 다시 한다(여정 되짚기).
   * prev: 바로 전에 강조돼 있던 장소 — 강조가 갑자기 꺼지지 않고 서서히 빠지게 한다.
   */
  leg?: { from: SiteId; to: SiteId; locked?: boolean; key: string; prev?: SiteId | null } | null;
  onSelectSite?: (id: SiteId) => void;
  ariaLabel: string;
  className?: string;
};

const AVATAR_R = 9.5;
const MY_PLACE = "내 위치";

/**
 * 두 지점을 잇는 완만한 곡선. 구간마다 휘는 방향을 번갈아 겹치지 않게 한다.
 * 긴 구간(예: 하솔 ↔ 길갈)은 휘는 정도를 줄여 지도 밖으로 크게 부풀지 않게 한다.
 */
function curve(a: SiteId, b: SiteId, i: number): string {
  const A = SITES[a];
  const B = SITES[b];
  const len = Math.hypot(B.x - A.x, B.y - A.y);
  const k = (i % 2 ? 1 : -1) * 0.18 * Math.min(1, 80 / Math.max(len, 1));
  const mx = (A.x + B.x) / 2 - (B.y - A.y) * k;
  const my = (A.y + B.y) / 2 + (B.x - A.x) * k;
  return `M${A.x},${A.y} Q${mx.toFixed(1)},${my.toFixed(1)} ${B.x},${B.y}`;
}

function labelPosition(id: SiteId) {
  const s = SITES[id];
  const { dx, dy, anchor } = s.label;
  const lx = dx > 0 ? dx + 7 : dx < 0 ? dx - 7 : 0;
  const ly = dy < 0 ? dy - 8 : dy > 8 ? dy + 7 : dy;
  return { x: s.x + lx, y: s.y + ly, anchor };
}

export function JourneyMap({
  view,
  avatarSeed,
  flagLabel = null,
  selected = null,
  focus = null,
  crop,
  labels = true,
  arrival = null,
  leg,
  onSelectSite,
  ariaLabel,
  className = "",
}: JourneyMapProps) {
  const focused = focus !== null;
  const walked = focused ? [] : view.walked;
  const visited = new Set(focused ? [] : view.visited);
  const crossNow = arrival?.crossJordan ?? false;
  // 장소만 보여 주는 지도 조각은 가나안을 채워 둔다(시안과 같이)
  const canaanFilled = view.canaanFilled || focused;
  const lastWalked = walked.at(-1);
  // 진한 구간: 지정한 구간, 없으면 걸은 길의 마지막 구간
  const strong =
    leg !== undefined
      ? leg
      : walked.length >= 2
        ? { from: walked[walked.length - 2], to: walked[walked.length - 1], locked: false, key: "last" }
        : null;
  // 채운 아이콘: 진한 구간의 도착 지점·강조 장소. 나머지 지나온 장소는 테두리만.
  // 내 위치는 아바타가 보여 주므로 칠하지 않는다 — 되짚기로 다른 장을 볼 때 강조가 둘로 보여 헷갈리지 않게
  const filled = new Set<SiteId>([strong?.to, focus].filter((x): x is SiteId => !!x));
  // 강조가 빠지는 장소: 도착 연출이면 출발한 장소, 되짚기면 바로 전에 고른 장소
  const fadeFrom = arrival ? strong?.from : leg?.prev;
  const fading = fadeFrom && !filled.has(fadeFrom) ? fadeFrom : null;
  const fadeKey = leg?.key ?? "arrival";
  const meAtFlag = !!avatarSeed && view.me !== null && view.me === view.flag;
  return (
    <svg
      viewBox={crop ?? `${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid slice"
      role={onSelectSite ? "group" : "img"}
      aria-label={ariaLabel}
      className={`block h-full w-full font-sans ${className}`}
    >
      <rect x="-40" y="-40" width="460" height="600" fill="var(--color-surface)" />
      <path d={TERRAIN.sea} fill="var(--color-sea)" />

      {/* 가나안: 3장 완료 전 점선 경계 → 완료 후 옅게 채움 */}
      {(canaanFilled || crossNow) && (
        <path
          d={TERRAIN.canaan}
          fill="var(--color-main)"
          fillOpacity={crossNow ? 0 : 0.065}
          className={crossNow ? "map-canaan-in" : undefined}
        />
      )}
      {(!canaanFilled || crossNow) && (
        <path
          d={TERRAIN.canaan}
          fill="none"
          stroke="var(--color-mid)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          className={crossNow ? "map-canaan-out" : undefined}
        />
      )}
      {labels && (
        <g aria-hidden>
          <text
            x={TERRAIN.labels.canaan.x}
            y={TERRAIN.labels.canaan.y}
            fontSize="13"
            fontWeight="700"
            letterSpacing="6"
            fill="var(--color-main)"
            fillOpacity=".45"
          >
            가나안
          </text>
          <text x={TERRAIN.labels.canaan.sub.x} y={TERRAIN.labels.canaan.sub.y} fontSize="10" fontWeight="500" fill="var(--color-mute)">
            약속의 땅
          </text>
        </g>
      )}

      <ellipse {...TERRAIN.galilee} fill="var(--color-water)" opacity=".7" />
      <ellipse {...TERRAIN.deadSea} fill="var(--color-water)" opacity=".7" />
      <path d={TERRAIN.jordan} fill="none" stroke="var(--color-water)" strokeWidth="2.2" strokeLinecap="round" />
      {labels && (
        <g aria-hidden fontSize="10" fontWeight="600" fill="var(--color-mid)">
          <text
            x={TERRAIN.labels.sea.x}
            y={TERRAIN.labels.sea.y}
            transform={`rotate(${TERRAIN.labels.sea.rotate} ${TERRAIN.labels.sea.x} ${TERRAIN.labels.sea.y})`}
            letterSpacing="3"
          >
            지중해
          </text>
          <text x={TERRAIN.labels.deadSea.x} y={TERRAIN.labels.deadSea.y}>
            염해
          </text>
        </g>
      )}

      {/* 지나온 길(옅은 실선) · 진한 구간. 아직 걷지 않은 길은 그리지 않는다 */}
      <g fill="none" strokeLinecap="round" stroke="var(--color-main)">
        {walked.map((site, i) =>
          i === 0 ? null : (
            <path key={`w${i}`} d={curve(walked[i - 1], site, i)} strokeWidth="2" opacity=".22" />
          ),
        )}
        {strong && strong.from !== strong.to && (
          <path
            key={strong.key}
            d={curve(strong.from, strong.to, 1)}
            strokeWidth="2.8"
            strokeDasharray={strong.locked ? "4 4" : undefined}
            {...(arrival || leg
              ? { pathLength: 1, className: strong.locked ? undefined : arrival ? "map-draw" : "map-draw-quick" }
              : {})}
          />
        )}
      </g>

      {/* 장소 */}
      {SITE_IDS.map((id) => {
        const s = SITES[id];
        const isVisited = visited.has(id);
        const isFocus = focus === id;
        const on = filled.has(id);
        const ring = !on && isVisited;
        const showLabel = labels || isFocus || (isVisited && !focused);
        const label = labelPosition(id);
        const popClass = arrival && id === lastWalked ? "map-pop" : leg && id === leg.to ? "map-pop-quick" : undefined;
        return (
          <g key={popClass === "map-pop-quick" ? `${id}-${leg!.key}` : id}>
            {selected === id && (
              <circle
                key={leg ? `sel-${leg.key}` : "sel"}
                cx={s.x}
                cy={s.y}
                r="18"
                fill="none"
                stroke="var(--color-main)"
                strokeWidth="1.5"
                className={leg?.prev ? "map-fade-in" : undefined}
              />
            )}
            <g className={popClass}>
              <Marker id={id} tone={on ? "on" : ring ? "ring" : "off"} />
            </g>
            {/* 바로 전 강조를 그 위에 겹쳐 두고 가운데로 오므라들며 사라지게 한다 — 도착할 때 가운데에서 차오르는 것의 반대 */}
            {fading === id && (
              <g key={`fade-${fadeKey}`} aria-hidden pointerEvents="none">
                {selected !== null && (
                  <circle cx={s.x} cy={s.y} r="18" fill="none" stroke="var(--color-main)" strokeWidth="1.5" className="map-unfill-quick" />
                )}
                <g className={arrival ? "map-unpop" : "map-unpop-quick"}>
                  <Marker id={id} tone="on" />
                </g>
              </g>
            )}
            {showLabel && (
              <text
                className="map-label"
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                fontSize="11.5"
                fontWeight={isVisited || isFocus ? 700 : 500}
                fill={isVisited || isFocus ? "var(--color-main)" : "var(--color-mute)"}
              >
                {s.name}
              </text>
            )}
            {onSelectSite && (
              <circle
                cx={s.x}
                cy={s.y}
                r="18"
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${s.name}: ${s.scene}`}
                aria-pressed={selected === id}
                className="cursor-pointer outline-none"
                onClick={() => onSelectSite(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectSite(id);
                  }
                }}
              />
            )}
          </g>
        );
      })}

      {/* 깃발 */}
      {/* 깃발과 내 위치가 같은 장소면 이름표가 겹치지 않게 깃발 하나로 합친다 */}
      {!focused && view.flag && (
        <Flag
          x={SITES[view.flag].x}
          y={SITES[view.flag].y}
          label={meAtFlag ? [MY_PLACE, flagLabel].filter(Boolean).join(" · ") : flagLabel}
          animate={!!arrival}
        />
      )}

      {/* 내 아바타: 장소 아이콘을 가리지 않게 옆에 둔다 */}
      {!focused && view.me && avatarSeed && (
        arrival && strong && strong.from !== strong.to && strong.to === view.me ? (
          <MovingAvatar d={curve(strong.from, strong.to, 1)} fromOffset={avatarOffset(strong.from)} toOffset={avatarOffset(view.me)}>
            <AvatarMark seed={avatarSeed} tag={meAtFlag ? null : tagSide(view.me)} />
          </MovingAvatar>
        ) : (
          <MapAvatar site={view.me} seed={avatarSeed} tag={!meAtFlag} />
        )
      )}
    </svg>
  );
}

/** 장소 아이콘: on 채움(내 위치·강조) / ring 테두리(지나온 곳) / off 흐림 */
function Marker({ id, tone }: { id: SiteId; tone: "on" | "ring" | "off" }) {
  const s = SITES[id];
  const color = tone === "on" ? "#fff" : tone === "ring" ? "var(--color-main)" : "var(--color-mid)";
  return (
    <>
      <circle
        cx={s.x}
        cy={s.y}
        r="13.5"
        fill={tone === "on" ? "var(--color-main)" : "var(--color-surface)"}
        stroke={tone === "off" ? "var(--color-mid)" : "var(--color-main)"}
        strokeWidth="1.2"
      />
      <g
        transform={`translate(${s.x - 9} ${s.y - 9}) scale(.75)`}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <SiteGlyphPaths id={id} />
      </g>
    </>
  );
}

/**
 * 지도 위 작은 이름표. y 는 아래쪽 끝, x 는 align 에 따라 가운데 또는 왼쪽 끝.
 * 바탕을 깔아 길·아이콘 위에서도 읽히게 하고, 지도 밖으로 나가지 않게 안쪽으로 당긴다.
 */
function Tag({
  x,
  y,
  text,
  tone,
  align = "center",
  clamp = true,
}: {
  x: number;
  y: number;
  text: string;
  tone: "solid" | "line";
  align?: "center" | "start";
  /** 지도 밖으로 나가지 않게 당기기 (절대 좌표로 그릴 때만) */
  clamp?: boolean;
}) {
  // 한글은 글자 크기만큼, 숫자·공백은 그 0.6배로 폭을 어림한다
  const FS = 9.5;
  const w = [...text].reduce((n, c) => n + (/[가-힣]/.test(c) ? FS : FS * 0.6), 0) + 11;
  const h = 15;
  const want = align === "start" ? x : x - w / 2;
  const left = clamp ? Math.min(Math.max(want, 4), MAP_VIEWBOX.width - 4 - w) : want;
  const cx = left + w / 2;
  return (
    <g aria-hidden>
      <rect
        x={left}
        y={y - h}
        width={w}
        height={h}
        rx={h / 2}
        fill={tone === "solid" ? "var(--color-main)" : "var(--color-surface)"}
        stroke="var(--color-main)"
        strokeWidth="1"
      />
      <text
        x={cx}
        y={y - 4.4}
        textAnchor="middle"
        fontSize={FS}
        fontWeight="700"
        fill={tone === "solid" ? "#fff" : "var(--color-main)"}
      >
        {text}
      </text>
    </g>
  );
}

function Flag({ x, y, label, animate }: { x: number; y: number; label: string | null; animate: boolean }) {
  return (
    <g className={animate ? "map-flag-up" : undefined} aria-hidden>
      <line x1={x} y1={y - 14} x2={x} y2={y - 40} stroke="var(--color-main)" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${x + 1},${y - 40} L${x + 21},${y - 34} L${x + 1},${y - 28}Z`} fill="var(--color-main)" />
      {/* 깃발이 오른쪽으로 날리므로 이름표도 깃대에서 오른쪽으로 */}
      {label && <Tag x={x - 6} y={y - 44} text={label} tone="line" align="start" />}
    </g>
  );
}

/** 장소 아이콘 옆 아바타 자리 (장소 중심 기준) */
function avatarOffset(site: SiteId): { x: number; y: number } {
  const s = SITES[site];
  const off = ("avatarOffset" in s ? s.avatarOffset : undefined) ?? DEFAULT_AVATAR_OFFSET;
  return { x: off.dx, y: off.dy };
}

/** "내 위치" 이름표는 장소 아이콘 반대편: 아바타가 아이콘 아래에 있으면 아바타 아래로 */
function tagSide(site: SiteId): "above" | "below" {
  return avatarOffset(site).y > 0 ? "below" : "above";
}

function MapAvatar({ site, seed, tag }: { site: SiteId; seed: string; tag: boolean }) {
  const s = SITES[site];
  const off = avatarOffset(site);
  return (
    <g transform={`translate(${s.x + off.x} ${s.y + off.y})`}>
      <AvatarMark seed={seed} tag={tag ? tagSide(site) : null} />
    </g>
  );
}

/** (0,0) 을 중심으로 그린 아바타와 이름표 */
function AvatarMark({ seed, tag }: { seed: string; tag: "above" | "below" | null }) {
  return (
    <g aria-hidden>
      <circle r={AVATAR_R + 2.5} fill="var(--color-surface)" stroke="var(--color-main)" strokeWidth="2" />
      <image href={avatarUrl(seed)} x={-AVATAR_R} y={-AVATAR_R} width={AVATAR_R * 2} height={AVATAR_R * 2} />
      {tag && <Tag x={0} y={tag === "below" ? AVATAR_R + 20 : -AVATAR_R - 5} text={MY_PLACE} tone="solid" clamp={false} />}
    </g>
  );
}
