/**
 * 아바타 seed 형식과 생성. 서버(프로필 생성)와 클라이언트(아바타 섞기 미리보기)가 함께 쓰므로
 * DiceBear 를 import 하지 않는 별도 모듈로 둔다.
 * seed 는 9바이트 랜덤의 base64url(12자) — 실명·userId·회원번호와 연결되지 않는다.
 */
export const AVATAR_SEED_RE = /^[A-Za-z0-9_-]{12}$/;

export function randomAvatarSeed(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
