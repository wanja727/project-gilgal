/** 나눔 한 개로 바로 가는 주소 조각(#share-<id>) — 홈 말풍선·"내 나눔 보기"가 이 나눔을 가리킬 때 */
export function shareAnchor(id: number) {
  return `share-${id}`;
}
