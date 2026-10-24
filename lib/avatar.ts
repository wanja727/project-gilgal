import { Avatar, Style } from "@dicebear/core";
import marblesDefinition from "@dicebear/styles/marbles.json";

/**
 * DiceBear Marbles 아바타 (ADR-007, CC0 1.0). 서버에서 SVG 를 만든다(외부 API 호출 없음).
 * - 같은 seed → 항상 같은 SVG
 * - seed 는 profile.avatar_seed(랜덤). 실명·userId·회원번호를 seed 로 쓰지 않는다.
 * - style/options 는 꾸미기 확장을 위한 자리다. 지금은 marbles 만 있다.
 * - 색은 서비스 톤(남색)에 맞춘 팔레트로 고정한다(ADR-021). 바꾸면 AVATAR_RENDER_VERSION 도 올려
 *   브라우저에 영구 캐시된 이전 그림을 새 주소로 갈아 끼운다.
 */

export type AvatarStyle = "marbles";

// Style 은 정의를 파싱하므로 한 번만 만들어 재사용한다
const marbles = new Style(marblesDefinition);

// 남색 계열 팔레트 — 얼굴 선(ink)이 보이도록 구슬 색은 중간~밝은 톤만 쓴다
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

export function avatarSvg(seed: string, style: AvatarStyle = "marbles"): string {
  switch (style) {
    case "marbles":
      // 원형으로 잘라 내보낸다 — 지도 SVG 안의 <image> 에서도 clipPath 없이 동그랗게 보이도록
      return new Avatar(marbles, { seed, ...MARBLES_PALETTE, borderRadius: 50 }).toString();
  }
}
