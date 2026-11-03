/**
 * 여정 지도의 장소와 지형 (교육용 개념도 schematic map, architecture 8.2).
 * 실제 위경도가 아니라 이야기 흐름을 보여 주기 위한 개략 좌표다.
 * 좌표계: viewBox 0 0 360 500, 북쪽이 위. 지중해는 왼쪽, 요단강은 오른쪽 세로선. (디자인 시안 v5)
 *
 * ⚠️ scene(핵심 장면 이름)·description 은 초안이다. 교회 검토 후 이 파일에서 고친다.
 *    본문 사건을 짧게 가리키는 안내만 쓰고, 해석이나 신학적 해설은 덧붙이지 않는다(핵심 4).
 */
export const MAP_VIEWBOX = { x: 0, y: 0, width: 360, height: 500 } as const;

type LabelAnchor = "start" | "middle" | "end";

export type Site = {
  name: string;
  x: number;
  y: number;
  /** 라벨 위치: 지점 중심에서의 기본 오프셋과 정렬 */
  label: { dx: number; dy: number; anchor: LabelAnchor };
  /** 핵심 장면 이름 (장소 카드·범례) */
  scene: string;
  /** 장소 카드 한 줄 설명 */
  description: string;
  /** 지도에서 내 아바타를 지점 아이콘 옆에 둘 때의 오프셋 (아이콘·라벨을 가리지 않게). dy > 0 이면 "내 위치" 이름표는 아바타 아래 */
  avatarOffset?: { dx: number; dy: number };
  /** "내 위치" 이름표를 아바타 기준 가로로 옮길 때(옆 장소 아이콘에 걸리는 자리) */
  tagDx?: number;
};

export const SITES = {
  shittim: {
    // 왼쪽 위는 아바타·"내 위치" 이름표 자리라 지명은 오른쪽에
    name: "싯딤", x: 318, y: 312, label: { dx: 12, dy: 4, anchor: "start" },
    scene: "이스라엘의 진영",
    description: "요단 동쪽에 진을 치고 강을 건널 준비를 한 곳이에요.",
  },
  jordan: {
    name: "요단강", x: 263, y: 340, label: { dx: 10, dy: 16, anchor: "start" },
    scene: "언약궤와 멈춘 강물",
    description: "언약궤를 멘 제사장들의 발이 물에 닿자 흐르던 물이 멈추었어요.",
    // 강을 건넜다는 게 보이게 강줄기에서 비켜 서쪽 기슭(가나안 쪽, 아이콘 왼쪽 아래)에 선다(2026-11-04).
    // 이름표는 아래 여리고 아이콘에 걸리지 않게 오른쪽으로
    avatarOffset: { dx: -26, dy: 10 },
    tagDx: 12,
  },
  gilgal: {
    // 오른쪽엔 아바타와 "내 위치" 이름표가 오므로 지명은 왼쪽에 둔다
    name: "길갈", x: 242, y: 314, label: { dx: -12, dy: 4, anchor: "end" },
    scene: "열두 돌",
    description: "요단 가운데서 가져온 열두 돌을 세워 하나님이 하신 일을 기억하게 했어요.",
    // 아래 요단강 아이콘에 닿지 않게 오른쪽 위로(아바타를 키운 뒤, 2026-11-03)
    avatarOffset: { dx: 24, dy: -12 },
  },
  jericho: {
    name: "여리고", x: 210, y: 376, label: { dx: 0, dy: 21, anchor: "middle" },
    scene: "여리고 성벽",
    description: "칠 일 동안 성을 돌고 나팔을 불며 외치자 성벽이 무너졌어요.",
    // 아래는 지명 자리라 이름표가 위로 가게 살짝 위로
    avatarOffset: { dx: -26, dy: -2 },
  },
  ai: {
    name: "아이", x: 170, y: 300, label: { dx: -12, dy: 4, anchor: "end" },
    scene: "아이 성의 돌무더기",
    description: "한 번 패했던 아이 성을 다시 얻고, 그 자리에 큰 돌무더기를 쌓았어요.",
  },
  ebal: {
    name: "에발산", x: 146, y: 206, label: { dx: -12, dy: 4, anchor: "end" },
    scene: "율법을 새긴 돌",
    description: "에발산에 제단을 쌓고 모세의 율법을 돌에 기록해 낭독했어요.",
  },
  gibeon: {
    name: "기브온", x: 118, y: 338, label: { dx: 0, dy: 20, anchor: "middle" },
    scene: "멈춘 해와 달",
    description: "기브온을 지키던 날, 해와 달이 머물렀어요.",
  },
  hazor: {
    name: "하솔", x: 222, y: 66, label: { dx: 12, dy: 4, anchor: "start" },
    scene: "불탄 하솔",
    description: "북쪽 연합군의 중심이던 하솔 성을 불살랐어요.",
  },
  hebron: {
    name: "헤브론", x: 152, y: 452, label: { dx: 12, dy: 4, anchor: "start" },
    scene: "갈렙의 산지",
    description: "마흔다섯 해 전의 약속대로 갈렙이 헤브론 산지를 받았어요.",
  },
  shiloh: {
    name: "실로", x: 194, y: 258, label: { dx: 0, dy: 18, anchor: "middle" },
    scene: "회막",
    description: "온 회중이 실로에 모여 회막을 세우고 남은 땅을 나누었어요.",
    // 왼쪽 위는 세겜, 왼쪽 아래는 세겜의 아바타 자리라 오른쪽에 두고, 지명은 아래로
    avatarOffset: { dx: 26, dy: -2 },
  },
  shechem: {
    name: "세겜", x: 180, y: 216, label: { dx: 12, dy: 4, anchor: "start" },
    scene: "언약의 큰 돌",
    description: "상수리나무 아래 큰 돌을 세워 언약의 증거로 삼았어요.",
    // 왼쪽 위는 에발산, 위는 깃발, 오른쪽 아래는 실로라 왼쪽 아래 빈자리에 둔다
    avatarOffset: { dx: -22, dy: 20 },
  },
  east: {
    name: "요단 동쪽", x: 316, y: 236, label: { dx: 0, dy: 20, anchor: "middle" },
    scene: "엣 제단",
    description: "요단 동쪽 지파가 요단 가에 증거의 제단을 쌓았어요.",
  },
} as const satisfies Record<string, Site>;

export type SiteId = keyof typeof SITES;
export const SITE_IDS = Object.keys(SITES) as SiteId[];

export function getSite(id: SiteId): Site {
  return SITES[id];
}

/** 아바타 오프셋 기본값: 지점 왼쪽 위 */
export const DEFAULT_AVATAR_OFFSET = { dx: -18, dy: -18 } as const;

/** 지형 (SVG path d / ellipse) */
export const TERRAIN = {
  // 지중해: 이 경로 안쪽이 바다
  sea: "M-40,-40 L84,-40 C80,90 70,220 56,330 C48,400 38,470 26,560 L-40,560Z",
  // 가나안(요단 서쪽 약속의 땅): 3장 완료 전에는 점선 경계, 완료 후 옅게 채움
  canaan:
    "M80,40 L238,38 C246,70 250,100 245,114 L252,129 C262,170 242,210 254,250 S268,300 262,340 S270,372 268,388 L257,402 C254,430 254,456 258,474 L150,498 L38,498 C48,420 58,330 66,260 C72,180 78,100 80,40Z",
  jordan: "M252,129 C262,170 242,210 254,250 S268,300 262,340 S270,372 268,388",
  // 3장 연출(MapEffects): 물이 쌓이는 자리 아래로 마르는 물길 — jordan 곡선을 y=310 에서 잘라 염해까지(같은 곡선).
  // 건너는 자리 바로 아래는 아바타가 서는 곳이라, 아이콘 위쪽 구간(310~326)에서 마른 모습이 보이게 위에서부터 자른다
  jordanBelowCrossing: "M265.2,310 C264.9,318.3 263.8,327.8 262,340 C256,380 270,372 268,388",
  // 3장 연출: 위쪽에서 물이 쌓이는 자리(3:16) — 마르는 물길이 시작되는 곳 바로 위
  jordanHeap: { x: 265, y: 300 },
  galilee: { cx: 252, cy: 112, rx: 11, ry: 17 },
  deadSea: { cx: 268, cy: 430, rx: 12, ry: 42 },
  labels: {
    // 에발산의 "내 위치" 이름표와 겹치지 않게 조금 위로
    canaan: { x: 112, y: 134, sub: { x: 113, y: 150 } },
    sea: { x: 40, y: 250, rotate: -82 },
    deadSea: { x: 284, y: 440 },
  },
} as const;

/**
 * 여정 탭 지도 영역: 장소·지명·이름표가 있는 가나안 주변만(지중해 쪽 빈 바다를 뺀다).
 * 높이를 제한한 틀에 meet 로 넣어 지도·장 카드가 한 화면에 들어오게 한다(2026-10-26).
 */
export const EXPLORER_CROP = "62 10 300 476";

/** 지점 중심의 확대 영역(viewBox) — 시트·본문 무대·도착 화면의 지도 조각 */
export function cropAround(id: SiteId, width = 180, height = 100): string {
  const s = SITES[id];
  return `${s.x - width / 2} ${s.y - height / 2 + 6} ${width} ${height}`;
}

/**
 * 두 지점(출발 → 도착)이 함께 보이는 확대 영역 — 도착 화면에서 아바타가 화면 밖에서 들어오지 않게.
 * 기본 크기(width×height)에 들어가면 그 크기 그대로 두 지점의 가운데를 비추고,
 * 먼 걸음이면 가로세로 비율을 지킨 채 넓힌다(지도는 slice 로 채우므로 비율이 바뀌면 잘린다).
 * 여백은 아바타·"내 위치" 이름표·지명이 들어갈 만큼.
 */
export function cropAroundLeg(from: SiteId, to: SiteId, width = 300, height = 250): string {
  const a = SITES[from];
  const b = SITES[to];
  // 위쪽은 아바타 위 "내 위치" 이름표와 닫기 버튼 자리까지 넉넉히, 아래쪽은 지명만큼
  const PAD_X = 60;
  const PAD_TOP = 84;
  const PAD_BOTTOM = 52;
  const left = Math.min(a.x, b.x) - PAD_X;
  const right = Math.max(a.x, b.x) + PAD_X;
  const top = Math.min(a.y, b.y) - PAD_TOP;
  const bottom = Math.max(a.y, b.y) + PAD_BOTTOM;
  const scale = Math.max(1, (right - left) / width, (bottom - top) / height);
  const w = width * scale;
  const h = height * scale;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  return `${round(cx - w / 2)} ${round(cy - h / 2)} ${round(w)} ${round(h)}`;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * 장소 사건 연출용 지형(MapEffects, ADR-037) — 지파 땅·도피성은 개념도라 경계·위치는 대략이다.
 * 요단 서쪽 땅은 가로 띠(위·아래 y 범위)를 가나안 모양으로 잘라 그리고, 요단 동쪽은 강을 따라 그린 영역 하나.
 */
export type TerritoryId = "east" | "caleb" | "judah" | "ephraim" | "manasseh" | "north" | "benjamin";

export const TERRITORIES: Record<
  TerritoryId,
  { name: string; label: { x: number; y: number } } & ({ band: [number, number] } | { d: string } | { circle: { cx: number; cy: number; r: number } })
> = {
  // 르우벤·갓·므낫세 반 지파 — 요단 동쪽(강 바로 동쪽부터)
  east: {
    name: "르우벤 · 갓 · 므낫세 반",
    label: { x: 318, y: 186 },
    d: "M262,128 C272,170 252,210 264,250 S278,300 272,340 S280,372 278,392 L350,398 L352,124Z",
  },
  caleb: { name: "갈렙", label: { x: 186, y: 424 }, circle: { cx: 152, cy: 452, r: 34 } },
  judah: { name: "유다", label: { x: 96, y: 404 }, band: [382, 500] },
  ephraim: { name: "에브라임", label: { x: 104, y: 270 }, band: [236, 292] },
  manasseh: { name: "므낫세", label: { x: 112, y: 182 }, band: [168, 236] },
  // 19장의 일곱 지파 중 지도에 크게 보이는 두 덩어리: 북쪽(스불론·잇사갈·아셀·납달리)과 베냐민
  north: { name: "북쪽 지파", label: { x: 136, y: 104 }, band: [38, 168] },
  benjamin: { name: "베냐민", label: { x: 162, y: 348 }, band: [292, 382] },
};

/** 20장 도피성 여섯 곳(요단 서쪽 셋·동쪽 셋). 세겜·헤브론은 지도 장소와 같은 자리 */
export const REFUGE_CITIES: { name: string; x: number; y: number; site?: SiteId }[] = [
  { name: "게데스", x: 200, y: 94 },
  { name: "세겜", x: 180, y: 216, site: "shechem" },
  { name: "헤브론", x: 152, y: 452, site: "hebron" },
  { name: "골란", x: 300, y: 140 },
  { name: "라못", x: 322, y: 272 },
  { name: "베셀", x: 306, y: 372 },
];

/** 10장 아얄론 골짜기(달이 머문 곳) */
export const EFFECT_SPOTS = {
  aijalon: { x: 82, y: 372 },
} as const;
