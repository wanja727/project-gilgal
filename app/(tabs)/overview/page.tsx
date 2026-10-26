import { Card, CardHead, PageTitle } from "@/components/ui";
import { getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { journeyProgress } from "@/lib/journey/guide";
import {
  BACKGROUND_BLESSING,
  BACKGROUND_PARAGRAPHS,
  BACKGROUND_QUESTION,
  BACKGROUND_STEPS,
  KEY_VERSE,
  OVERVIEW_INTRO,
  OVERVIEW_SECTIONS,
  type OverviewSection,
  sectionOfChapter,
} from "@/lib/journey/overview";
import { todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

// 네 부분을 같은 남색의 농도로 구분한다(토큰 색만 사용)
const TONE: Record<OverviewSection["no"], string> = {
  1: "bg-main",
  2: "bg-main/75",
  3: "bg-main/50",
  4: "bg-main/30",
};

/** 개관 탭: 여호수아서 배경과 네 부분 구성, 핵심 구절 */
export default async function OverviewPage() {
  const member = await requireMember();
  const p = journeyProgress(await getCompletedDays(member.userId), todayKst());
  // 지금 읽을 장이 속한 부분을 표시한다(완주했거나 아직 열린 장이 없으면 표시 없음)
  const current = p.finished ? null : (p.next?.day ?? null);
  const total = JOSHUA_2026.totalDays;

  return (
    <>
      <PageTitle>개관</PageTitle>
      <p className="px-5 pt-1.5 text-sub text-mute">여호수아 24장을 한눈에 보기</p>

      {/* 표어 */}
      <section className="mx-gutter mt-4 overflow-hidden rounded-card bg-main px-5 pt-6 pb-5 text-white">
        <p className="text-caption font-semibold tracking-[0.12em] text-white/60">청년캠프1 주제 표어</p>
        <p className="mt-1 font-serif text-[40px] leading-none font-bold tracking-[-0.04em]">{OVERVIEW_INTRO.theme}</p>
        <p className="mt-4 text-sub leading-6 text-white/85">{OVERVIEW_INTRO.lead}</p>
      </section>

      {/* 배경 */}
      <Card aria-labelledby="ov-background">
        <CardHead id="ov-background" title="여호수아서의 배경" />
        <ol className="mt-4 grid grid-cols-3 gap-1.5">
          {BACKGROUND_STEPS.map((s, i) => (
            <li key={s.label} className="relative rounded-tile bg-bg px-2.5 pt-3 pb-3 text-center">
              <span className="mx-auto flex size-6 items-center justify-center rounded-chip bg-main text-caption font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-2 font-serif text-[15px] font-bold tracking-[-0.03em] text-main">{s.label}</p>
              <p className="mt-1 text-caption leading-[1.45] text-mute">{s.body}</p>
              {i < BACKGROUND_STEPS.length - 1 && (
                <span aria-hidden className="absolute top-1/2 -right-[9px] z-10 -translate-y-1/2 text-mid">
                  ›
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-5 space-y-3 text-body leading-7 text-text">
          {BACKGROUND_PARAGRAPHS.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>
        <blockquote className="mt-5 rounded-tile border-l-4 border-main bg-soft px-4 py-4">
          <p className="font-serif text-[17px] leading-7 font-bold tracking-[-0.03em] text-main">‘{BACKGROUND_QUESTION}’</p>
          <p className="mt-2 text-small leading-6 text-mute">{BACKGROUND_BLESSING}</p>
        </blockquote>
      </Card>

      {/* 구성 */}
      <Card aria-labelledby="ov-structure">
        <CardHead id="ov-structure" title="여호수아서 개관" sub="네 부분" />

        {/* 24장 막대: 부분마다 칸 수만큼 차지 */}
        <div className="mt-4" role="img" aria-label={OVERVIEW_SECTIONS.map((s) => `${s.chapters[0]}~${s.chapters[1]}장 ${s.keyword}`).join(", ")}>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
            {Array.from({ length: total }, (_, i) => {
              const ch = i + 1;
              const s = sectionOfChapter(ch)!;
              return (
                <div key={ch} className="relative">
                  <div className={`h-3.5 rounded-[3px] ${TONE[s.no]}`} />
                  {ch === current && (
                    <span aria-hidden className="absolute top-full left-1/2 mt-0.5 -translate-x-1/2 text-[9px] leading-none text-main">
                      ▲
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3.5 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
            {OVERVIEW_SECTIONS.map((s) => (
              <p
                key={s.no}
                className="truncate text-center text-caption font-semibold text-main"
                style={{ gridColumn: `${s.chapters[0]} / ${s.chapters[1] + 1}` }}
              >
                {s.keyword}
              </p>
            ))}
          </div>
        </div>
        {current && <p className="mt-2 text-caption text-mute">▲ 지금 읽을 {current}장</p>}

        {/* 네 부분 */}
        <ol className="mt-5">
          {OVERVIEW_SECTIONS.map((s, i) => {
            const here = current !== null && current >= s.chapters[0] && current <= s.chapters[1];
            const last = i === OVERVIEW_SECTIONS.length - 1;
            return (
              <li key={s.no} className="relative flex gap-3.5">
                {/* 세로 연결선 */}
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-chip text-small font-bold ${TONE[s.no]} ${s.no >= 3 ? "text-main" : "text-white"}`}
                  >
                    {s.no}
                  </span>
                  {!last && <span aria-hidden className="w-px flex-1 bg-line" />}
                </div>
                <div className={`min-w-0 flex-1 ${last ? "" : "pb-6"}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                    <span className="text-caption font-semibold text-mute">{s.range}</span>
                    {here && (
                      <span className="rounded-chip bg-main px-2 py-0.5 text-micro font-semibold text-white">지금 읽는 부분</span>
                    )}
                  </div>
                  <h3 className="mt-1 font-serif text-[18px] leading-snug font-bold tracking-[-0.03em] text-main">{s.title}</h3>
                  <ul className="mt-2.5 space-y-1.5">
                    {s.points.map((pt) => (
                      <li key={pt} className="flex gap-2 text-sub leading-6 text-text">
                        <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-chip bg-mid" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* 핵심 구절 */}
      <figure className="mx-gutter mt-3 rounded-card bg-surface px-5 pt-6 pb-5">
        <span aria-hidden className="block font-serif text-[44px] leading-[0.6] text-mid">“</span>
        <blockquote className="mt-2 font-serif text-[17px] leading-8 tracking-[-0.02em] text-main">{KEY_VERSE.text}</blockquote>
        <span aria-hidden className="mt-4 block text-right font-serif text-[44px] leading-[0.6] text-mid">”</span>
        <figcaption className="mt-1 text-right text-small font-semibold text-mute">{KEY_VERSE.ref}</figcaption>
      </figure>
    </>
  );
}
