/**
 * Marble 아바타 (ADR-018).
 *
 * 요구사항의 "Marbles" 는 DiceBear 에 없는 스타일이다(Boring Avatars 의 marble 변형).
 * 의존성 없이 같은 느낌 — 흐릿하게 섞인 색 덩어리 원형 — 을 seed 로부터 결정적으로 만든다.
 * - 같은 seed → 항상 같은 SVG (서버·클라이언트 어디서 만들어도 동일)
 * - seed 는 profile.avatar_seed(랜덤). 실명·userId·회원번호를 seed 로 쓰지 않는다.
 * - style/options 는 꾸미기 확장을 위한 자리다. 지금은 marble 만 있다.
 */

export type AvatarStyle = "marbles";

/** 길갈 톤(베이지·올리브·샌드·뮤트 블루)에 맞춘 팔레트 묶음 */
const PALETTES: readonly (readonly string[])[] = [
  ["#c9b48a", "#6b7344", "#e9dfcc", "#7d93a6"],
  ["#d8c3a0", "#8a6f4d", "#a7b49a", "#f3ecdf"],
  ["#7d93a6", "#e2d4b7", "#5e6b3a", "#c48d6a"],
  ["#b5a07a", "#dfe6e9", "#6f8195", "#8f9a6a"],
  ["#e8d9bd", "#a4775a", "#7a8a5c", "#9fb0bd"],
  ["#5f6f52", "#d9c7a7", "#b98b6e", "#e4ebe4"],
];

/** 문자열 → 32bit 해시 (FNV-1a) */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 해시에서 결정적 난수열을 뽑는다 (mulberry32) */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE = 80;

export function marbleSvg(seed: string): string {
  const hash = hashSeed(seed);
  const next = rng(hash);
  const palette = PALETTES[hash % PALETTES.length];
  // 팔레트 순서를 seed 별로 섞어 같은 팔레트라도 다른 얼굴이 되게 한다
  const colors = [...palette];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  const id = `m${hash.toString(36)}`;
  const r = (min: number, max: number) => (min + next() * (max - min)).toFixed(1);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">`,
    `<mask id="${id}k" maskUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}">`,
    `<rect width="${SIZE}" height="${SIZE}" rx="${SIZE * 2}" fill="#fff"/></mask>`,
    `<filter id="${id}f" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`,
    `<feGaussianBlur stdDeviation="7"/></filter>`,
    `<g mask="url(#${id}k)">`,
    `<rect width="${SIZE}" height="${SIZE}" fill="${colors[0]}"/>`,
    `<path filter="url(#${id}f)" fill="${colors[1]}" d="M32.4 -19.6C41.8 -1.8 64.5 2.3 72.2 18.1 80 33.9 72.8 61.3 55.6 72.9 38.4 84.6 11.1 80.4 -9.7 70.9 -30.6 61.4 -45 46.4 -47.1 28.9 -49.3 11.4 -39.1 -8.8 -24.3 -27.1 -9.6 -45.4 9.8 -61.6 22.1 -56.1 34.4 -50.5 23 -37.4 32.4 -19.6Z" transform="translate(${r(-20, 20)} ${r(-20, 20)}) rotate(${r(0, 360)} 40 40) scale(${r(0.9, 1.3)})"/>`,
    `<path filter="url(#${id}f)" fill="${colors[2]}" style="mix-blend-mode:overlay" d="M22.2 38.6c-2.6-12.1 9.1-24.7 22.3-26.3 13.2-1.6 27.8 7.8 30.6 20.3 2.8 12.5-6.2 28.1-19.4 32.6-13.2 4.5-30.8-2.2-33.5-26.6Z" transform="translate(${r(-25, 15)} ${r(-25, 15)}) rotate(${r(0, 360)} 40 40) scale(${r(1, 1.6)})"/>`,
    `<circle filter="url(#${id}f)" fill="${colors[3]}" cx="${r(10, 70)}" cy="${r(10, 70)}" r="${r(10, 22)}" opacity="0.85"/>`,
    `</g></svg>`,
  ].join("");
}

/** seed 형식 검증 — profile.avatar_seed 는 base64url 12자. 엔드포인트 입력 방어용 */
export function isValidSeed(seed: string): boolean {
  return /^[A-Za-z0-9_-]{4,64}$/.test(seed);
}

export function avatarSvg(seed: string, style: AvatarStyle = "marbles"): string {
  switch (style) {
    case "marbles":
      return marbleSvg(seed);
  }
}
