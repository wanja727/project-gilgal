import type { IsoDate } from "@/lib/time";
import { buildReadingDates, JOSHUA_2026 } from "./campaign";
import type { SiteId } from "./locations";

/**
 * 여호수아 24일 여정 데이터 — 장 제목·ACT·장소·지도 표현·도착 문구의 단일 원천.
 * 장소 좌표·장면 설명은 locations.ts, 장소 아이콘은 components/map/SiteGlyph.tsx.
 * 컴포넌트에 24일 데이터를 흩어 두지 않는다(요구사항 7·18절).
 *
 * 문구 원칙: 제목·장소 수준의 안내만 쓰고, 본문 해석이나 신학적 해설은 쓰지 않는다(핵심 4).
 * ⚠️ 제목·도착 문구는 초안이다. 교회 검토 후 이 파일에서 수정한다.
 */

export type ActNo = 1 | 2 | 3 | 4;

/** journey: 이동 / territory: 땅이 채워짐 / review: 지나온 길 돌아보기 */
export type MapMode = "journey" | "territory" | "review";

/** 장별 지도 연출 (Phase 2에서 표현) */
export type MapEffect =
  | "depart"
  | "cross-jordan"
  | "overview"
  | "fill-territory"
  | "move-base"
  | "refuge-cities"
  | "return-east"
  | "arrive-final";

export type CompletionMessage = {
  /** 도착 화면 제목 */
  headline: string;
  /** 도착 화면 설명. 없으면 장별 한 줄(summary)을 쓴다 */
  body?: string;
};

export type JourneyDay = {
  day: number;
  chapter: number;
  readingDate: IsoDate;
  act: ActNo;
  title: string;
  /** 진행도·시트에 보이는 짧은 장소 이름. 지도 지점과 다를 수 있다(예: 2장 "여리고" 정탐, 지점은 싯딤) */
  place: string;
  /** 이 장을 마쳤을 때 지도에서 머무는 지점 */
  site: SiteId;
  /** 이 장에서 있었던 일 한 줄 (여정 탭 장 카드·도착 화면). 사건만 짧게, 해석은 쓰지 않는다 */
  summary: string;
  /** 예: "약속의 땅을 정복하는 여덟 번째 걸음" */
  ordinalLine: string;
  mapMode: MapMode;
  mapEffect?: MapEffect;
  completion: CompletionMessage;
};

/**
 * ACT 구분·이름은 목사님이 쓰신 여호수아 개관(overview.ts)의 네 부분을 따른다(2026-10-26).
 * 개관은 절 단위(5:12·13:7)로 나누지만 여정은 하루 한 장이라 장 단위로 맞춘다.
 */
export const ACTS: Record<ActNo, { title: string; short: string; chapters: [number, number]; phrase: string }> = {
  1: { title: "약속의 땅으로 들어가다", short: "들어가다", chapters: [1, 5], phrase: "약속의 땅으로 들어가는" },
  2: { title: "약속의 땅을 정복하다", short: "정복하다", chapters: [6, 12], phrase: "약속의 땅을 정복하는" },
  3: { title: "약속의 땅을 분배하다", short: "분배하다", chapters: [13, 21], phrase: "약속의 땅을 분배하는" },
  4: { title: "언약을 새롭게 하다", short: "언약을 새롭게 하다", chapters: [22, 24], phrase: "언약을 새롭게 하는" },
};

const ORDINALS = [
  "첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열",
  "열한", "열두", "열세", "열네", "열다섯", "열여섯", "열일곱", "열여덟", "열아홉", "스무",
  "스물한", "스물두", "스물세", "스물네",
];

type DayContent = Omit<JourneyDay, "day" | "chapter" | "readingDate" | "act" | "ordinalLine" | "summary">;

/*
 * 장별 한 줄 — 그 장에서 있었던 일(2026-10-26 초안, 교회 검토 후 수정).
 * 장소 설명(locations.ts)은 장소마다 하나라 같은 장소의 다른 장(예: 9장 길갈의 기브온 조약)과 맞지 않아 따로 둔다.
 * 본문 사건을 가리키는 안내만 쓰고 해석·신학적 해설은 덧붙이지 않는다(핵심 4). 모바일 두 줄 안쪽 길이로.
 */
const SUMMARIES: string[] = [
  "모세가 죽은 뒤, 하나님이 여호수아를 세우시고 강하고 담대하라 하셨어요.",
  "라합이 여리고에 온 두 정탐꾼을 숨겨 주고, 붉은 줄을 약속의 표로 받았어요.",
  "언약궤를 멘 제사장들의 발이 닿자 요단이 멈추고, 백성이 마른 땅으로 건넜어요.",
  "요단 가운데서 가져온 열두 돌을 길갈에 세워 기념으로 삼았어요.",
  "길갈에서 할례를 행하고 유월절을 지켰으며, 그 뒤로 만나가 그쳤어요.",
  "칠 일 동안 성을 돌고 나팔을 불며 외치자 여리고 성벽이 무너졌어요.",
  "아간이 바친 물건을 몰래 취해 아이 성에서 패하고, 그 죄가 드러났어요.",
  "복병을 두어 아이 성을 얻고, 에발산에 제단을 쌓아 율법을 낭독했어요.",
  "먼 곳에서 온 척한 기브온 사람들과, 여호와께 묻지 않고 조약을 맺었어요.",
  "기브온을 친 남쪽 다섯 왕과 싸우던 날, 해와 달이 머물렀어요.",
  "하솔 왕 야빈이 모은 북쪽 연합군을 메롬 물가에서 이기고 하솔을 불살랐어요.",
  "요단 동쪽과 서쪽에서 이스라엘이 이긴 왕들, 모두 서른한 왕의 목록이에요.",
  "아직 얻지 못한 땅이 남은 가운데, 요단 동쪽 땅을 두 지파 반에게 나누었어요.",
  "여든다섯 살 갈렙이 마흔다섯 해 전의 약속대로 헤브론 산지를 받았어요.",
  "유다 지파가 받은 땅의 경계와 성읍들, 그리고 악사가 샘물을 구한 이야기예요.",
  "요셉 자손 가운데 에브라임 지파가 받은 땅의 경계예요.",
  "므낫세 지파가 땅을 받고, 슬로브핫의 딸들도 약속대로 기업을 받았어요.",
  "실로에 회막을 세우고, 남은 일곱 지파의 땅을 그려 와 제비를 뽑았어요.",
  "남은 지파들이 땅을 받고, 마지막으로 여호수아가 딤낫 세라를 받았어요.",
  "실수로 사람을 죽인 이가 피할 수 있는 도피성 여섯 곳을 정했어요.",
  "레위 자손이 마흔여덟 성읍을 받고, 약속하신 말씀이 다 이루어졌다고 기록해요.",
  "요단 동쪽 지파가 쌓은 제단으로 오해가 생겼지만, 증거의 제단임을 밝혀 화해했어요.",
  "나이 많은 여호수아가 지도자들을 모아 여호와만 사랑하고 섬기라고 권면했어요.",
  "세겜에서 여호와만 섬기겠다고 언약을 새롭게 하고, 여호수아가 세상을 떠났어요.",
];

/*
 * 장소·제목은 디자인 시안 v5 의 장별 데이터를 기준으로 한다(2026-10-24).
 * 13~22장(땅 분배)은 지금은 대표 장소(헤브론·실로·세겜·요단 동쪽)에 묶어 둔다.
 * TODO(Phase 2): 지파별 영역을 지도에 채우는 표현(mapEffect "fill-territory").
 */
const CONTENT: DayContent[] = [
  // ─── ACT 1 — 약속의 땅으로 들어가다 (1~5장) ───
  { title: "여호수아를 세우심", place: "싯딤", site: "shittim", mapMode: "journey", mapEffect: "depart",
    completion: { headline: "여정을 시작했어요" } },
  { title: "라합과 정탐꾼", place: "여리고", site: "shittim", mapMode: "journey",
    completion: { headline: "여리고를 살피고 돌아왔어요" } },
  { title: "요단을 건너다", place: "요단강", site: "jordan", mapMode: "journey", mapEffect: "cross-jordan",
    completion: { headline: "요단을 건너 가나안에 들어왔어요", body: "흐르던 강물이 멈추고, 약속의 땅에 첫발을 디뎠어요." } },
  { title: "열두 돌을 세우다", place: "길갈", site: "gilgal", mapMode: "journey",
    completion: { headline: "길갈에 열두 돌을 세웠어요" } },
  { title: "할례와 유월절", place: "길갈", site: "gilgal", mapMode: "journey",
    completion: { headline: "길갈에 머물렀어요" } },

  // ─── ACT 2 — 약속의 땅을 정복하다 (6~12장) ───
  { title: "성벽이 무너지다", place: "여리고", site: "jericho", mapMode: "journey",
    completion: { headline: "여리고에 도착했어요" } },
  { title: "아간의 죄", place: "아이", site: "ai", mapMode: "journey",
    completion: { headline: "아이 앞에서 잠시 멈추었어요" } },
  { title: "아이 성 승리, 율법 낭독", place: "에발산", site: "ebal", mapMode: "journey",
    completion: { headline: "에발산에 이르렀어요" } },
  { title: "기브온과의 조약", place: "길갈", site: "gilgal", mapMode: "journey",
    completion: { headline: "다시 길갈로 돌아왔어요" } },
  { title: "해와 달이 멈추다", place: "기브온", site: "gibeon", mapMode: "journey",
    completion: { headline: "기브온에 이르렀어요" } },
  { title: "북쪽 왕들과의 싸움", place: "하솔", site: "hazor", mapMode: "journey",
    completion: { headline: "북쪽 하솔까지 이르렀어요" } },
  { title: "정복한 서른한 왕", place: "길갈", site: "gilgal", mapMode: "review", mapEffect: "overview",
    completion: { headline: "지나온 길을 돌아보았어요" } },

  // ─── ACT 3 — 약속의 땅을 분배하다 (13~21장) ───
  { title: "동쪽 지파의 기업", place: "요단 동쪽", site: "east", mapMode: "territory", mapEffect: "fill-territory",
    completion: { headline: "요단 동쪽 땅이 나뉘었어요" } },
  { title: "갈렙의 기업", place: "헤브론", site: "hebron", mapMode: "territory", mapEffect: "fill-territory",
    completion: { headline: "갈렙이 헤브론을 받았어요" } },
  { title: "유다 지파의 기업", place: "유다", site: "hebron", mapMode: "territory", mapEffect: "fill-territory",
    completion: { headline: "유다의 땅이 나뉘었어요" } },
  { title: "에브라임의 기업", place: "에브라임", site: "shiloh", mapMode: "territory", mapEffect: "fill-territory",
    completion: { headline: "에브라임의 땅이 나뉘었어요" } },
  { title: "므낫세의 기업", place: "므낫세", site: "shechem", mapMode: "territory", mapEffect: "fill-territory",
    completion: { headline: "므낫세의 땅이 나뉘었어요" } },
  { title: "회막과 남은 땅", place: "실로", site: "shiloh", mapMode: "territory", mapEffect: "move-base",
    completion: { headline: "실로에 도착했어요" } },
  { title: "나머지 지파의 기업", place: "일곱 지파", site: "shiloh", mapMode: "territory", mapEffect: "fill-territory",
    completion: { headline: "모든 지파의 땅이 나뉘었어요" } },
  { title: "도피성을 정하다", place: "도피성", site: "shechem", mapMode: "territory", mapEffect: "refuge-cities",
    completion: { headline: "도피성이 정해졌어요" } },
  { title: "레위인의 성읍", place: "레위 성읍", site: "shiloh", mapMode: "territory",
    completion: { headline: "레위인의 성읍이 정해졌어요" } },

  // ─── ACT 4 — 언약을 새롭게 하다 (22~24장) ───
  // 22장은 지도에서는 아직 땅(territory) 표현을 이어 간다 — 동쪽 지파가 자기 땅으로 돌아가는 장면
  { title: "엣 제단", place: "요단 가", site: "east", mapMode: "territory", mapEffect: "return-east",
    completion: { headline: "요단 동쪽 지파가 집으로 돌아갔어요" } },

  { title: "여호수아의 마지막 권면", place: "이스라엘", site: "shechem", mapMode: "review", mapEffect: "overview",
    completion: { headline: "지나온 모든 길을 바라보았어요" } },
  { title: "세겜 언약", place: "세겜", site: "shechem", mapMode: "review", mapEffect: "arrive-final",
    completion: { headline: "여정을 완주했어요", body: "24일 동안 함께 걸어 주셔서 고맙습니다." } },
];

function actOf(chapter: number): ActNo {
  const entry = (Object.entries(ACTS) as [string, (typeof ACTS)[ActNo]][]).find(
    ([, a]) => chapter >= a.chapters[0] && chapter <= a.chapters[1],
  );
  if (!entry) throw new Error(`ACT 범위 밖의 장: ${chapter}`);
  return Number(entry[0]) as ActNo;
}

const READING_DATES = buildReadingDates(JOSHUA_2026);

export const JOURNEY_DAYS: readonly JourneyDay[] = CONTENT.map((content, i) => {
  const day = i + 1;
  const act = actOf(day);
  return {
    ...content,
    day,
    chapter: day, // 하루 한 장: DAY n = 여호수아 n장
    readingDate: READING_DATES[i],
    act,
    summary: SUMMARIES[i],
    ordinalLine: `${ACTS[act].phrase} ${ORDINALS[i]} 번째 걸음`,
  };
});
