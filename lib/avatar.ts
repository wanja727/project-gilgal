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
const bloom = { type: "color", name: "bloom" };
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
  browline: [
    line("M18.5 43q11.5-3.5 23 0M58.5 43q11.5-3.5 23 0", 4),
    line("M20 47.5q10 11 20 0M60 47.5q10 11 20 0", 1.6),
    line("M41.5 43.5h17", 2.4),
  ],
  sun: [
    el("ellipse", { cx: "30", cy: "48.5", rx: "10.5", ry: "8", fill: ink }),
    el("ellipse", { cx: "70", cy: "48.5", rx: "10.5", ry: "8", fill: ink }),
    line("M40 46.5q10-4 20 0", 2.4),
    line("M24.5 45.5q2.5-2.6 6.5-2.8M64.5 45.5q2.5-2.6 6.5-2.8", 1.6, { stroke: bloom, opacity: ".55" }),
  ],
};

/**
 * Marbles 머리(top)에 없는 긴 머리·묶은 머리. 다른 머리처럼 구슬 바깥을 감싸는 잉크 선만 쓴다(면 채움 없음).
 * top 변형 목록에 넣으면 꾸미지 않은 사람의 머리가 다시 뽑혀 바뀌므로 별도 부위(hair)로 두고,
 * 꾸미기에서는 "머리" 탭 안에 함께 보인다(고르면 top 은 끈다).
 * cap 은 Marbles 의 캡이 모자로 잘 읽히지 않아 다시 그린 것 — 꾸미기에서 고른 사람만 이 그림을 쓰고,
 * seed 로 캡이 뽑힌 사람은 원래 그림 그대로다.
 */
const paper = { type: "color", name: "background" };
const CAP_DOME = "M18 33C18 17 33 8 50 8s32 9 32 25q-32-5-64 0z";
const CAP_BRIM = "M15 33q35-6.5 70 0q-1 5-8 7q-27 7.5-54 0q-7-2-8-7z";
/** 캡모자: 정수리는 바탕색으로 막아 구슬이 비치지 않게, 챙은 잉크로 채워 모자로 읽히게(선글라스처럼 채운 부품) */
const CAP = [
  el("path", { d: CAP_DOME, fill: paper, stroke: ink, "stroke-width": "2.6", "stroke-linejoin": "round" }),
  line("M50 9q-9 9-11 23M50 9q9 9 11 23", 1.8),
  el("path", { d: CAP_BRIM, fill: ink, stroke: ink, "stroke-width": "2", "stroke-linejoin": "round" }),
  dot(50, 7.5, 2.6),
];
const HAIR = {
  bob: [line("M15 80C4 62 6 30 30 17c12-6 28-6 40 0 24 13 26 45 15 63M15 80q4 2.4 8-.8M85 80q-4 2.4-8-.8"), line("M58 15.5q-7 10-24 14", 2.4)],
  bangs: [line("M15 80C4 62 6 30 30 17c12-6 28-6 40 0 24 13 26 45 15 63M15 80q4 2.4 8-.8M85 80q-4 2.4-8-.8"), line("M21 37q29-16 58 0", 2.4)],
  long: [line("M22 90C8 76 5 40 26 20c14-11 34-11 48 0 21 20 18 56 4 70"), line("M50 11.5q-1.5 6-7 9.5", 2.4)],
  wavy: [
    line("M22 90c-6-4-1-9-7-14s-1-10-6-15c-4-6 0-12-2-18C9 28 28 12 50 12s41 16 40 31c-2 6 2 12-2 18-5 5 0 10-6 15s-1 10-7 14"),
    line("M50 12.5q-1.5 6-7 9.5", 2.4),
  ],
  ponytail: [line("M13 52C11 30 28 15 50 15s39 15 37 37"), line("M83 26c10-2 13 9 9 20-2.5 6-2.5 11 .5 15"), dot(82, 26.5, 3.2)],
  pigtails: [
    line("M14 50C12 28 30 15 50 15s38 13 36 35"),
    line("M14 42C2 42 1 62 8 72c2-10 4-18 8-23M86 42c12 0 13 20 6 30-2-10-4-18-8-23"),
  ],
  bun: [line("M15 48C13 28 30 17 50 17s37 11 35 31"), el("circle", { cx: "50", cy: "9.5", r: "6.5", fill: "none", stroke: ink, "stroke-width": "2.6" })],
  braid: [line("M14 54C11 30 29 15 50 15s37 14 37 29"), line("M87 44c5.5 2 5.5 7 0 9 5.5 2 5.5 7 0 9 5.5 2 5.5 7 0 9m0 0l1 4.5")],
  cap: CAP,
  tiltcap: [{ name: "g", type: "element", attributes: { transform: "rotate(-9 50 30)" }, children: CAP }],
};

/** 꾸미기에서 이 머리를 고르면 Marbles top 대신 hair 부위로 그린다 */
export const GILGAL_HAIR = new Set(Object.keys(HAIR));

const MUSTACHE = el("path", {
  d: "M50 57.2c-3.2-2.6-8.6-3-12 .4-1.7 1.7-4.4 1.5-5.4-.6 0 4 4.4 6.1 8.6 4.6 3.3-1.2 6-2.1 8.8-2.1 2.8 0 5.5.9 8.8 2.1 4.2 1.5 8.6-.6 8.6-4.6-1 2.1-3.7 2.3-5.4.6-3.4-3.4-8.8-3-12-.4z",
  fill: ink,
});

const FACE = {
  blush: [
    el("ellipse", { cx: "22", cy: "59", rx: "6", ry: "3.4", fill: ink, opacity: ".16" }),
    el("ellipse", { cx: "78", cy: "59", rx: "6", ry: "3.4", fill: ink, opacity: ".16" }),
  ],
  freckles: [dot(19.5, 57, 1.1), dot(24, 59, 1.1), dot(20.5, 61.5, 1.1), dot(80.5, 57, 1.1), dot(76, 59, 1.1), dot(79.5, 61.5, 1.1)],
  mole: [dot(65, 64, 1.4)],
  mustache: [MUSTACHE],
  // 턱 둘레를 덮는 수염 — 입 아래(78)부터 구슬 아래 끝까지, 입은 가리지 않는다
  beard: [
    el("path", { d: "M18 62c1 18 14 30 32 30s31-12 32-30c-5 10-16 17-32 17S23 72 18 62z", fill: ink, opacity: ".82" }),
    MUSTACHE,
  ],
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

function render(seed: string, parts: AvatarParts | null) {
  // 원형으로 잘라 내보낸다 — 지도 SVG 안의 <image> 에서도 clipPath 없이 동그랗게 보이도록
  const options = { seed, ...MARBLES_PALETTE, borderRadius: 50, ...(parts ? partOptions(parts) : {}) };
  const style = parts && parts.glasses !== NONE ? marblesWithGlasses : marbles;
  return new Avatar(style, options as ConstructorParameters<typeof Avatar>[1]);
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
