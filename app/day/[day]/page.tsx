import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ChapterReader } from "@/components/ChapterReader";
import { getJoshuaChapter } from "@/lib/bible";
import { getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { ACTS } from "@/lib/journey/days";
import { LOCATIONS } from "@/lib/journey/locations";
import { checkDayAccess, getDay, isDayUnlocked } from "@/lib/journey/schedule";
import { todayKst } from "@/lib/time";
import { CompleteButton } from "./CompleteButton";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일`;
}

export default async function DayPage({ params }: PageProps<"/day/[day]">) {
  const member = await requireMember();
  const { day: dayParam } = await params;
  const today = todayKst();

  // 공개 여부는 서버에서 판단한다. 미래 DAY 는 URL 을 직접 입력해도 본문을 내보내지 않는다.
  const access = checkDayAccess(dayParam, today);
  if (!access.ok && access.reason === "invalid_day") notFound();
  const header = <AppHeader avatarSeed={member.avatarSeed} name={member.realName} />;

  if (!access.ok) {
    const day = getDay(Number(dayParam))!;
    return (
      <>
        {header}
        <main className="px-6 pt-16 pb-12 text-center">
          <p className="text-xs tracking-[0.25em] text-stone">DAY {day.day}</p>
          <h1 className="mt-3 font-serif text-2xl font-semibold text-ink">아직 열리지 않은 길</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            이 길은 {formatDate(day.readingDate)}에 열려요.
            <br />
            그날 공동체와 함께 걸어요.
          </p>
          <Link href="/" className="mt-8 inline-block text-sm text-olive underline underline-offset-4">
            오늘의 여정으로
          </Link>
        </main>
      </>
    );
  }

  const day = access.day;
  const [chapter, completed] = await Promise.all([getJoshuaChapter(day.chapter), getCompletedDays(member.userId)]);
  const prev = getDay(day.day - 1);
  const next = getDay(day.day + 1);
  const nextUnlocked = next && isDayUnlocked(next, today);

  return (
    <>
      {header}
      <main className="px-5 pb-16">
        <section className="mt-4 mb-8 rounded-3xl bg-card px-5 py-6 shadow-[0_1px_0_var(--color-line)]">
          <p className="text-[11px] tracking-[0.2em] text-stone">
            DAY {day.day} · ACT {day.act} {ACTS[day.act].title}
          </p>
          <h1 className="mt-2 font-serif text-[26px] leading-tight font-semibold text-ink">{day.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {JOSHUA_2026.book.name} {day.chapter}장
            {day.locationId && <> · {LOCATIONS[day.locationId].name}</>}
          </p>
          <p className="mt-3 text-[13px] text-olive">{day.ordinalLine}</p>
        </section>

        {chapter ? (
          <ChapterReader text={chapter} />
        ) : (
          <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-sm leading-6 text-ink-soft">
            본문을 준비하고 있어요.
            <br />
            {JOSHUA_2026.book.name} {day.chapter}장을 성경에서 읽고 완료를 눌러 주세요.
          </div>
        )}

        <div className="mt-8">
          <CompleteButton
            day={day}
            initiallyDone={completed.includes(day.day)}
            completedDays={completed}
            avatarSeed={member.avatarSeed}
          />
        </div>

        <nav className="mt-10 flex justify-between text-[13px] text-ink-soft">
          {prev ? (
            <Link href={`/day/${prev.day}`} className="hover:text-ink">
              ← DAY {prev.day}
            </Link>
          ) : (
            <span />
          )}
          {next && nextUnlocked ? (
            <Link href={`/day/${next.day}`} className="hover:text-ink">
              DAY {next.day} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>
    </>
  );
}
