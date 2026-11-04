import type { MapEffect } from "@/lib/journey/days";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import {
  EFFECT_SPOTS,
  REFUGE_CITIES,
  SITES,
  type SiteId,
  siteLabelPosition,
  TERRAIN,
  TERRITORIES,
  type TerritoryId,
} from "@/lib/journey/locations";
import { SiteGlyphPaths } from "./SiteGlyph";

/**
 * 장소 사건 연출(ADR-037 · implementation-plan T23). 장을 볼 때 지도 위에 1~3초 한 번 재생된다.
 * 사건을 그림으로 보여 줄 뿐 의미를 설명하지 않는다(본문 해석 금지 원칙). 정복 장면은 무너짐 정도로만 부드럽게.
 * 남는 그림(나뉜 땅·해와 달·등불·돌)은 그 장을 보는 동안 그대로 두고, 움직임(행렬·사람들)은 끝나면 사라진다.
 * 시간은 CSS 변수 --fx-delay(길 그리기·아바타 도착 뒤) 기준, 요소마다 --t 만큼 더 늦게(globals.css .fx-*).
 * 움직임 줄이기 설정이면 그리지 않는다. 훅이 없어 JourneyMap 과 같이 서버·클라이언트 어디서든 그린다.
 *
 * layer: under = 강·길 위, 장소 아이콘 아래(물길·땅) / over = 장소 아이콘 위
 */
/** 땅 전체에 걸친 연출 — 도착 화면에서도 확대하지 않고 땅 전체를 보여 준다(확대하면 이름표·땅이 잘린다) */
export const WIDE_EFFECTS: readonly MapEffect[] = ["land-seven", "refuge-cities", "levite-cities"];

export const PLAYABLE_EFFECTS: readonly MapEffect[] = [
  "spies",
  "cross-jordan",
  "twelve-stones",
  "manna-ends",
  "walls-fall",
  "sun-moon",
  "land-east",
  "land-caleb",
  "land-judah",
  "land-ephraim",
  "land-manasseh",
  "move-base",
  "land-seven",
  "refuge-cities",
  "levite-cities",
  "gather",
  "arrive-final",
];

type Style = React.CSSProperties;
type Pt = { x: number; y: number };

const LAND: Partial<Record<MapEffect, TerritoryId[]>> = {
  "land-east": ["east"],
  "land-caleb": ["caleb"],
  "land-judah": ["judah"],
  "land-ephraim": ["ephraim"],
  "land-manasseh": ["manasseh"],
  "land-seven": ["north", "benjamin", "dan", "simeon"],
};

/**
 * 그 장을 볼 때 이미 나뉘어 있는 땅(2026-11-04): 13장부터 앞 장들에서 받은 땅이 옅게 쌓인다 — 후반은 "걸음"이 아니라 "채워짐".
 * 그 장에서 새로 받는 땅은 연출(Land)이 따로 그리므로 뺀다. 19장 뒤로는 모든 땅.
 */
export function landsBefore(chapter: number): TerritoryId[] {
  return JOURNEY_DAYS.slice(0, Math.max(0, chapter - 1)).flatMap((d) => (d.mapEffect ? (LAND[d.mapEffect] ?? []) : []));
}

/** 이미 받은 땅: 이름 없이 옅게 — 경계는 실선으로 아주 옅게(띠가 서로 맞물려 지파마다 구분만) */
export function GivenLands({ ids }: { ids: readonly TerritoryId[] }) {
  // 갈렙(헤브론)·시므온 땅은 유다 땅 안이라 유다가 나뉜 뒤에는 겹쳐 칠하지 않는다 — 진한 동그라미로 보이지 않게
  const shown = ids.includes("judah") ? ids.filter((id) => id !== "caleb" && id !== "simeon") : ids;
  if (shown.length === 0) return null;
  return (
    <g aria-hidden pointerEvents="none">
      {shown.map((id) => (
        <LandShape key={id} id={id} clipId={`land-clip-${id}`} paint={{ fill: "var(--color-main)", fillOpacity: 0.07, stroke: "var(--color-main)", strokeOpacity: 0.16, strokeWidth: 1 }} />
      ))}
    </g>
  );
}

/**
 * 사건 이름표 — 그림만으로는 무엇인지 모를 수 있어 연출과 함께 짧은 사건 이름을 3초쯤 띄운다(2026-11-04 운영자 의견).
 * 본문 속 사건 이름만 쓰고 해석은 붙이지 않는다. 지파 땅은 지파 이름이 이미 떠서 따로 두지 않는다.
 * x·y 는 이름표 가운데 — 장소 아이콘·아바타·지명을 피한 자리, t 는 그 사건이 보이는 때.
 */
type Cap = { text: string; x: number; y: number; t: number; dur?: number };
const CAPTIONS: Partial<Record<MapEffect, Cap | Cap[]>> = {
  // 위쪽은 3장 깃발 자리라(3장이 오늘인 날) 싯딤 아래 빈 곳에
  spies: { text: "두 정탐꾼", x: 314, y: 386, t: 0.2 },
  "cross-jordan": { text: "요단 물이 멈춤", x: 265, y: 278, t: 0.2 },
  "twelve-stones": { text: "열두 돌", x: 240, y: 258, t: 0.4 },
  // 아래는 길갈 아바타 자리라 그 위로
  "manna-ends": { text: "만나가 그침", x: 248, y: 248, t: 0.3 },
  "walls-fall": { text: "일곱째 날 일곱 바퀴", x: 210, y: 416, t: 0.2 },
  // 왼쪽 위는 기브온 아바타 자리라 기브온 오른쪽 아래로
  "sun-moon": { text: "해와 달이 머묾", x: 180, y: 350, t: 0.3 },
  "move-base": { text: "회막을 실로에", x: 130, y: 248, t: 0.6 },
  // 세겜 위는 20장 깃발 자리라 지도 왼쪽 위 빈 곳에
  "refuge-cities": { text: "도피성 여섯 곳", x: 128, y: 84, t: 0.4 },
  "levite-cities": [
    { text: "레위인의 성읍 48", x: 170, y: 30, t: 0.3, dur: 2.2 },
    // 21:43 — 레위 성읍까지 나뉘고 나서 온 땅이 함께 빛난다(AllLandGlow 와 같은 때)
    { text: "온 땅을 다 주심", x: 170, y: 30, t: 2.6 },
  ],
  // 23장은 모인 장소가 본문에 없어 세겜이 아니라 땅 가운데로 모인다
  gather: { text: "온 이스라엘을 불러 모음", x: 264, y: 196, t: 0.4 },
  "arrive-final": { text: "큰 돌을 세움", x: 180, y: 166, t: 1.8 },
};

export function MapEffectLayer({ kind, layer, delay }: { kind: MapEffect; layer: "under" | "over"; delay: number }) {
  const style = { "--fx-delay": `${delay}s` } as Style;
  const body = layer === "under" ? under(kind) : over(kind);
  const caps = layer === "over" ? [CAPTIONS[kind] ?? []].flat() : [];
  if (!body && caps.length === 0) return null;
  return (
    <g aria-hidden className="fx" style={style} pointerEvents="none">
      {body}
      {caps.map((c) => (
        <Caption key={c.text} {...c} />
      ))}
    </g>
  );
}

/** 사건 이름표: 옅은 바탕 알약 + 굵은 글자. 글자 폭은 한글 기준으로 어림한다 */
function Caption({ text, x, y, t, dur }: Cap) {
  const w = [...text].reduce((n, ch) => n + (ch === " " ? 3.4 : /[0-9]/.test(ch) ? 6.2 : 10.4), 0) + 14;
  return (
    <g className="fx-caption" style={T(t, dur ? { "--cap-dur": `${dur}s` } : undefined)}>
      <rect x={x - w / 2} y={y - 9} width={w} height="18" rx="9" fill="var(--color-surface)" stroke="var(--color-main)" strokeWidth="1.2" />
      <text x={x} y={y + 3.8} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--color-main)">
        {text}
      </text>
    </g>
  );
}

function under(kind: MapEffect): React.ReactNode {
  if (kind === "cross-jordan") return <JordanStops />;
  if (kind === "spies") return <GhostSite id="jericho" t={0} />;
  if (kind === "levite-cities") return <AllLandGlow t={2.4} />;
  const land = LAND[kind];
  if (land) return land.map((id, i) => <Land key={id} id={id} t={i * 0.5} />);
  return null;
}

function over(kind: MapEffect): React.ReactNode {
  switch (kind) {
    case "spies":
      return (
        <>
          {[0, 0.18].map((t, i) => (
            <Traveler key={i} from={offset(SITES.shittim, -2 + i * 5, -4)} to={offset(SITES.jericho, 0, -2)} t={t} dur={1.1} round />
          ))}
          {/* 정탐꾼이 여리고에 닿는 때(왕복의 가운데) */}
          <Pulse at={SITES.jericho} t={1.1} />
        </>
      );
    case "walls-fall":
      return <JerichoWalls />;
    case "twelve-stones":
      return <TwelveStones />;
    case "manna-ends":
      return <MannaEnds />;
    case "sun-moon":
      return <SunMoon />;
    case "move-base":
      return <MoveBase />;
    case "land-caleb":
      return <Pulse at={SITES.hebron} t={0.6} />;
    case "refuge-cities":
      return <RefugeCities />;
    case "levite-cities":
      return <LeviteCities />;
    case "gather":
      return <Gather />;
    case "arrive-final":
      return <ArriveFinal />;
    default:
      return null;
  }
}

// ─── 공통 조각 ─────────────────────────────────────────────

const T = (t: number, extra?: Record<string, string>): Style => ({ "--t": `${t}s`, ...extra }) as Style;
const offset = (p: Pt, dx: number, dy: number): Pt => ({ x: p.x + dx, y: p.y + dy });

/** a → b 로 걷는 작은 점(round 면 갔다가 돌아온다). 끝나면 사라진다 */
function Traveler({ from, to, t = 0, dur = 1.2, r = 2.4, round = false }: { from: Pt; to: Pt; t?: number; dur?: number; r?: number; round?: boolean }) {
  return (
    <circle
      className={round ? "fx-roundtrip" : "fx-travel"}
      cx={from.x}
      cy={from.y}
      r={r}
      fill="var(--color-main)"
      stroke="var(--color-surface)"
      strokeWidth="1"
      style={T(t, { "--dx": `${to.x - from.x}px`, "--dy": `${to.y - from.y}px`, "--dur": `${dur}s` })}
    />
  );
}

/** 장소에서 퍼지는 동그라미 한 번 */
function Pulse({ at, t = 0, r = 14 }: { at: Pt; t?: number; r?: number }) {
  return <circle className="fx-pulse" cx={at.x} cy={at.y} r={r} fill="none" stroke="var(--color-main)" strokeWidth="1.8" style={T(t)} />;
}

/** 톡 나타나 남는 것(돌·등불 등). children 은 (0,0) 기준 */
function Pop({ at, t = 0, children }: { at: Pt; t?: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g className="fx-pop" style={T(t)}>
        {children}
      </g>
    </g>
  );
}

function Stone({ w = 4.6, h = 3.4 }: { w?: number; h?: number }) {
  return <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="1" fill="var(--color-main)" stroke="var(--color-surface)" strokeWidth=".8" />;
}

/**
 * 아직 지도에 드러나지 않은 장소를 그 장을 볼 때만 흐리게(점선 테두리) — 2장 정탐꾼이 빈자리에 다녀오지 않게(2026-11-04).
 * 2장 장 카드가 이미 "여리고"라고 알려 주므로 미리 보여도 새로 드러내는 것은 없다. 장소 아이콘 아래 층이라,
 * 그 장소가 열린 뒤(6장~)에는 실제 아이콘이 그 위를 덮는다.
 */
function GhostSite({ id, t }: { id: SiteId; t: number }) {
  const s = SITES[id];
  const label = siteLabelPosition(id);
  return (
    <g className="fx-appear" style={T(t)}>
      <circle cx={s.x} cy={s.y} r="13.5" fill="var(--color-surface)" stroke="var(--color-mid)" strokeWidth="1.2" strokeDasharray="3 2.5" />
      <g
        transform={`translate(${s.x - 9} ${s.y - 9}) scale(.75)`}
        fill="none"
        stroke="var(--color-mid)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <SiteGlyphPaths id={id} />
      </g>
      <text className="map-label" x={label.x} y={label.y} textAnchor={label.anchor} fontSize="11.5" fontWeight="500" fill="var(--color-mute)">
        {s.name}
      </text>
    </g>
  );
}

/** 땅 모양 하나(띠는 가나안 모양으로 자른다) */
function LandShape({ id, clipId, paint }: { id: TerritoryId; clipId: string; paint: React.SVGProps<SVGElement> }) {
  const land = TERRITORIES[id];
  const p = paint as React.SVGProps<SVGRectElement> & React.SVGProps<SVGPathElement> & React.SVGProps<SVGCircleElement>;
  if ("band" in land) {
    return (
      <>
        <defs>
          <clipPath id={clipId}>
            <path d={TERRAIN.canaan} />
          </clipPath>
        </defs>
        <rect
          x={land.x?.[0] ?? 0}
          y={land.band[0]}
          width={(land.x?.[1] ?? 360) - (land.x?.[0] ?? 0)}
          height={land.band[1] - land.band[0]}
          clipPath={`url(#${clipId})`}
          {...p}
        />
      </>
    );
  }
  return "d" in land ? <path d={land.d} {...p} /> : <circle {...land.circle} {...p} />;
}

/** 21장: 레위 성읍까지 나뉜 뒤 온 땅이 함께 한 번 빛난다(21:43 "온 땅을 다 주셨으므로") */
function AllLandGlow({ t }: { t: number }) {
  return (
    <g className="fx-glow" style={T(t)}>
      {/* 갈렙·시므온은 유다 땅 안이라 겹쳐 칠하면 진한 점으로 보인다 */}
      {(Object.keys(TERRITORIES) as TerritoryId[]).filter((id) => id !== "caleb" && id !== "simeon").map((id) => (
        <LandShape key={id} id={id} clipId={`glow-clip-${id}`} paint={{ fill: "var(--color-main)", fillOpacity: 0.16 }} />
      ))}
    </g>
  );
}

/** 그 장에서 새로 나뉜 땅: 옅게 채워지고 이름이 뜬다(그 장을 보는 동안 남는다) */
function Land({ id, t }: { id: TerritoryId; t: number }) {
  const land = TERRITORIES[id];
  return (
    <g className="fx-land" style={T(t)}>
      <LandShape
        id={id}
        clipId={`fx-clip-${id}`}
        paint={{ fill: "var(--color-main)", fillOpacity: 0.13, stroke: "var(--color-main)", strokeOpacity: 0.4, strokeWidth: 1, strokeDasharray: "3 3" }}
      />
      <text className="map-label" x={land.label.x} y={land.label.y} textAnchor="middle" fontSize={land.fontSize ?? 11} fontWeight="700" fill="var(--color-main)">
        {land.name}
      </text>
    </g>
  );
}

// ─── 장별 ────────────────────────────────────────────────

/** 3장: 건너는 자리 위에 물이 쌓이고 아래 물길이 마른다(3:16) → 다 건넌 뒤 다시 흐른다(4:18) */
function JordanStops() {
  const heap = TERRAIN.jordanHeap;
  return (
    <>
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
    </>
  );
}

/** 4장: 길갈에 돌 열두 개(5·4·3 단)가 아랫줄부터 하나씩 위에서 떨어져 쌓인다 */
function TwelveStones() {
  const base = offset(SITES.gilgal, -14, -30);
  const rows = [5, 4, 3];
  const stones: { at: Pt; n: number }[] = [];
  rows.forEach((count, row) => {
    for (let i = 0; i < count; i++) {
      stones.push({ at: { x: base.x + (i - (count - 1) / 2) * 7.2, y: base.y - row * 5.4 }, n: stones.length });
    }
  });
  return stones.map((s) => (
    <g key={s.n} transform={`translate(${s.at.x} ${s.at.y})`}>
      <g className="fx-drop" style={T(s.n * 0.13)}>
        <Stone w={6.6} h={4.8} />
      </g>
    </g>
  ));
}

/** 5장: 내리던 만나가 그친다(5:12) — 작은 알갱이가 내리다 멈춘다 */
function MannaEnds() {
  const g = SITES.gilgal;
  const xs = [-18, -11, -4, 3, 10, 17, -14, 7, -7, 14];
  return xs.map((dx, i) => (
    <circle
      key={i}
      className="fx-fall"
      cx={g.x + dx}
      cy={g.y - 34 + (i % 3) * 4}
      r="2.2"
      fill="var(--color-mute)"
      style={T(i * 0.14 * (1 + i * 0.12), { "--dy": "16px" })}
    />
  ));
}

/** 6장: 행렬이 성 둘레를 일곱 바퀴(6:15) → 외침이 퍼진다 → 아이콘이 흔들리고 조각이 떨어진다(6:20) */
function JerichoWalls() {
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
    <>
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
    </>
  );
}

/** 10장: 기브온 위에 해, 아얄론 골짜기에 달 — 떠서 멈춰 있다 */
function SunMoon() {
  // 기브온 위 — 왼쪽 위 아바타보다 높이
  const sun = offset(SITES.gibeon, 6, -66);
  const moon = EFFECT_SPOTS.aijalon;
  return (
    <>
      <Pop at={sun} t={0}>
        <circle r="6" fill="var(--color-surface)" stroke="var(--color-main)" strokeWidth="1.6" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={Math.cos(a) * 8.5}
              y1={Math.sin(a) * 8.5}
              x2={Math.cos(a) * 11}
              y2={Math.sin(a) * 11}
              stroke="var(--color-main)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          );
        })}
      </Pop>
      <Pop at={moon} t={0.45}>
        {/* 초승달: 바깥 반원 + 안쪽 반타원 */}
        <path d="M0,-7.5 A7.5,7.5 0 1,0 0,7.5 A4,7.5 0 1,1 0,-7.5Z" fill="var(--color-main)" />
      </Pop>
    </>
  );
}

/** 지금까지 머문 장소들(장 순서, 중복 없이) */
function sitesUpTo(day: number): SiteId[] {
  return [...new Set(JOURNEY_DAYS.slice(0, day).map((d) => d.site))];
}

/** 지나온 장소들이 차례로 반짝인다(24장 완주) */
function Overview({ upTo }: { upTo: number }) {
  return sitesUpTo(upTo).map((id, i) => <Pulse key={id} at={SITES[id]} t={i * 0.14} />);
}

/** 18장: 회막이 길갈에서 실로로 옮겨진다 */
function MoveBase() {
  const a = offset(SITES.gilgal, -12, -10);
  const b = offset(SITES.shiloh, -18, -14);
  return (
    <>
      <g className="fx-travel fx-keep" style={T(0, { "--dx": `${b.x - a.x}px`, "--dy": `${b.y - a.y}px`, "--dur": "1.4s" })}>
        <path
          d={`M${a.x - 8},${a.y + 6} L${a.x},${a.y - 6} L${a.x + 8},${a.y + 6}Z`}
          fill="var(--color-main)"
          stroke="var(--color-surface)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>
      <Pulse at={SITES.shiloh} t={1.45} />
    </>
  );
}

/** 20장: 도피성 여섯 곳에 등불이 켜진다 */
function RefugeCities() {
  return REFUGE_CITIES.map((c, i) => {
    const t = i * 0.18;
    const right = c.label === "right";
    return (
      <g key={c.name}>
        <Pop at={c} t={t}>
          <circle r="5.5" fill="var(--color-surface)" stroke="var(--color-main)" strokeWidth="1.4" />
          <circle r="2.4" fill="var(--color-main)" />
        </Pop>
        {/* 지도 장소(세겜·헤브론)는 지명이 이미 있어 이름을 따로 달지 않는다 */}
        {!c.site && (
          <text
            className="fx-appear map-label"
            x={right ? c.x + 9 : c.x}
            y={right ? c.y + 3.5 : c.y + 15}
            textAnchor={right ? "start" : "middle"}
            fontSize="9.5"
            fontWeight="600"
            fill="var(--color-mute)"
            style={T(t + 0.2)}
          >
            {c.name}
          </text>
        )}
      </g>
    );
  });
}

/** 21장: 레위인의 성읍 마흔여덟 곳이 땅 곳곳에 점으로 — 위치는 개념도(고르게 흩어 보이기만) */
function LeviteCities() {
  return levitePoints().map((p, i) => (
    <circle
      key={i}
      className="fx-pop-dot"
      cx={p.x}
      cy={p.y}
      r="1.9"
      fill="var(--color-main)"
      fillOpacity=".75"
      style={T((i % 16) * 0.06 + Math.floor(i / 16) * 0.12)}
    />
  ));
}

/** 정해진 씨앗으로 고르게 흩은 48점(서쪽 땅 36 · 동쪽 12). 그릴 때마다 같다 */
function levitePoints(): Pt[] {
  let seed = 48;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pts: Pt[] = [];
  // 서쪽: 위에서 아래로 — 왼쪽 끝은 바다 경계, 오른쪽 끝은 요단보다 안쪽
  for (let i = 0; i < 36; i++) {
    const y = 60 + (i / 36) * 410 + rnd() * 10;
    const west = 84 - (y / 500) * 34;
    const east = y < 400 ? 236 : 246;
    pts.push({ x: west + 8 + rnd() * (east - west - 16), y });
  }
  for (let i = 0; i < 12; i++) pts.push({ x: 286 + rnd() * 52, y: 140 + (i / 12) * 240 + rnd() * 12 });
  return pts;
}

/** 23장: 여호수아가 온 이스라엘을 불러 모은다(23:2) — 모인 장소는 본문에 없어 땅 가운데 빈 곳으로(특정 성읍을 가리키지 않게) */
function Gather() {
  const c = EFFECT_SPOTS.assembly;
  const from: SiteId[] = ["hazor", "east", "gilgal", "jericho", "gibeon", "hebron", "shechem", "ebal"];
  return from.map((id, i) => <Traveler key={id} from={SITES[id]} to={c} t={i * 0.07} dur={1.3} />);
}

/** 24장: 지나온 모든 장소가 반짝이고, 세겜에 큰 돌이 세워진다(24:26) */
function ArriveFinal() {
  const stone = offset(SITES.shechem, 0, -27);
  return (
    <>
      <Overview upTo={24} />
      <Pop at={stone} t={1.8}>
        <rect x="-4" y="-8" width="8" height="15" rx="2.5" fill="var(--color-main)" stroke="var(--color-surface)" strokeWidth="1.2" />
      </Pop>
    </>
  );
}
