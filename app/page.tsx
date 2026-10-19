import { BRAND } from "@/lib/brand";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { campaignPhase, daysUntilStart, todaysDay } from "@/lib/journey/schedule";
import { todayKst } from "@/lib/time";

// 날짜에 따라 내용이 바뀌므로 정적 캐시하지 않는다
export const dynamic = "force-dynamic";

/**
 * 임시 홈 — T0~T2 동작 확인용. 실제 홈(오늘의 여정 + 지도)은 T15 에서 만든다.
 */
export default function Home() {
  const today = todayKst();
  const phase = campaignPhase(today);
  const day = todaysDay(today);

  return (
    <main className="px-6 py-16">
      <h1 className="text-3xl font-bold">{BRAND.name}</h1>
      <p className="mt-2 text-ink-soft">{BRAND.subtitle}</p>

      <section className="mt-10 space-y-1 text-sm">
        <p>오늘(KST): {today}</p>
        {phase === "before" && <p>출발까지 D-{daysUntilStart(today)}</p>}
        {day && (
          <p>
            DAY {day.day} · {JOSHUA_2026.book.name} {day.chapter}장 — {day.title}
          </p>
        )}
        {phase === "rest" && <p>{BRAND.restDay}</p>}
        {phase === "catchup" && <p>Catch-up 기간</p>}
      </section>
    </main>
  );
}
