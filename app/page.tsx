import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { JourneyMap } from "@/components/JourneyMap";
import { BRAND } from "@/lib/brand";
import { getCommunityToday, getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { mapState } from "@/lib/journey/mapState";
import {
  campaignPhase,
  daysUntilStart,
  getDay,
  isJourneyComplete,
  todaysDay,
  unwalkedDays,
} from "@/lib/journey/schedule";
import { todayKst } from "@/lib/time";

// 날짜와 사용자에 따라 내용이 바뀌므로 정적 캐시하지 않는다
export const dynamic = "force-dynamic";

/** 홈 = 오늘의 여정 + 미니 지도 + 내 여정 + 오늘 공동체 (기간 상태별 분기, architecture 7절) */
export default async function Home() {
  const member = await requireMember();
  const today = todayKst();
  const phase = campaignPhase(today);
  const todayDay = todaysDay(today);

  const [completed, community] = await Promise.all([
    getCompletedDays(member.userId),
    getCommunityToday(today, todayDay?.day ?? null),
  ]);
  const done = new Set(completed);
  const unwalked = unwalkedDays(completed, today).filter((d) => d.day !== todayDay?.day);
  const finished = isJourneyComplete(completed);
  const map = mapState(completed, todayDay?.day ?? null);

  return (
    <>
      <AppHeader avatarSeed={member.avatarSeed} name={member.realName} />
      <main className="space-y-5 px-5 pb-16">
        <p className="pt-1 text-sm text-ink-soft">
          {member.realName}님, {member.cellName && <span className="text-stone">{member.cellName} · </span>}
          {BRAND.subtitle}
        </p>

        {/* 오늘의 여정 */}
        {phase === "before" && (
          <section className="rounded-3xl bg-card px-6 py-7 text-center shadow-[0_1px_0_var(--color-line)]">
            <p className="text-xs tracking-[0.25em] text-stone">출발까지</p>
            <p className="mt-2 font-serif text-5xl font-semibold text-olive-deep">D-{daysUntilStart(today)}</p>
            <p className="mt-4 text-sm leading-6 text-ink-soft">
              11월 2일 월요일, {JOSHUA_2026.title}가 시작돼요.
              <br />첫 걸음: {getDay(1)!.title}
            </p>
          </section>
        )}

        {todayDay && (
          <section className="rounded-3xl bg-card px-6 py-6 shadow-[0_1px_0_var(--color-line)]">
            <p className="text-[11px] tracking-[0.2em] text-stone">오늘의 여정 · DAY {todayDay.day}</p>
            <h1 className="mt-2 font-serif text-[26px] leading-tight font-semibold text-ink">{todayDay.title}</h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              {JOSHUA_2026.book.name} {todayDay.chapter}장 · {todayDay.ordinalLine}
            </p>
            <Link
              href={`/day/${todayDay.day}`}
              className={`mt-5 block rounded-2xl py-3.5 text-center text-[15px] font-semibold transition active:scale-[0.98] ${
                done.has(todayDay.day) ? "border border-olive/30 bg-olive-soft/50 text-olive-deep" : "bg-olive text-white"
              }`}
            >
              {done.has(todayDay.day) ? "✓ 오늘의 길을 걸었어요" : "오늘의 길 읽기"}
            </Link>
          </section>
        )}

        {phase === "rest" && (
          <section className="rounded-3xl bg-card px-6 py-6 text-center shadow-[0_1px_0_var(--color-line)]">
            <p className="font-serif text-2xl font-semibold text-olive-deep">{BRAND.restDay}</p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              오늘은 새 장이 열리지 않아요.
              <br />
              지나온 길을 돌아보며 쉬어 가요.
            </p>
          </section>
        )}

        {(phase === "catchup" || phase === "after") && (
          <section className="rounded-3xl bg-card px-6 py-6 text-center shadow-[0_1px_0_var(--color-line)]">
            {finished ? (
              <>
                <p className="text-4xl">🌅</p>
                <p className="mt-2 font-serif text-2xl font-semibold text-olive-deep">{BRAND.finished}</p>
                <p className="mt-2 text-sm text-ink-soft">24일의 여정을 모두 함께 걸었어요.</p>
              </>
            ) : (
              <>
                <p className="font-serif text-xl font-semibold text-olive-deep">
                  {phase === "catchup" ? "여정을 마무리하는 시간" : "여정은 계속 열려 있어요"}
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {BRAND.unwalkedPath}이 {unwalked.length}개 남아 있어요.
                  <br />
                  천천히, 끝까지 함께 걸어요.
                </p>
              </>
            )}
          </section>
        )}

        {/* 미니 지도 */}
        <Link href="/journey" className="block overflow-hidden rounded-3xl border border-line bg-card">
          <JourneyMap state={map} avatarSeed={member.avatarSeed} compact />
          <div className="flex items-center justify-between px-5 py-3 text-[13px]">
            <span className="text-ink-soft">나의 여정</span>
            <span className="font-semibold text-olive-deep">
              {completed.length} / {JOSHUA_2026.totalDays}
            </span>
          </div>
        </Link>

        {/* 오늘 공동체 */}
        {phase !== "before" && (
          <section className="rounded-3xl bg-paper-deep/70 px-5 py-4 text-sm leading-6 text-ink-soft">
            {todayDay && community.todayDayDone !== null ? (
              <p>
                오늘 <b className="text-ink">{community.todayDayDone}명</b>이 DAY {todayDay.day}의 길을 걸었어요.
                <span className="text-stone"> (동행자 {community.participants}명)</span>
              </p>
            ) : (
              <p>
                오늘 함께 걸은 동행자 <b className="text-ink">{community.walkedToday}명</b>
                <span className="text-stone"> · 전체 동행자 {community.participants}명</span>
              </p>
            )}
          </section>
        )}

        {/* 아직 걷지 않은 길 */}
        {unwalked.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-[13px] font-semibold text-ink-soft">{BRAND.unwalkedPath}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {unwalked.slice(0, 5).map((d) => (
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
            {unwalked.length > 5 && (
              <Link href="/journey" className="mt-2 block px-1 text-xs text-olive">
                {unwalked.length - 5}개 더 보기
              </Link>
            )}
          </section>
        )}
      </main>
    </>
  );
}
