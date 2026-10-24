import { JourneyExplorer } from "@/components/journey/JourneyExplorer";
import { getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { journeyProgress } from "@/lib/journey/guide";
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
  // 처음 열리는 장소: 깃발 → 내 위치 → 출발점
  const initialSite = view.flag ?? view.me ?? JOURNEY_DAYS[0].site;

  return (
    <JourneyExplorer
      view={view}
      statuses={statuses}
      position={p.position}
      flagDay={p.flag?.day ?? null}
      avatarSeed={member.avatarSeed}
      initialSite={initialSite}
    />
  );
}
