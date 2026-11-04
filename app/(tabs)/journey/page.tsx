import { JourneyExplorer } from "@/components/journey/JourneyExplorer";
import { requireMemberWithProgress } from "@/lib/data/viewer";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { journeyProgress } from "@/lib/journey/guide";
import { chapterStatus, mapView, revealedSites } from "@/lib/journey/mapState";
import { todaysDay } from "@/lib/journey/schedule";
import { todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 여정 탭: 지금까지 걸어온 길 전체 지도 + 장소별로 모은 장 / 24장 목록 */
export default async function JourneyPage() {
  const { member, completed } = await requireMemberWithProgress();
  const today = todayKst();
  const p = journeyProgress(completed, today);
  const view = mapView({ completed, position: p.position, flag: p.flag?.day ?? null });
  const statuses = JOURNEY_DAYS.map((d) => chapterStatus(d, p.done, today));
  // 처음 보여 줄 장: 내가 이어 읽은 마지막 장(출발 전이면 1장)
  const initialChapter = Math.max(1, p.position);

  return (
    <JourneyExplorer
      view={view}
      statuses={statuses}
      position={p.position}
      flagDay={p.flag?.day ?? null}
      avatarKey={member.avatarKey}
      initialChapter={initialChapter}
      revealed={revealedSites(today)}
      today={today}
      revealDay={todaysDay(today)?.day ?? null}
    />
  );
}
