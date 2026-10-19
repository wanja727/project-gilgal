import { Avatar, Style } from "@dicebear/core";
import marblesDefinition from "@dicebear/styles/marbles.json";

/**
 * DiceBear Marbles 아바타 (ADR-007, CC0 1.0). 서버에서 SVG 를 만든다(외부 API 호출 없음).
 * - 같은 seed → 항상 같은 SVG
 * - seed 는 profile.avatar_seed(랜덤). 실명·userId·회원번호를 seed 로 쓰지 않는다.
 * - style/options 는 꾸미기 확장을 위한 자리다. 지금은 marbles 만 있다.
 */

export type AvatarStyle = "marbles";

// Style 은 정의를 파싱하므로 한 번만 만들어 재사용한다
const marbles = new Style(marblesDefinition);

/** seed 형식 검증 — profile.avatar_seed 는 base64url 12자. 엔드포인트 입력 방어용 */
export function isValidSeed(seed: string): boolean {
  return /^[A-Za-z0-9_-]{4,64}$/.test(seed);
}

export function avatarSvg(seed: string, style: AvatarStyle = "marbles"): string {
  switch (style) {
    case "marbles":
      return new Avatar(marbles, { seed }).toString();
  }
}
