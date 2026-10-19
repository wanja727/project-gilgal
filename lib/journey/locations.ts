/**
 * 여정 지도의 주요 지점.
 * 지도 좌표·경로·지파 영역은 지도 작업(T13)에서 이 파일에 추가한다.
 * 교육용 schematic map 이므로 실제 위경도는 두지 않는다.
 */
export const LOCATIONS = {
  shittim: { name: "요단 동쪽" },
  jordan: { name: "요단강" },
  gilgal: { name: "길갈" },
  jericho: { name: "여리고" },
  ai: { name: "아이" },
  ebal: { name: "에발산" },
  gibeon: { name: "기브온" },
  hebron: { name: "헤브론" },
  hazor: { name: "하솔" },
  shiloh: { name: "실로" },
  shechem: { name: "세겜" },
} as const satisfies Record<string, { name: string }>;

export type LocationId = keyof typeof LOCATIONS;
