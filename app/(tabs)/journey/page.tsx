import { JourneyExplorer } from "@/components/journey/JourneyExplorer";
import { getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { flagCaption, journeyProgress } from "@/lib/journey/guide";
import { chapterStatus, mapView } from "@/lib/journey/mapState";
import { todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 여정 탭: 지금까지 걸어온 길 전체 지도 + 장소별로 모은 장 / 24장 목록 */
export default async function JourneyPage() {
  const member = await requireMember();
  const today = todayKst();
  const completed = await getCompletedDays(member.userId);
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
      flagLabel={flagCaption(p)}
      avatarSeed={member.avatarSeed}
      initialChapter={initialChapter}
    />
  );
}
