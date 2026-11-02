import Link from "next/link";
import { AdminLists } from "@/components/admin/AdminLists";
import { ColumnChart } from "@/components/admin/ColumnChart";
import { Card, CardHead, ChevronLeft, PageTitle } from "@/components/ui";
import { pct } from "@/lib/admin/metrics";
import { getAdminMetrics, requireAdmin } from "@/lib/data/admin";
import { formatDate } from "@/lib/format";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;

/**
 * 관리자 지표(ADR-036). 나 탭 아래 — 관리자(profile.is_admin)에게만 메뉴가 보이고, 아니면 404.
 * 참여 현황 · 날짜별 방문/읽기 추이 · 장별 완료 · 셀별/개인별 진행.
 */
export default async function AdminPage() {
  await requireAdmin();
  const today = todayKst();
  const m = await getAdminMetrics(today);

  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: "참여자", value: `${m.members}명`, sub: m.pending > 0 ? `온보딩 대기 ${m.pending}명` : "온보딩 마친 사람" },
    { label: "오늘 방문", value: `${m.visitorsToday}명`, sub: `참여자의 ${pct(m.visitorsToday, m.members)}%` },
    {
      label: m.todayDay ? `오늘의 장(${m.todayDay.chapter}장) 읽음` : "오늘 읽은 사람",
      value: `${m.todayDay ? m.todayChapterDone : m.readersToday}명`,
      sub: m.todayDay ? `참여자의 ${pct(m.todayChapterDone ?? 0, m.members)}%` : "오늘은 새 장이 없어요",
    },
    {
      label: "열린 장 모두 읽음",
      value: `${m.caughtUp}명`,
      sub: m.openDays > 0 ? `${m.openDays}장까지 · ${pct(m.caughtUp, m.members)}%` : "아직 출발 전",
    },
  ];

  return (
    <>
      <div className="px-3 pt-[max(env(safe-area-inset-top),8px)]">
        <Link href="/me" className="inline-flex h-10 items-center gap-0.5 pr-3 pl-1 text-small font-semibold text-main">
          <ChevronLeft className="size-[18px]" />나
        </Link>
      </div>
      <PageTitle>관리자</PageTitle>
      <p className="px-5 pt-1.5 text-sub text-mute">
        {JOSHUA_2026.title} · {formatDate(today)} 기준
      </p>

      <dl className="mx-gutter mt-4 grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-tile bg-surface px-4 py-3.5">
            <dt className="text-caption text-mute">{t.label}</dt>
            <dd className="mt-0.5 text-[22px] font-bold tracking-[-0.03em] text-main tabular-nums">{t.value}</dd>
            {t.sub && <dd className="text-[11px] text-mid">{t.sub}</dd>}
          </div>
        ))}
      </dl>

      <Card aria-labelledby="admin-trend">
        <CardHead id="admin-trend" title="날짜별 방문·읽기" />
        <p className="mt-1 text-caption text-mute">막대를 누르면 그날 숫자를 보여 줘요. 읽은 사람 = 그날 한 장이라도 읽기 완료를 누른 사람</p>
        <div className="mt-3">
          <ColumnChart
            ariaLabel="날짜별 방문한 사람과 읽은 사람"
            legend={["방문", "읽음"]}
            columns={m.trend.map((t) => ({
              key: t.date,
              tick: md(t.date).split("/")[1],
              label: formatDate(t.date),
              back: t.visitors,
              front: t.readers,
              mark: t.date === today,
            }))}
          />
        </div>
      </Card>

      <Card aria-labelledby="admin-chapters">
        <CardHead id="admin-chapters" title="장별 읽은 사람" sub={`${m.openDays}장까지 열림`} />
        <div className="mt-3">
          <ColumnChart
            ariaLabel="장별 읽기 완료한 참여자 수"
            legend={["읽은 사람"]}
            columns={m.chapters.map((c) => ({
              key: String(c.dayNo),
              tick: String(c.chapter),
              label: `${c.chapter}장 · 참여자의 ${pct(c.done, m.members)}%`,
              front: c.done,
              mark: c.today,
            }))}
          />
        </div>
      </Card>

      <Card aria-labelledby="admin-lists">
        <CardHead id="admin-lists" title="셀·개인별 진행" />
        <p className="mt-1 mb-3 text-caption text-mute">진행 = 오늘까지 열린 장 중 읽은 장의 비율</p>
        <AdminLists cells={m.cells} people={m.people} openDays={m.openDays} />
      </Card>
    </>
  );
}
