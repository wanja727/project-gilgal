import type { IsoDate } from "@/lib/time";
import { buildReadingDates, JOSHUA_2026 } from "./campaign";
import type { LocationId } from "./locations";

/**
 * 여호수아 24일 여정 데이터 — 장 제목·ACT·장소·지도 표현·완료 메시지의 단일 원천.
 * 컴포넌트에 24일 데이터를 흩어 두지 않는다(요구사항 7·18절).
 *
 * 문구 원칙: 제목·장소 수준의 안내만 쓰고, 본문 해석이나 신학적 해설은 쓰지 않는다(핵심 4).
 * ⚠️ 완료 메시지 등 문구는 초안이다. 운영자 검토 후 이 파일에서 수정한다.
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
  emoji?: string;
  headline: string;
  /** 없으면 BRAND.completionBody 사용 */
  body?: string;
};

export type JourneyDay = {
  day: number;
  chapter: number;
  readingDate: IsoDate;
  act: ActNo;
  title: string;
  /** 예: "약속의 땅을 향한 여덟 번째 걸음" */
  ordinalLine: string;
  /** 이 장을 마쳤을 때 공동체가 머무는 지점. 없으면 직전 지점에 머문다 */
  locationId?: LocationId;
  mapMode: MapMode;
  mapEffect?: MapEffect;
  completion: CompletionMessage;
};

export const ACTS: Record<ActNo, { title: string; chapters: [number, number]; phrase: string }> = {
  1: { title: "약속의 땅으로 들어가다", chapters: [1, 5], phrase: "약속의 땅으로 들어가는" },
  2: { title: "땅을 향해 나아가다", chapters: [6, 12], phrase: "약속의 땅을 향한" },
  3: { title: "약속의 땅을 나누다", chapters: [13, 22], phrase: "약속의 땅을 나누는" },
  4: { title: "기억하고 선택하다", chapters: [23, 24], phrase: "기억하고 선택하는" },
};

const ORDINALS = [
  "첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열",
  "열한", "열두", "열세", "열네", "열다섯", "열여섯", "열일곱", "열여덟", "열아홉", "스무",
  "스물한", "스물두", "스물세", "스물네",
];

type DayContent = Omit<JourneyDay, "day" | "chapter" | "readingDate" | "act" | "ordinalLine">;

const CONTENT: DayContent[] = [
  // ─── ACT 1 — 약속의 땅으로 들어가다 (1~5장) ───
  { title: "여호수아의 부르심", locationId: "shittim", mapMode: "journey", mapEffect: "depart",
    completion: { emoji: "🧭", headline: "여정을 시작했습니다." } },
  { title: "정탐꾼과 라합", locationId: "shittim", mapMode: "journey",
    completion: { emoji: "🔭", headline: "여리고를 살피고 돌아왔습니다." } },
  { title: "요단강을 건넘", locationId: "jordan", mapMode: "journey", mapEffect: "cross-jordan",
    completion: { emoji: "🌊", headline: "요단을 건넜습니다." } },
  { title: "열두 돌을 세움", locationId: "gilgal", mapMode: "journey",
    completion: { emoji: "🪨", headline: "길갈에 열두 돌을 세웠습니다." } },
  { title: "길갈에서 맞은 유월절", locationId: "gilgal", mapMode: "journey",
    completion: { emoji: "⛺", headline: "길갈에 머물렀습니다." } },

  // ─── ACT 2 — 땅을 향해 나아가다 (6~12장) ───
  { title: "여리고", locationId: "jericho", mapMode: "journey",
    completion: { emoji: "🏰", headline: "여리고에 도착했습니다." } },
  { title: "아이성 패배와 아간", locationId: "ai", mapMode: "journey",
    completion: { emoji: "🌫️", headline: "아이 앞에서 잠시 멈추었습니다." } },
  { title: "아이성 승리와 에발산", locationId: "ebal", mapMode: "journey",
    completion: { emoji: "⛰️", headline: "에발산에 이르렀습니다." } },
  { title: "기브온", locationId: "gibeon", mapMode: "journey",
    completion: { emoji: "🏘️", headline: "기브온에 이르렀습니다." } },
  { title: "남부 전투", locationId: "hebron", mapMode: "journey",
    completion: { emoji: "🧭", headline: "남쪽 땅으로 나아갔습니다." } },
  { title: "북부 전투와 하솔", locationId: "hazor", mapMode: "journey",
    completion: { emoji: "🏔️", headline: "북쪽 하솔까지 이르렀습니다." } },
  { title: "정복한 왕들", mapMode: "review", mapEffect: "overview",
    completion: { emoji: "📜", headline: "지나온 길을 돌아보았습니다." } },

  // ─── ACT 3 — 약속의 땅을 나누다 (13~22장) ───
  { title: "요단 동쪽의 기업", mapMode: "territory", mapEffect: "fill-territory",
    completion: { emoji: "🗺️", headline: "요단 동쪽 땅이 나뉘었습니다." } },
  { title: "갈렙과 헤브론", locationId: "hebron", mapMode: "territory", mapEffect: "fill-territory",
    completion: { emoji: "🏔️", headline: "갈렙이 헤브론을 받았습니다." } },
  { title: "유다 지파의 기업", mapMode: "territory", mapEffect: "fill-territory",
    completion: { emoji: "🗺️", headline: "유다의 땅이 채워졌습니다." } },
  { title: "에브라임 지파의 기업", mapMode: "territory", mapEffect: "fill-territory",
    completion: { emoji: "🗺️", headline: "에브라임의 땅이 채워졌습니다." } },
  { title: "므낫세 지파의 기업", mapMode: "territory", mapEffect: "fill-territory",
    completion: { emoji: "🗺️", headline: "므낫세의 땅이 채워졌습니다." } },
  { title: "실로와 남은 일곱 지파", locationId: "shiloh", mapMode: "territory", mapEffect: "move-base",
    completion: { emoji: "⛺", headline: "실로에 도착했습니다." } },
  { title: "나머지 지파의 기업", locationId: "shiloh", mapMode: "territory", mapEffect: "fill-territory",
    completion: { emoji: "🗺️", headline: "모든 지파의 땅이 채워졌습니다." } },
  { title: "도피성", locationId: "shiloh", mapMode: "territory", mapEffect: "refuge-cities",
    completion: { emoji: "🕊️", headline: "도피성이 정해졌습니다." } },
  { title: "레위인의 성읍", locationId: "shiloh", mapMode: "territory",
    completion: { emoji: "🏘️", headline: "레위인의 성읍이 정해졌습니다." } },
  { title: "요단 동쪽 지파의 귀환", locationId: "shiloh", mapMode: "territory", mapEffect: "return-east",
    completion: { emoji: "↩️", headline: "요단 동쪽 지파가 집으로 돌아갔습니다." } },

  // ─── ACT 4 — 기억하고 선택하다 (23~24장) ───
  { title: "여호수아의 마지막 권면", mapMode: "review", mapEffect: "overview",
    completion: { emoji: "🕯️", headline: "지나온 모든 길을 바라보았습니다." } },
  { title: "세겜에서의 언약 갱신", locationId: "shechem", mapMode: "review", mapEffect: "arrive-final",
    completion: { emoji: "🌅", headline: "여정을 완주했습니다.", body: "24일 동안 함께 걸어 주셔서 고맙습니다." } },
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
    ordinalLine: `${ACTS[act].phrase} ${ORDINALS[i]} 번째 걸음`,
  };
});
