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
import type { MapEffect } from "@/lib/journey/days";
import { MapEffectLayer } from "./MapEffects";
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
  avatarKey?: string;
  /** 깃발 위 이름표 (예: "오늘 10장"). 없으면 깃발만 */
  flagLabel?: string | null;
  /** 선택한 장소 테두리 */
  selected?: SiteId | null;
  /** 이 장소만 강조 (길·아바타·깃발을 그리지 않는다) */
  focus?: SiteId | null;
  /** 확대 영역 viewBox (cropAround · cropAroundLeg · EXPLORER_CROP) */
  crop?: string;
  /**
   * slice: 영역을 꽉 채우고 넘치는 부분을 자른다(기본). meet: 영역 전체가 보이게 줄이고 남는 옆은 바다·땅이 그대로 이어진다
   * — 여정 탭처럼 높이를 제한한 틀에서 장소가 잘리지 않게.
   */
  fit?: "slice" | "meet";
  /** 모든 지명과 지역 이름 표시 */
  labels?: boolean;
  /**
   * 도착 연출: from(이전 장의 장소) → view.me(이번 장의 장소) 길을 그리고, 3장이면 요단을 건너 가나안을 채운다.
   * 같은 장소에 머무는 장(1·2장 싯딤, 14·15장 헤브론 등)은 길·이동 없이 그 자리에서 채움만 차오른다.
   * (걸은 길 walked 는 같은 장소가 이어지면 하나로 합치므로 이전 장소를 거기서 꺼내면 안 된다)
   */
  arrival?: { crossJordan: boolean; from: SiteId } | null;
  /**
   * 진하게 보여 줄 구간. 지나온 길은 모두 옅게 그리고 이 구간만 진하게 그려 산만하지 않게 한다.
   * 없으면 걸은 길의 마지막 구간. locked 면 아직 열리지 않은 장이라 점선으로 그린다.
   * key 가 바뀌면 길 그리기 연출을 다시 한다(여정 되짚기).
   * prev: 바로 전에 강조돼 있던 장소 — 강조가 갑자기 꺼지지 않고 서서히 빠지게 한다.
   */
  leg?: { from: SiteId; to: SiteId; locked?: boolean; key: string; prev?: SiteId | null } | null;
  /**
   * 여정 되짚기(2026-11-01): 내 아바타가 내 위치(view.me) 대신 고른 장의 장소(to)에 서고, 장을 바꾸면 from 에서 걸어간다.
   * 다음 장이면 진하게 그려지는 길을 함께 따라가고, 뒤로 가면 그 길을 되돌아간다. "내 위치" 이름표는 실제 내 위치에 섰을 때만.
   */
  walker?: { from: SiteId | null; to: SiteId; key: string } | null;
  /**
   * 장소 사건 연출(MapEffects, 2026-11-04): delay 초 뒤 한 번 재생. key 가 바뀌면 다시 재생된다.
   * 도착 화면은 아바타가 도착한 뒤, 여정 탭은 장을 고르고 길이 그려진 뒤.
   */
  effect?: { kind: MapEffect; key: string; delay: number } | null;
  /** 드러난 장소만 그린다(revealedSites — 길은 그날 열린다). 없으면 모든 장소 */
  revealed?: readonly SiteId[] | null;
  onSelectSite?: (id: SiteId) => void;
  ariaLabel: string;
  className?: string;
};

// 내 아바타 반지름 — 모바일에서 잘 안 보여 키웠다(9.5 → 14 → 12, 2026-11-04: 장소 아이콘(13.5)보다는 작게)
const AVATAR_R = 12;
/** 장소별 아바타 자리(locations.ts avatarOffset)는 9.5 기준으로 맞춘 값 — 커진 만큼 아이콘에서 더 떨어뜨린다 */
const AVATAR_GROW = AVATAR_R - 9.5;
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
  avatarKey,
  flagLabel = null,
  selected = null,
  focus = null,
  crop,
  fit = "slice",
  labels = true,
  arrival = null,
  leg,
  walker = null,
  effect = null,
  revealed = null,
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
  // 진한 구간: 지정한 구간, 없으면 걸은 길의 마지막 구간
  const strong =
    leg !== undefined
      ? leg
      : arrival && view.me
        ? { from: arrival.from, to: view.me, locked: false, key: "arrival" }
        : walked.length >= 2
        ? { from: walked[walked.length - 2], to: walked[walked.length - 1], locked: false, key: "last" }
        : null;
  // 채운 아이콘: 진한 구간의 도착 지점·강조 장소. 나머지 지나온 장소는 테두리만.
  // 내 위치는 아바타가 보여 주므로 칠하지 않는다 — 되짚기로 다른 장을 볼 때 강조가 둘로 보여 헷갈리지 않게
  // 진한 구간이 없으면(1장만 읽음 등) 내 위치를 칠한다
  const filled = new Set<SiteId>([strong ? strong.to : view.me, focus].filter((x): x is SiteId => !!x));
  // 강조가 빠지는 장소: 도착 연출이면 출발한 장소, 되짚기면 바로 전에 고른 장소
  const fadeFrom = arrival ? strong?.from : leg?.prev;
  const fading = fadeFrom && !filled.has(fadeFrom) ? fadeFrom : null;
  const fadeKey = leg?.key ?? "arrival";
  const meAtFlag = !!avatarKey && view.me !== null && view.me === view.flag;
  // 여정 탭 3장: 강물이 먼저 마르고 나서 길이 그려지고 아바타가 건넌다(도착 화면은 원래 아바타가 늦게 출발해 그대로)
  const stepDelay = leg && effect?.kind === "cross-jordan" ? 0.5 : 0;
  const delayed = stepDelay ? { animationDelay: `${stepDelay}s` } : undefined;
  return (
    <svg
      viewBox={crop ?? `${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
      preserveAspectRatio={`xMidYMid ${fit}`}
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

      {effect && !focused && <MapEffectLayer key={`u-${effect.key}`} kind={effect.kind} layer="under" delay={effect.delay} />}

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
              ? { pathLength: 1, className: strong.locked ? undefined : arrival ? "map-draw" : "map-draw-quick", style: delayed }
              : {})}
          />
        )}
      </g>

      {/* 장소 */}
      {SITE_IDS.map((id) => {
        if (revealed && !revealed.includes(id)) return null;
        const s = SITES[id];
        const isVisited = visited.has(id);
        const isFocus = focus === id;
        const on = filled.has(id);
        const ring = !on && isVisited;
        const showLabel = labels || isFocus || (isVisited && !focused);
        const label = labelPosition(id);
        const popClass = arrival && id === view.me ? "map-pop" : leg && id === leg.to ? "map-pop-quick" : undefined;
        // 도착할 장소는 미리 보이게 두고(도착 전 모습), 채운 아이콘만 그 위에서 차오르게 한다
        const beforeTone: "ring" | "off" =
          (arrival ? id === arrival.from || walked.slice(0, -1).includes(id) : isVisited) ? "ring" : "off";
        return (
          <g key={popClass === "map-pop-quick" ? `${id}-${leg!.key}` : id} data-site={id}>
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
            {/* 여리고 연출: 행렬이 다 돈 뒤 아이콘이 흔들린다 */}
            <g
              key={shakes(effect, id) ? `shake-${effect!.key}` : "still"}
              className={shakes(effect, id) ? "fx-shake" : undefined}
              style={shakes(effect, id) ? ({ "--fx-delay": `${effect!.delay}s` } as React.CSSProperties) : undefined}
            >
              {popClass && on ? (
                <>
                  <Marker id={id} tone={beforeTone} />
                  <g className={popClass} style={popClass === "map-pop-quick" && stepDelay ? { animationDelay: `${0.45 + stepDelay}s` } : undefined}>
                    <Marker id={id} tone="on" />
                  </g>
                </>
              ) : (
                <Marker id={id} tone={on ? "on" : ring ? "ring" : "off"} />
              )}
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

      {effect && !focused && <MapEffectLayer key={`o-${effect.key}`} kind={effect.kind} layer="over" delay={effect.delay} />}

      {/* 깃발 */}
      {/* 깃발과 내 위치가 같은 장소면 이름표가 겹치지 않게 깃발 하나로 합친다 */}
      {!focused && view.flag && (
        <Flag
          x={SITES[view.flag].x}
          y={SITES[view.flag].y}
          label={meAtFlag ? [MY_PLACE, flagLabel].filter(Boolean).join(" · ") : flagLabel}
        />
      )}

      {/* 내 아바타: 장소 아이콘을 가리지 않게 옆에 둔다 */}
      {!focused && view.me && avatarKey && walker && (
        <Walker walker={walker} leg={strong} avatarKey={avatarKey} tag={walker.to === view.me && !meAtFlag} delayMs={stepDelay * 1000} />
      )}
      {!focused && view.me && avatarKey && !walker && (
        arrival && strong && strong.from !== strong.to && strong.to === view.me ? (
          <MovingAvatar d={curve(strong.from, strong.to, 1)} fromOffset={avatarOffset(strong.from)} toOffset={avatarOffset(view.me)}>
            <AvatarMark avatarKey={avatarKey} tag={meAtFlag ? null : tagSide(view.me)} />
          </MovingAvatar>
        ) : (
          <MapAvatar site={view.me} avatarKey={avatarKey} tag={!meAtFlag} />
        )
      )}
    </svg>
  );
}

function shakes(effect: JourneyMapProps["effect"], id: SiteId): boolean {
  return effect?.kind === "walls-fall" && id === "jericho";
}

/** 장소 아이콘: on 채움(내 위치·강조) / ring 테두리(지나온 곳) / off 흐림 */
function Marker({ id, tone }: { id: SiteId; tone: "on" | "ring" | "off" }) {
  const s = SITES[id];
  const color = tone === "on" ? "var(--color-white, #fff)" : tone === "ring" ? "var(--color-main)" : "var(--color-mid)";
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
        fill={tone === "solid" ? "var(--color-white, #fff)" : "var(--color-main)"}
      >
        {text}
      </text>
    </g>
  );
}

function Flag({ x, y, label }: { x: number; y: number; label: string | null }) {
  return (
    <g aria-hidden>
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
  const len = Math.hypot(off.dx, off.dy) || 1;
  const k = (len + AVATAR_GROW) / len;
  return { x: off.dx * k, y: off.dy * k };
}

/** "내 위치" 이름표는 장소 아이콘 반대편: 아바타가 아이콘 아래에 있으면 아바타 아래로 */
function tagSide(site: SiteId): "above" | "below" {
  return avatarOffset(site).y > 0 ? "below" : "above";
}

function MapAvatar({ site, avatarKey, tag }: { site: SiteId; avatarKey: string; tag: boolean }) {
  const s = SITES[site];
  const off = avatarOffset(site);
  return (
    <g transform={`translate(${s.x + off.x} ${s.y + off.y})`}>
      <AvatarMark avatarKey={avatarKey} tag={tag ? tagSide(site) : null} />
    </g>
  );
}

/** 여정 되짚기의 아바타: 고른 장의 장소로 걸어간다(key 가 바뀔 때마다 새로 걷는다). 진한 구간과 같은 시간(map-draw-quick 0.6초) */
function Walker({
  walker,
  leg,
  avatarKey,
  tag,
  delayMs = 0,
}: {
  walker: { from: SiteId | null; to: SiteId; key: string };
  leg: { from: SiteId; to: SiteId } | null;
  avatarKey: string;
  tag: boolean;
  delayMs?: number;
}) {
  const { from, to } = walker;
  if (!from || from === to) return <MapAvatar site={to} avatarKey={avatarKey} tag={tag} />;
  // 앞으로: 지금 그려지는 진한 구간 그대로. 그 밖(뒤로·건너뛰기): 반대 방향 구간(한 장 뒤로면 방금 보던 길)을 거꾸로
  const forward = leg?.from === from && leg?.to === to;
  return (
    <MovingAvatar
      key={walker.key}
      d={forward ? curve(from, to, 1) : curve(to, from, 1)}
      reverse={!forward}
      fromOffset={avatarOffset(from)}
      toOffset={avatarOffset(to)}
      delayMs={delayMs}
      durationMs={600}
    >
      <AvatarMark avatarKey={avatarKey} tag={tag ? tagSide(to) : null} />
    </MovingAvatar>
  );
}

/** (0,0) 을 중심으로 그린 아바타와 이름표 */
function AvatarMark({ avatarKey, tag }: { avatarKey: string; tag: "above" | "below" | null }) {
  return (
    <g aria-hidden>
      <circle r={AVATAR_R + 2.5} fill="var(--color-surface)" stroke="var(--color-main)" strokeWidth="2" />
      <image href={avatarUrl(avatarKey)} x={-AVATAR_R} y={-AVATAR_R} width={AVATAR_R * 2} height={AVATAR_R * 2} />
      {tag && <Tag x={0} y={tag === "below" ? AVATAR_R + 20 : -AVATAR_R - 5} text={MY_PLACE} tone="solid" clamp={false} />}
    </g>
  );
}
