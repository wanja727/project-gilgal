import { ACTS, type ActNo } from "./days";

/**
 * 개관 탭 내용 — 교회(청년캠프1)에서 준 여호수아 개관 글을 그대로 옮긴다(2026-10-26).
 * 문구를 고칠 때는 이 파일만 바꾼다. 서비스가 해설을 덧붙이지 않는다(핵심 4).
 */

export const OVERVIEW_INTRO = {
  theme: "성결",
  lead: "<여호수아>는 청년캠프1의 주제 표어인 ‘성결’을 말씀 속에서 엿볼 수 있는 책입니다.",
} as const;

/** 배경 글의 흐름을 세 걸음으로 보여 주는 도식 (본문 문단에서 그대로 뽑은 말) */
export const BACKGROUND_STEPS = [
  { label: "나그네", body: "땅이 없어 나그네처럼 살던 이스라엘" },
  { label: "훈련", body: "모든 정복 과정을 통한 하나님의 훈련" },
  { label: "하나님의 백성", body: "땅 위에서 거룩을 지키는 참된 백성" },
] as const;

export const BACKGROUND_PARAGRAPHS = [
  "이스라엘은 이제 가나안 땅에 입성합니다. 이전까지는 땅이 없어서 나그네처럼 살았던 그들에게 땅이 생긴 것입니다.",
  "그런데 중요한 사실은 그들이 땅을 소유한 삶을 처음 살아보았기 때문에 땅 위에서의 거룩을 지키는 방법을 알지 못했다는 것입니다.",
  "그래서 하나님께서는 먼저 그들을 훈련시키셨습니다. 모든 정복 과정을 통해 참된 하나님의 백성으로 변화시키셨습니다.",
  "우리는 이 책을 통해 내가 진정 거룩한 삶을 살기 위해 무엇이 필요하고 무엇이 부족한지 알 수 있습니다.",
  "정착된 땅에서 하나님 나라의 백성으로 진입하는 이 변화는 오늘날 우리에게도 큰 도전을 줍니다.",
] as const;

export const BACKGROUND_QUESTION = "이 땅에서 나는 어떻게 거룩을 유지하며 살 것인가?";
export const BACKGROUND_BLESSING = "이 질문에 대한 답이 얻어지는 성경 통독이 되기를 축복합니다.";

export type OverviewSection = {
  no: ActNo;
  /** 한 단어 요약 (막대·제목 옆 표시) */
  keyword: string;
  title: string;
  /** 원문에 적힌 구절 범위 */
  range: string;
  /**
   * 24칸 막대에서 이 부분이 차지하는 장 = 여정의 ACT 구간(days.ts ACTS).
   * 원문 범위는 5장·13장에서 겹치므로 막대에서는 겹치지 않게 나눈다(5장 → 1부, 13장 → 3부).
   */
  chapters: [number, number];
  points: string[];
};

export const OVERVIEW_SECTIONS: OverviewSection[] = [
  {
    no: 1,
    keyword: "입성",
    title: "약속의 땅으로 들어가는 이스라엘",
    range: "1:1–5:12",
    chapters: ACTS[1].chapters,
    points: ["여호수아를 세우시는 여호와", "여리고 정탐 명령을 내리는 여호수아", "요단강을 건너는 이스라엘"],
  },
  {
    no: 2,
    keyword: "정복",
    title: "약속의 땅을 정복하는 이스라엘",
    range: "5:13–13:7",
    chapters: ACTS[2].chapters,
    points: [
      "여리고를 정복한 이스라엘",
      "아간을 처단한 이스라엘",
      "아이성을 정복한 이스라엘",
      "기브온과 언약을 맺는 이스라엘",
      "이스라엘을 위하여 싸우신 여호와",
    ],
  },
  {
    no: 3,
    keyword: "분배",
    title: "약속의 땅을 분배하는 이스라엘",
    range: "13:1–21:45",
    chapters: ACTS[3].chapters,
    points: ["땅 분배 명령", "요단 동편 땅 분배", "요단 서편 땅 분배", "나머지 땅 분배", "도피성", "레위 사람들의 성읍"],
  },
  {
    no: 4,
    keyword: "언약",
    title: "언약을 새롭게 하는 이스라엘",
    range: "22:1–24:33",
    chapters: ACTS[4].chapters,
    points: [
      "요단 강 양편 지파들의 불화와 화해",
      "여호와만 사랑하라고 강권하는 여호수아",
      "세겜에서의 언약을 갱신하는 이스라엘",
      "여호수아의 죽음",
    ],
  },
];

export const KEY_VERSE = {
  text: "이 율법책을 네 입에서 떠나지 말게 하며 주야로 그것을 묵상하여 그 안에 기록된 대로 다 지켜 행하라 그리하면 네 길이 평탄하게 될 것이며 네가 형통하리라",
  ref: "수 1:8",
} as const;

/** 장 번호가 속한 개관 부분 (막대 기준) */
export function sectionOfChapter(chapter: number): OverviewSection | null {
  return OVERVIEW_SECTIONS.find((s) => chapter >= s.chapters[0] && chapter <= s.chapters[1]) ?? null;
}
