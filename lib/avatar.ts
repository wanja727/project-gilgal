import { Avatar, Style } from "@dicebear/core";
import marblesDefinition from "@dicebear/styles/marbles.json";
import { AVATAR_PARTS, type AvatarParts, NONE } from "./avatarParts";

/**
 * DiceBear Marbles 아바타 (ADR-007, CC0 1.0). 서버에서 SVG 를 만든다(외부 API 호출 없음).
 * - 같은 seed(+부품) → 항상 같은 SVG
 * - seed 는 profile.avatar_seed(랜덤). 실명·userId·회원번호를 seed 로 쓰지 않는다.
 * - 꾸미기(ADR-027): 사용자가 고른 부품(profile.avatar_options)을 DiceBear 의 *Variant 옵션으로 고정한다.
 *   고르지 않은 사람은 seed 가 부품을 정한다(지금까지와 같은 그림).
 * - 색은 서비스 톤(남색)에 맞춘 팔레트로 고정한다(ADR-021). 바꾸면 AVATAR_RENDER_VERSION 도 올려
 *   브라우저에 영구 캐시된 이전 그림을 새 주소로 갈아 끼운다.
 */

export type AvatarStyle = "marbles";

type Json = Record<string, unknown>;
const ink = { type: "color", name: "ink" };
const el = (name: string, attributes: Json) => ({ name, type: "element", attributes });
/** Marbles 의 선과 같은 굵기·끝 모양 */
const line = (d: string, width = 2.6, extra: Json = {}) =>
  el("path", { d, fill: "none", stroke: ink, "stroke-width": String(width), "stroke-linecap": "round", "stroke-linejoin": "round", ...extra });
const dot = (cx: number, cy: number, r: number, extra: Json = {}) =>
  el("circle", { cx: String(cx), cy: String(cy), r: String(r), fill: ink, ...extra });

/**
 * Marbles 에 없는 안경·얼굴 부품. 좌표는 아바타 전체(100×100) 기준 — 얼굴 구슬 중심 (50,56) 반지름 36,
 * 눈 중심 (30,48)·(70,48), 코 50~58, 입 62 아래.
 * 기본 확률 0 이라 고르지 않은 사람의 그림·무작위 순서는 그대로다(테스트로 확인).
 */
const GLASSES = {
  round: [
    el("circle", { cx: "30", cy: "48", r: "9.5", fill: "none", stroke: ink, "stroke-width": "2.4" }),
    el("circle", { cx: "70", cy: "48", r: "9.5", fill: "none", stroke: ink, "stroke-width": "2.4" }),
    line("M39.5 47q10.5-4 21 0", 2.4),
    line("M20.5 46l-5.5-1.8M79.5 46l5.5-1.8", 2.4),
  ],
  square: [
    el("rect", { x: "18.5", y: "40.5", width: "23", height: "16", rx: "5", fill: "none", stroke: ink, "stroke-width": "2.8" }),
    el("rect", { x: "58.5", y: "40.5", width: "23", height: "16", rx: "5", fill: "none", stroke: ink, "stroke-width": "2.8" }),
    line("M41.5 46h17", 2.6),
    line("M18.5 44.5l-4.5-1.2M81.5 44.5l4.5-1.2", 2.6),
  ],
  // 웰링턴(id 는 저장된 키 때문에 browline 그대로): 위가 넓은 사다리꼴 테, 다른 안경처럼 고른 두께.
  // 예전엔 아랫테가 가는 반무테 → 온테 + 굵은 윗테였다가, 테 장식보다 모양이 주는 느낌이 중요해 윗테도 같은 굵기로(2026-11-02)
  browline: [
    line("M18.5 42.5q11.5-3.5 23 0l-1.4 9q-10.1 9.5-20.2 0z", 2.4),
    line("M58.5 42.5q11.5-3.5 23 0l-1.4 9q-10.1 9.5-20.2 0z", 2.4),
    line("M41.5 44.5q8.5-3 17 0", 2.4),
    line("M18.5 44.5l-4.5-1.2M81.5 44.5l4.5-1.2", 2.4),
  ],
};

/**
 * Marbles 머리(top)에 없는 긴 머리·묶은 머리. 다른 머리처럼 구슬 바깥을 감싸는 잉크 선만 쓴다(면 채움 없음).
 * top 변형 목록에 넣으면 꾸미지 않은 사람의 머리가 다시 뽑혀 바뀌므로 별도 부위(hair)로 두고,
 * 꾸미기에서는 "머리" 탭 안에 함께 보인다(고르면 top 은 끈다).
 */
/** 짧은 남자 머리의 외곽(정수리)과 옆머리 */
const SHORT_CROWN = "M15.5 50C12 29 29 13.5 50 13.5S88 29 84.5 50";
const SHORT_SIDEBURNS = "M15.5 50l1.4 6M84.5 50l-1.4 6";

const HAIR = {
  bob: [line("M15 80C4 62 6 30 30 17c12-6 28-6 40 0 24 13 26 45 15 63M15 80q4 2.4 8-.8M85 80q-4 2.4-8-.8"), line("M58 15.5q-7 10-24 14", 2.4)],
  bangs: [line("M15 80C4 62 6 30 30 17c12-6 28-6 40 0 24 13 26 45 15 63M15 80q4 2.4 8-.8M85 80q-4 2.4-8-.8"), line("M21 37q29-16 58 0", 2.4)],
  // 중단발(2026-11-01): 단발(턱)과 긴 생머리 사이, 어깨에 닿는 길이 — 끝은 말지 않고 곧게
  medium: [line("M17 86C5 68 6 31 30 18c12-7 28-7 40 0 24 13 25 50 13 68"), line("M58 15.5q-7 10-24 14", 2.4)],
  long: [line("M22 90C8 76 5 40 26 20c14-11 34-11 48 0 21 20 18 56 4 70"), line("M50 11.5q-1.5 6-7 9.5", 2.4)],
  // 앞머리 긴 생머리(2026-11-02): 긴 생머리 외곽 + 단발과 같은 넘긴 앞머리(가르마 선은 앞머리와 겹쳐 뺀다)
  longbangs: [line("M22 90C8 76 5 40 26 20c14-11 34-11 48 0 21 20 18 56 4 70"), line("M58 15.5q-7 10-24 14", 2.4)],
  // 긴 웨이브(2026-11-01 되살림): 예전 그림의 오른쪽이 왼쪽보다 3 만큼 안쪽이라 오른쪽 볼에 붙어 보였다 —
  // 왼쪽 절반을 그대로 좌우 대칭으로 옮겨 양쪽이 같은 간격으로 떨어지게
  wavy: [
    line("M22 90C16 86 21 81 15 76C9 71 14 66 9 61C5 55 9 49 7 43C9 28 28 12 50 12"),
    line("M78 90C84 86 79 81 85 76C91 71 86 66 91 61C95 55 91 49 93 43C91 28 72 12 50 12"),
    line("M50 12.5q-1.5 6-7 9.5", 2.4),
  ],
  ponytail: [line("M13 52C11 30 28 15 50 15s39 15 37 37"), line("M83 26c10-2 13 9 9 20-2.5 6-2.5 11 .5 15"), dot(82, 26.5, 3.2)],
  pigtails: [
    line("M14 50C12 28 30 15 50 15s38 13 36 35"),
    // 다발 안쪽 선: 원래 곡선(8,72 → 16,49) 그대로 두고, 머리선(14,50)과 만나는 곳에서 끝내 관자놀이로 파고들던 꼭지만 없앴다(2026-11-02)
    line("M14 42C2 42 1 62 8 72c1.8 -9.01 3.6 -16.4 6.87 -21.43M86 42c12 0 13 20 6 30c-1.8 -9.01 -3.6 -16.4 -6.87 -21.43"),
  ],
  bun: [line("M15 48C13 28 30 17 50 17s37 11 35 31"), el("circle", { cx: "50", cy: "9.5", r: "6.5", fill: "none", stroke: ink, "stroke-width": "2.6" })],
  braid: [line("M14 54C11 30 29 15 50 15s37 14 37 29"), line("M87 44c5.5 2 5.5 7 0 9 5.5 2 5.5 7 0 9 5.5 2 5.5 7 0 9m0 0l1 4.5")],
  // 짧은 남자 머리(2026-11-01) — Marbles 머리는 정수리 몇 가닥이라 평범한 짧은 커트를 고를 수 없었다.
  // 정수리를 둥글게 덮고 귀 위에서 짧은 옆머리로 구슬에 붙는다
  crop: [line(SHORT_CROWN), line(SHORT_SIDEBURNS, 2.4), line("M37 21.5l-1.6 5M50 20v5.5M63 21.5l1.6 5", 2.2)],
  sidepart: [line(SHORT_CROWN), line(SHORT_SIDEBURNS, 2.4), line("M60 15q-7 10.5-26 15", 2.4)],
  // 올백: 정수리를 높이 올리고 이마 선에서 뒤로 빗어 넘긴 세로 결 다섯 줄
  allback: [
    line("M15.5 50C12 26 28 9.5 50 9.5S88 26 84.5 50"),
    line(SHORT_SIDEBURNS, 2.4),
    line("M31 26q-2-5 0-10M40.5 22.5q-1-6 .5-11M50 21.5v-10.5M59.5 22.5q1-6-.5-11M69 26q2-5 0-10", 2),
  ],
  // 덮은 앞머리: 가운데서 양옆으로 흘러내려 이마를 덮는 남자 커트
  curtain: [line(SHORT_CROWN), line(SHORT_SIDEBURNS, 2.4), line("M50 16.5q-4 9-20 14.5M50 16.5q4 9 20 14.5", 2.4)],
  // 정수리를 작은 물결로(타원 위 11개 물결, 생성 식은 커밋 기록 참고)
  shortcurl: [
    line("M15.1 49.6 Q10.8 43.3 17.2 39.4 Q14.6 32.1 21.7 30.1 Q20.9 22.5 28.1 22.5 Q29.4 15.1 36.2 17.1 Q39.3 10.4 45.3 14.4 Q50.0 8.8 54.7 14.4 Q60.7 10.4 63.8 17.1 Q70.6 15.1 71.9 22.5 Q79.1 22.5 78.3 30.1 Q85.4 32.1 82.8 39.4 Q89.2 43.3 84.9 49.6"),
    line("M15.1 49.6l1.6 6.4M84.9 49.6l-1.6 6.4", 2.4),
  ],
};

/**
 * 캡모자: Marbles 의 캡(top.cap)이 모자로 잘 읽히지 않아 그림만 바꿔 끼운다(변형 이름·뽑힐 확률은 그대로).
 * 다른 머리·모자처럼 선만 긋고 면은 채우지 않는다(정수리 안으로 구슬이 비친다).
 */
// 띠는 머리(구슬 중심 50,56 반지름 36) 폭에 맞춰 머리에 얹히게, 정수리는 머리 위로 10 만큼 올려 깊은 모자로
// (머리에 딱 붙는 낮은 정수리는 아기 모자처럼 보였다)
const CAP_DOME = "M17.1 36C16 20 31 10 50 10s34 10 32.9 26q-32.9-5.5-65.8 0z";
// 챙: 띠를 따라오다 왼쪽으로 빠져나와 이마 앞으로 돌아오는 옆챙 — 정면 챙은 얼굴에 겹쳐 띠처럼 보여서
// 머리 밖으로 나온 챙 모양이 보이는 옆챙으로 그린다(2026-10-29 운영자 선택)
// 아래 선은 띠 오른쪽 끝으로 돌아와 닫힌다
const CAP_BRIM = "M82.9 36q-32.9-5.5-65.8 0q-9 1.5-12 5 12 3 30 2 30-1 47.8-7z";
const CAP = [
  line(CAP_DOME),
  line(CAP_BRIM),
  dot(50, 9, 2.4),
];

/** 꾸미기에서 이 머리를 고르면 Marbles top 대신 hair 부위로 그린다 */
export const GILGAL_HAIR = new Set(Object.keys(HAIR));

const FACE = {
  blush: [
    el("ellipse", { cx: "22", cy: "59", rx: "6", ry: "3.4", fill: ink, opacity: ".16" }),
    el("ellipse", { cx: "78", cy: "59", rx: "6", ry: "3.4", fill: ink, opacity: ".16" }),
  ],
  freckles: [dot(19.5, 57, 1.1), dot(24, 59, 1.1), dot(20.5, 61.5, 1.1), dot(80.5, 57, 1.1), dot(76, 59, 1.1), dot(79.5, 61.5, 1.1)],
};

const toVariants = (shapes: Record<string, unknown[]>) =>
  Object.fromEntries(Object.entries(shapes).map(([id, elements]) => [id, { elements }]));

/**
 * Marbles 정의를 복사해 안경·얼굴 부위를 덧붙인 길갈 스타일. 안경은 맨 위, 얼굴(수염 등)은 입 아래 층.
 * steadyEyes: 안경을 쓴 아바타용 — 안경테는 똑바로 그려져 있어 눈만 기울면 어긋나 보인다(눈 기울기는 옵션으로 못 끈다)
 */
function gilgalMarbles(steadyEyes: boolean) {
  const def = structuredClone(marblesDefinition) as unknown as {
    components: Record<string, Json>;
    canvas: { elements: Json[] };
  };
  if (steadyEyes) delete def.components.eyes.rotate;
  // top 은 캔버스에서 translate(2) 로 놓이므로 되돌려 가운데에 맞춘다
  (def.components.top.variants as Json).cap = {
    elements: [{ name: "g", type: "element", attributes: { transform: "translate(-2)" }, children: CAP }],
  };
  const at = (name: string) => def.canvas.elements.findIndex((e) => e.name === name);
  def.components.hair = { width: 100, height: 100, probability: 0, variants: toVariants(HAIR) };
  def.canvas.elements.splice(at("top") + 1, 0, { name: "hair", type: "component" });
  def.components.glasses = { width: 100, height: 100, probability: 0, variants: toVariants(GLASSES) };
  def.components.face = { width: 100, height: 100, probability: 0, variants: toVariants(FACE) };
  def.canvas.elements.splice(at("mouth"), 0, { name: "face", type: "component" });
  def.canvas.elements.splice(at("mouth") + 1, 0, { name: "glasses", type: "component" });
  return def;
}

// Style 은 정의를 파싱하므로 한 번만 만들어 재사용한다
const marbles = new Style(gilgalMarbles(false) as unknown as typeof marblesDefinition);
const marblesWithGlasses = new Style(gilgalMarbles(true) as unknown as typeof marblesDefinition);

// 남색 계열 팔레트 — 얼굴 선(ink)이 보이도록 구슬 색은 중간~밝은 톤만 쓴다.
// sphereColor 순서는 꾸미기의 "색" 번호다(AVATAR_COLOR_COUNT) — 순서를 바꾸면 고른 색이 바뀐다
const MARBLES_PALETTE = {
  backgroundColor: ["#f6f8fb"],
  sphereColor: ["#6f87a8", "#a9bbd3", "#8c97a8", "#7fa0c4", "#b7c6d9", "#93a9c6"],
  blendColor: ["#3a5578", "#6f87a8", "#a9bbd3", "#dce4ef", "#5b7699"],
  tintColor: ["#dce4ef", "#f6f8fb", "#e9edf3"],
  inkColor: ["#1e3150"],
};

/** seed 형식 검증 — profile.avatar_seed 는 base64url 12자. 엔드포인트 입력 방어용 */
export function isValidSeed(seed: string): boolean {
  return /^[A-Za-z0-9_-]{4,64}$/.test(seed);
}

/** 고른 부품 → DiceBear 옵션. "없음"은 확률 0, 그 밖은 변형 고정 + 확률 100 */
function partOptions(parts: AvatarParts): Json {
  const o: Json = { sphereColor: [MARBLES_PALETTE.sphereColor[parts.color]] };
  for (const { id } of AVATAR_PARTS) {
    if (parts[id] === NONE) o[`${id}Probability`] = 0;
    else if (id === "top" && GILGAL_HAIR.has(parts.top)) Object.assign(o, { topProbability: 0, hairVariant: parts.top, hairProbability: 100 });
    else Object.assign(o, { [`${id}Variant`]: parts[id], [`${id}Probability`]: 100 });
  }
  return o;
}

/**
 * 꾸미기에서 뺀 입(2026-11-01). Marbles 의 무작위 후보에서 지우면 모든 사람의 기본 입이 다시 뽑혀 바뀌므로,
 * 후보는 그대로 두고 이 입이 나온 seed 만 남은 입 중 하나(seed 로 정해져 늘 같음)로 바꿔 그린다.
 */
const RETIRED_MOUTHS = new Set(["pout", "tongue"]);
const MOUTHS = AVATAR_PARTS.find((p) => p.id === "mouth")!.options.map((o) => o.id);

function seedIndex(seed: string, n: number) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % n;
}

function render(seed: string, parts: AvatarParts | null) {
  // 원형으로 잘라 내보낸다 — 지도 SVG 안의 <image> 에서도 clipPath 없이 동그랗게 보이도록
  const options = { seed, ...MARBLES_PALETTE, borderRadius: 50, ...(parts ? partOptions(parts) : {}) };
  const style = parts && parts.glasses !== NONE ? marblesWithGlasses : marbles;
  const avatar = new Avatar(style, options as ConstructorParameters<typeof Avatar>[1]);
  if (parts) return avatar;
  const mouth = (avatar.toJSON().options as Json).mouthVariant;
  if (typeof mouth !== "string" || !RETIRED_MOUTHS.has(mouth)) return avatar;
  const replaced = { ...options, mouthVariant: MOUTHS[seedIndex(seed, MOUTHS.length)], mouthProbability: 100 };
  return new Avatar(style, replaced as ConstructorParameters<typeof Avatar>[1]);
}

export function avatarSvg(seed: string, parts: AvatarParts | null = null, style: AvatarStyle = "marbles"): string {
  switch (style) {
    case "marbles":
      return render(seed, parts).toString();
  }
}

/** 꾸미지 않은 사람의 지금 모양을 부품으로 풀어낸다 — 꾸미기 화면이 지금 모양에서 출발하도록 */
export function resolveAvatarParts(seed: string, parts: AvatarParts | null): AvatarParts {
  if (parts) return parts;
  const o = render(seed, null).toJSON().options as Json;
  const resolved = { color: Math.max(0, MARBLES_PALETTE.sphereColor.indexOf((o.sphereColor as string[])[0])) } as AvatarParts;
  for (const { id } of AVATAR_PARTS) resolved[id] = typeof o[`${id}Variant`] === "string" ? (o[`${id}Variant`] as string) : NONE;
  return resolved;
}
