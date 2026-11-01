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

/**
 * 아바타 그림 버전. /api/avatar 는 seed 별로 영구 캐시되므로, 그림(팔레트 등)을 바꾸면 이 값을 올려
 * 새 주소로 받게 한다. 라우트는 이 값을 읽지 않는다 — 캐시 키를 바꾸는 용도다.
 */
export const AVATAR_RENDER_VERSION = "navy8"; // navy2: 웰링턴 안경·뺀 입, navy3: 점·수염·선글라스 뺌, navy4: 긴 웨이브 뺌, navy5: 긴 웨이브 좌우 대칭으로 되살림(2026-11-01), navy6: 웰링턴 테 두께 고르게, navy7: 양갈래 다발 끝, navy8: 양갈래 원래 모양으로 꼭지만(2026-11-02)

/** 아바타 키(seed 또는 seed~부품, lib/avatarParts.ts) → 이미지 주소 */
export function avatarUrl(avatarKey: string): string {
  return `/api/avatar/${encodeURIComponent(avatarKey)}?v=${AVATAR_RENDER_VERSION}`;
}
