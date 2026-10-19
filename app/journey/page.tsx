import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AvatarShuffler } from "@/components/AvatarShuffler";
import { JourneyMap, MAP_CAPTION } from "@/components/JourneyMap";
import { ProgressDots } from "@/components/ProgressDots";
import { signOut } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { mapState } from "@/lib/journey/mapState";
import { todaysDay, unwalkedDays } from "@/lib/journey/schedule";
import { todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 나의 여정: 전체 지도 + 나의 24일 + 아직 걷지 않은 길 */
export default async function JourneyPage() {
  const member = await requireMember();
  const today = todayKst();
  const completed = await getCompletedDays(member.userId);
  const unwalked = unwalkedDays(completed, today);
  const map = mapState(completed, todaysDay(today)?.day ?? null);

  return (
    <>
      <AppHeader avatarSeed={member.avatarSeed} name={member.realName} />
      <main className="space-y-6 px-5 pb-16">
        <div className="flex items-end justify-between pt-2">
          <h1 className="font-serif text-2xl font-semibold text-ink">나의 여정</h1>
          <p className="text-sm text-ink-soft">
            <b className="text-olive-deep">{completed.length}</b> / {JOSHUA_2026.totalDays}
          </p>
        </div>

        <figure className="overflow-hidden rounded-3xl border border-line bg-card">
          <JourneyMap state={map} avatarSeed={member.avatarSeed} />
          <figcaption className="px-4 py-2.5 text-center text-[11px] text-stone">{MAP_CAPTION}</figcaption>
        </figure>

        <section>
          <h2 className="mb-3 text-[13px] font-semibold text-ink-soft">나의 24일</h2>
          <ProgressDots completed={completed} today={today} />
          <p className="mt-3 flex gap-4 text-[11px] text-stone">
            <span>● 걸은 길</span>
            <span>◌ {BRAND.unwalkedPath}</span>
            <span className="opacity-60">○ 아직 열리지 않은 길</span>
          </p>
        </section>

        {unwalked.length > 0 && (
          <section>
            <h2 className="mb-2 text-[13px] font-semibold text-ink-soft">
              {BRAND.unwalkedPath} {unwalked.length}
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {unwalked.map((d) => (
                <li key={d.day}>
                  <Link href={`/day/${d.day}`} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>
                      <span className="mr-2 text-xs text-stone">DAY {d.day}</span>
                      {d.title}
                    </span>
                    <span className="text-stone">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-[13px] font-semibold text-ink-soft">나의 아바타</h2>
          <AvatarShuffler seed={member.avatarSeed} />
        </section>

        <section className="pt-6 text-center text-xs text-stone">
          <p>
            {member.realName} · {member.cellName}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-2"
          >
            <button type="submit" className="underline underline-offset-2">
              로그아웃
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
