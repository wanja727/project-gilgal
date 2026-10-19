/**
 * 여정 지도의 주요 지점과 지형 (교육용 schematic map, architecture 8.2).
 * 실제 위경도가 아니라 이야기 흐름을 보여 주기 위한 개략 좌표다.
 * 좌표계: viewBox 0 0 360 520, 북쪽이 위. 지중해는 왼쪽, 요단강은 오른쪽 세로선.
 */
export const MAP_VIEWBOX = { width: 360, height: 520 } as const;

export const LOCATIONS = {
  shittim: { name: "요단 동쪽", x: 300, y: 312, labelSide: "right" },
  jordan: { name: "요단강", x: 262, y: 300, labelSide: "right" },
  gilgal: { name: "길갈", x: 244, y: 318, labelSide: "right" },
  jericho: { name: "여리고", x: 226, y: 334, labelSide: "left" },
  ai: { name: "아이", x: 200, y: 300, labelSide: "left" },
  ebal: { name: "에발산", x: 186, y: 214, labelSide: "left" },
  gibeon: { name: "기브온", x: 170, y: 326, labelSide: "left" },
  hebron: { name: "헤브론", x: 168, y: 410, labelSide: "left" },
  hazor: { name: "하솔", x: 236, y: 74, labelSide: "left" },
  shiloh: { name: "실로", x: 214, y: 262, labelSide: "right" },
  shechem: { name: "세겜", x: 206, y: 230, labelSide: "right" },
} as const satisfies Record<string, { name: string; x: number; y: number; labelSide: "left" | "right" }>;

export type LocationId = keyof typeof LOCATIONS;

/** 여정의 출발점 (DAY 1 이전의 위치) */
export const START_LOCATION: LocationId = "shittim";

/** 지형 경로 (SVG path d) */
export const TERRAIN = {
  // 지중해 해안선: 이 선의 왼쪽이 바다
  coast: "M0 0 L96 0 C92 60 88 110 84 150 C78 210 70 260 62 310 C54 360 46 420 40 520 L0 520 Z",
  // 요단강: 갈릴리 호수 아래에서 사해까지
  jordan:
    "M252 146 C256 170 248 190 254 214 C260 236 252 256 258 278 C262 298 256 318 260 344",
  galilee: { cx: 250, cy: 126, rx: 11, ry: 20 },
  deadSea: { cx: 262, cy: 392, rx: 13, ry: 46 },
} as const;
