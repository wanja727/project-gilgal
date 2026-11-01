import Link from "next/link";
import { JourneyMap } from "@/components/map/JourneyMap";
import { ButtonLink, Card, CardHead, ChevronLeft } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { getCompletionTimes } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { ACTS, JOURNEY_DAYS, type ActNo } from "@/lib/journey/days";
import { journeyProgress } from "@/lib/journey/guide";
import { mapView } from "@/lib/journey/mapState";
import { todayKst, toServiceDate } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 24장 완주 회고 (요구사항 5절 ACT 4). 완주 전이면 남은 길을 안내한다 */
export default async function FinalePage() {
  const member = await requireMember();
  const today = todayKst();
  const times = await getCompletionTimes(member.userId);
  const completed = [...times.keys()];
  const p = journeyProgress(completed, today);
  const view = mapView({ completed, position: p.position, flag: null });

  return (
    <div className="pb-12">
      <div className="flex items-center px-3 pt-[max(env(safe-area-inset-top),6px)] text-main">
        <Link href="/" aria-label="오늘로 돌아가기" className="grid size-11 place-items-center rounded-full">
          <ChevronLeft />
        </Link>
      </div>

      <div className="mx-gutter overflow-hidden rounded-[28px] bg-surface">
        <JourneyMap view={view} avatarKey={member.avatarKey} ariaLabel="지금까지 걸어온 여정 전체 지도" className="!h-auto" />
      </div>
      <p className="pt-2 text-center text-[11px] text-mid">{BRAND.mapCaption}</p>

      {p.finished ? (
        <div className="px-[26px] pt-6">
          <p className="rise-in text-sub font-semibold text-mute">24일의 여정</p>
          <h1 className="rise-in mt-1.5 font-serif text-[30px] leading-tight font-bold tracking-[-0.04em] text-main" style={{ animationDelay: ".1s" }}>
            24일간의 여정이 끝났어요
          </h1>
          <p className="rise-in mt-4 font-serif text-[17px] leading-[2] text-text" style={{ animationDelay: ".25s" }}>
            요단 동쪽에서 시작한 우리의 여정은
            <br />
            요단을 건너
            <br />
            여리고를 지나
            <br />
            약속의 땅을 걷고
            <br />
            마침내 세겜에 도착했어요.
          </p>
          <p className="mt-4 text-body text-mute">24일 동안 함께 걸어 주셔서 고맙습니다.</p>
        </div>
      ) : (
        <div className="px-[26px] pt-6">
          <h1 className="font-serif text-h1 font-bold tracking-[-0.04em] text-main">아직 걷고 있는 여정</h1>
          <p className="mt-2 text-body leading-[1.65] text-mute">
            {completed.length}장을 걸었어요. {BRAND.unwalkedPath} {p.unread.length}개를 마치면 24일의 회고가 열려요.
          </p>
          {p.next && (
            <div className="mt-4">
              <ButtonLink href={`/day/${p.next.day}`}>{p.next.day}장 이어 읽기</ButtonLink>
            </div>
          )}
        </div>
      )}

      <Card className="mt-6" aria-labelledby="finale-days">
        <CardHead id="finale-days" title="나의 24일" sub={`${completed.length} / ${JOSHUA_2026.totalDays}`} />
        {(Object.keys(ACTS) as unknown as ActNo[]).map((act) => (
          <div key={act} className="mt-4">
            <h2 className="text-caption font-bold text-mute">{ACTS[act].title}</h2>
            <ol className="mt-1">
              {JOURNEY_DAYS.filter((d) => d.act === Number(act)).map((d) => {
                const at = times.get(d.day);
                return (
                  <li key={d.day} className="grid grid-cols-[36px_1fr_auto] items-center border-t border-soft py-2.5 first:border-t-0">
                    <span className={`text-small font-bold ${at ? "text-main" : "text-mid"}`}>{d.day}</span>
                    <span className="text-[14px] text-main">
                      {d.title}
                      <span className="ml-1.5 text-caption text-mute">{d.place}</span>
                    </span>
                    {/* 새벽 4시 전에 읽었으면 전날 걸은 것으로(ADR-033) */}
                    <span className="text-caption text-mute">{formatDate(at ? toServiceDate(at) : d.readingDate)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </Card>
    </div>
  );
}
