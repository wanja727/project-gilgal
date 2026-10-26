import { formatDate, givenName, josa } from "@/lib/format";
import { addDays, type IsoDate } from "@/lib/time";
import { JOSHUA_2026 } from "./campaign";
import { type JourneyDay } from "./days";
import { contiguousPosition, flagDay, nextToRead } from "./mapState";
import { campaignPhase, type CampaignPhase, daysUntilStart, nextLockedDay, unwalkedDays } from "./schedule";

/**
 * 홈 안내 문구 (순수 함수). 화면 상태별 문구를 한곳에서 정해 테스트한다.
 * 상태: 기간 전 / 정식 기간 평일 / 주일 / 보충 기간 / 종료 후, 그리고 완주 여부.
 */

export type JourneyProgress = {
  phase: CampaignPhase;
  today: IsoDate;
  done: ReadonlySet<number>;
  /** 1장부터 이어서 읽은 마지막 장 */
  position: number;
  flag: JourneyDay | null;
  /** 공개됐지만 안 읽은 장 (= 깃발까지 남은 장) */
  unread: JourneyDay[];
  next: JourneyDay | null;
  finished: boolean;
};

export function journeyProgress(completed: Iterable<number>, today: IsoDate): JourneyProgress {
  const done = new Set(completed);
  return {
    phase: campaignPhase(today),
    today,
    done,
    position: contiguousPosition(done),
    flag: flagDay(today),
    unread: unwalkedDays(done, today),
    next: nextToRead(done, today),
    finished: done.size >= JOSHUA_2026.totalDays,
  };
}

/** 깃발 이름표: 정식 기간 평일은 "오늘 N장", 주일엔 "N장까지 열림" (홈 진행도·지도 공통) */
export function flagCaption(p: JourneyProgress): string | null {
  if (!p.flag) return null;
  return p.phase === "reading" ? `오늘 ${p.flag.day}장` : `${p.flag.day}장까지 열림`;
}

export type Greeting = { kicker: string; headline: string };

export function greeting(p: JourneyProgress, realName: string): Greeting {
  const name = `${givenName(realName)} 님`;
  const date = formatDate(p.today, true);
  switch (p.phase) {
    case "before":
      return { kicker: `${date}, 출발까지 D-${daysUntilStart(p.today)}`, headline: `${name},\n곧 여정이 시작돼요` };
    case "reading":
      return {
        kicker: `${date}, 여정 ${p.flag!.day}일째`,
        headline: `${name}, 오늘은\n${p.flag!.place}까지 가요`,
      };
    case "rest":
      return { kicker: date.replace("일요일", "주일"), headline: `${name}, 오늘은\n쉼의 날이에요` };
    default:
      if (p.finished) return { kicker: date, headline: `${name},\n24장을 모두 걸었어요` };
      return {
        kicker: p.phase === "catchup" ? `${date}, 여정을 마무리하는 주간` : date,
        headline: `${name},\n아직 걷지 않은 길이 ${p.unread.length}개 있어요`,
      };
  }
}

export type GoalAction =
  | { label: string; href: string; variant: "main" | "line" }
  | { label: string; href?: undefined; variant: "quiet" };

export type Goal = { title: string; body: string; action: GoalAction };

/** 장 번호 목록을 짧게: [4,5,6] → "4, 5, 6장", 길면 "4장부터 9장까지 6개 장" */
function chapterList(days: JourneyDay[]): string {
  if (days.length <= 4) return `${days.map((d) => d.day).join(", ")}장`;
  return `${days[0].day}장부터 ${days.at(-1)!.day}장까지 ${days.length}개 장`;
}

/** 다음 장이 열리는 날 문구: 내일이면 "내일", 아니면 "11월 9일 월요일" */
function openDay(day: JourneyDay, today: IsoDate): string {
  return day.readingDate === addDays(today, 1) ? "내일" : formatDate(day.readingDate, true);
}

/** 진행도 카드 아래의 목표 상자와 버튼 */
export function goal(p: JourneyProgress): Goal {
  if (p.finished) {
    return {
      title: "24장을 모두 걸었어요",
      body: "세겜까지 이어진 여정을 되돌아봐요",
      action: { label: "나의 24일 돌아보기", href: "/finale", variant: "main" },
    };
  }
  if (p.phase === "before") {
    const first = nextLockedDay(p.today)!;
    return {
      title: `출발까지 D-${daysUntilStart(p.today)}`,
      body: `${formatDate(first.readingDate, true)}, ${first.place}에서 출발해요`,
      action: { label: `${formatDate(first.readingDate)}에 1장이 열려요`, variant: "quiet" },
    };
  }
  if (p.unread.length > 0) {
    const read = { label: `${p.next!.day}장 이어 읽기`, href: `/day/${p.next!.day}`, variant: "main" as const };
    if (p.flag) {
      return {
        title: `깃발까지 ${p.unread.length}장 남았어요`,
        body: `${chapterList(p.unread)}을 읽으면 ${p.flag.place}에 도착해요`,
        action: read,
      };
    }
    return {
      title: `아직 걷지 않은 길 ${p.unread.length}개`,
      body: "지난 장은 언제든 읽을 수 있어요. 천천히, 끝까지 함께 걸어요",
      action: read,
    };
  }
  // 공개된 장을 모두 읽었다
  const upcoming = nextLockedDay(p.today);
  if (upcoming) {
    const when = openDay(upcoming, p.today);
    return {
      title: p.phase === "rest" ? "열린 장을 모두 걸었어요" : "오늘 깃발에 도착했어요",
      body: `${when === "내일" ? "내일은" : `${when}에는`} ${upcoming.day}장, ${josa(upcoming.place, "으로/로")} 가요`,
      action: { label: `${when === "내일" ? "내일" : `${when}에`} ${upcoming.day}장이 열려요`, variant: "quiet" },
    };
  }
  return {
    title: "24장을 모두 걸었어요",
    body: "세겜까지 이어진 여정을 되돌아봐요",
    action: { label: "나의 24일 돌아보기", href: "/finale", variant: "main" },
  };
}
