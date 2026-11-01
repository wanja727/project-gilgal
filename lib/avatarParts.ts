/**
 * 아바타 꾸미기 부품 목록과 "아바타 키". 서버(그리기·저장 검증)와 클라이언트(꾸미기 화면)가 함께 쓰므로
 * DiceBear 를 import 하지 않는다. 그림은 lib/avatar.ts 가 그린다.
 *
 * 아바타 키 = seed 또는 `seed~머리.눈.입.코.안경.얼굴.색` — 이미지 주소(/api/avatar/[키])에 그대로 들어가
 * DB 조회 없이 그리고 영구 캐시할 수 있다. 꾸미지 않은 사람은 지금처럼 seed 만(그림도 그대로).
 */

export type AvatarPartId = "top" | "eyes" | "mouth" | "nose" | "glasses" | "face";
export type AvatarParts = Record<AvatarPartId, string> & { color: number };

export const NONE = "none";

type Option = { id: string; label: string };

/** 꾸미기 화면 탭 순서이자 키에 적는 순서. 순서·id 를 바꾸면 이미 저장된 키가 깨지므로 뒤에 추가만 한다 */
export const AVATAR_PARTS: { id: AvatarPartId; label: string; options: Option[]; optional: boolean }[] = [
  {
    id: "top",
    label: "머리",
    optional: true,
    options: [
      // 단발~땋은 머리와 캡모자는 길갈에서 그려 붙인 머리(lib/avatar.ts HAIR)
      { id: "bob", label: "단발" },
      { id: "bangs", label: "앞머리 단발" },
      { id: "long", label: "긴 생머리" },
      { id: "wavy", label: "긴 웨이브" },
      { id: "ponytail", label: "포니테일" },
      { id: "pigtails", label: "양갈래" },
      { id: "bun", label: "올림머리" },
      { id: "braid", label: "땋은 머리" },
      { id: "shag", label: "덥수룩" },
      { id: "curls", label: "두 고리" },
      { id: "ringlets", label: "꼬불꼬불" },
      { id: "afro", label: "뽀글" },
      { id: "crimp", label: "부스스" },
      { id: "flick", label: "물결 한 올" },
      { id: "curl", label: "꼭지" },
      { id: "swirl", label: "돌돌" },
      { id: "spikes", label: "삐죽" },
      { id: "zigzag", label: "지그재그" },
      { id: "cowlick", label: "까치머리" },
      { id: "tuft", label: "두 가닥" },
      { id: "knot", label: "매듭" },
      { id: "bow", label: "리본" },
      { id: "garland", label: "화관" },
      { id: "cap", label: "캡모자" },
      { id: "beanie", label: "비니" },
      { id: "sunhat", label: "챙모자" },
      { id: "headphones", label: "헤드폰" },
      { id: "antenna", label: "더듬이" },
    ],
  },
  {
    id: "eyes",
    label: "눈",
    optional: false,
    options: [
      { id: "dots", label: "콕" },
      { id: "oval", label: "동글" },
      { id: "wide", label: "또랑또랑" },
      { id: "happy", label: "웃는 눈" },
      { id: "closed", label: "감은 눈" },
      { id: "sleepy", label: "졸린 눈" },
      { id: "squint", label: "찡긋" },
      { id: "wink", label: "윙크" },
      { id: "uneven", label: "짝눈" },
    ],
  },
  {
    id: "mouth",
    label: "입",
    optional: false,
    options: [
      { id: "smile", label: "미소" },
      { id: "grin", label: "활짝" },
      { id: "small", label: "작은 입" },
      { id: "open", label: "벌린 입" },
      { id: "smirk", label: "씩" },
      { id: "line", label: "일자" },
      { id: "wavy", label: "물결" },
      { id: "jagged", label: "삐뚤" },
      { id: "pout", label: "시무룩" },
      { id: "cat", label: "고양이" },
      { id: "tongue", label: "메롱" },
    ],
  },
  {
    id: "nose",
    label: "코",
    optional: true,
    options: [
      { id: "tick", label: "일자 코" },
      { id: "hook", label: "갈고리 코" },
    ],
  },
  {
    // 아래 두 부위는 Marbles 에 없어 길갈에서 같은 선 굵기·잉크색으로 그려 붙였다(lib/avatar.ts)
    id: "glasses",
    label: "안경",
    optional: true,
    options: [
      { id: "round", label: "동그란" },
      { id: "square", label: "뿔테" },
      { id: "browline", label: "웰링턴" },
      { id: "sun", label: "선글라스" },
    ],
  },
  {
    id: "face",
    label: "얼굴",
    optional: true,
    options: [
      { id: "blush", label: "볼터치" },
      { id: "freckles", label: "주근깨" },
      { id: "mole", label: "점" },
      { id: "mustache", label: "콧수염" },
      { id: "beard", label: "턱수염" },
    ],
  },
];

/** 구슬 색 — lib/avatar.ts 의 남색 팔레트 순서(번호만 여기서 쓴다) */
export const AVATAR_COLOR_COUNT = 6;

const PART_IDS = AVATAR_PARTS.map((p) => p.id);
const KEY_RE = /^([A-Za-z0-9_-]{4,64})(?:~([a-z.0-9]{1,120}))?$/;

function isValidOption(part: (typeof AVATAR_PARTS)[number], value: unknown): value is string {
  return typeof value === "string" && ((part.optional && value === NONE) || part.options.some((o) => o.id === value));
}

function isValidColor(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < AVATAR_COLOR_COUNT;
}

/** DB(avatar_options jsonb)·클라이언트 입력 검증. 모든 부위가 허용 목록 안이어야 하고, 아니면 null(= 꾸미지 않음) */
export function parseAvatarParts(value: unknown): AvatarParts | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  for (const part of AVATAR_PARTS) if (!isValidOption(part, v[part.id])) return null;
  if (!isValidColor(v.color)) return null;
  const parts = { color: v.color } as AvatarParts;
  for (const id of PART_IDS) parts[id] = v[id] as string;
  return parts;
}

export function encodeAvatarKey(seed: string, parts: AvatarParts | null): string {
  if (!parts) return seed;
  return `${seed}~${[...PART_IDS.map((id) => parts[id]), parts.color].join(".")}`;
}

/** 이미지 주소의 키를 seed + 부품으로. 형식이 틀리면 null */
export function parseAvatarKey(key: string): { seed: string; parts: AvatarParts | null } | null {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  const [, seed, code] = m;
  if (code === undefined) return { seed, parts: null };
  const values = code.split(".");
  if (values.length !== PART_IDS.length + 1) return null;
  const raw: Record<string, unknown> = Object.fromEntries(PART_IDS.map((id, i) => [id, values[i]]));
  raw.color = /^\d$/.test(values[PART_IDS.length]) ? Number(values[PART_IDS.length]) : -1;
  const parts = parseAvatarParts(raw);
  return parts ? { seed, parts } : null;
}

/** DB 행(seed + avatar_options) → 화면에 보낼 아바타 키. 깨진 옵션은 무시하고 seed 그림으로 */
export function avatarKeyOf(seed: string, options: unknown): string {
  return encodeAvatarKey(seed, parseAvatarParts(options));
}

/** 섞기에서 수염과 함께 뽑지 않는 머리 — 긴 머리(길갈 HAIR)·리본·화관. 직접 고르는 건 막지 않는다 */
export const SOFT_TOPS = new Set(["bob", "bangs", "long", "wavy", "ponytail", "pigtails", "bun", "braid", "bow", "garland"]);
export const BEARDS = new Set(["mustache", "beard"]);

/**
 * 꾸미기 "섞기": 부위마다 아무거나. 안경·얼굴은 가끔만 붙여 처음 보는 모양이 너무 요란하지 않게.
 * 긴 머리·리본에 수염이 같이 뽑히면 보기 흉해서(2026-11-01 운영자) 그때는 수염이 아닌 얼굴 장식으로 바꾼다.
 */
export function randomAvatarParts(rand: () => number = Math.random): AvatarParts {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const parts = { color: Math.floor(rand() * AVATAR_COLOR_COUNT) } as AvatarParts;
  const chance: Partial<Record<AvatarPartId, number>> = { nose: 0.75, glasses: 0.3, face: 0.3 };
  for (const part of AVATAR_PARTS) {
    parts[part.id] = rand() < (chance[part.id] ?? 1) ? pick(part.options).id : NONE;
  }
  if (SOFT_TOPS.has(parts.top) && BEARDS.has(parts.face)) {
    const face = AVATAR_PARTS.find((p) => p.id === "face")!;
    parts.face = pick(face.options.filter((o) => !BEARDS.has(o.id))).id;
  }
  return parts;
}
