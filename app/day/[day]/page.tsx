import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterReader } from "@/components/ChapterReader";
import { JourneyMap } from "@/components/map/JourneyMap";
import { FontSizeButton } from "@/components/reading/FontSizeButton";
import { CommentCard } from "@/components/share/CommentCard";
import { CommentComposer } from "@/components/share/CommentComposer";
import { ButtonLink, CardHead, ChevronLeft, EmptyState } from "@/components/ui";
import { getJoshuaChapter } from "@/lib/bible";
import { COMMENT_MAX_LENGTH, type CommentSort, countComments, listComments, toShared } from "@/lib/data/comments";
import { getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { ACTS } from "@/lib/journey/days";
import { cropAround, type SiteId, SITES } from "@/lib/journey/locations";
import type { MapView } from "@/lib/journey/mapState";
import { nextToRead } from "@/lib/journey/mapState";
import { checkDayAccess, getDay } from "@/lib/journey/schedule";
import { nowKst, todayKst } from "@/lib/time";
import { CompleteDock } from "./CompleteDock";

export const dynamic = "force-dynamic";

const STAGE_VIEW: MapView = { walked: [], ahead: [], visited: [], me: null, flag: null, canaanFilled: true };

function ReadingBar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),6px)] text-main">
      <Link href="/" aria-label="오늘로 돌아가기" className="grid size-11 place-items-center rounded-full">
        <ChevronLeft />
      </Link>
      <span className="text-[14px] font-semibold">{title}</span>
      <FontSizeButton />
    </div>
  );
}

function Stage({ chapter, site, title }: { chapter: number; site: SiteId; title: string }) {
  return (
    <div className="mx-gutter mt-2 grid grid-cols-[118px_1fr] overflow-hidden rounded-[22px] bg-surface">
      <div className="h-[104px]">
        <JourneyMap
          view={STAGE_VIEW}
          focus={site}
          crop={cropAround(site, 120, 106)}
          labels={false}
          ariaLabel={`${chapter}장의 무대: ${SITES[site].name}`}
        />
      </div>
      <div className="flex flex-col justify-center py-4 pr-4 pl-3.5">
        <p className="text-caption font-semibold text-mute">{chapter}장의 무대</p>
        <b className="mt-[3px] font-serif text-[19px] font-bold tracking-[-0.03em] text-main">{SITES[site].name}</b>
        <span className="mt-[3px] text-small text-mute">{title}</span>
      </div>
    </div>
  );
}

export default async function DayPage({ params, searchParams }: PageProps<"/day/[day]">) {
  const member = await requireMember();
  const { day: dayParam } = await params;
  const { sort: sortParam } = await searchParams;
  const sort: CommentSort = sortParam === "likes" ? "likes" : "latest";
  const today = todayKst();

  // 공개 여부는 서버에서 판단한다. 미래 장은 URL 을 직접 입력해도 본문을 내보내지 않는다.
  const access = checkDayAccess(dayParam, today);
  if (!access.ok && access.reason === "invalid_day") notFound();

  if (!access.ok) {
    const day = getDay(Number(dayParam))!;
    return (
      <>
        <ReadingBar title={`${formatDate(day.readingDate)}의 장`} />
        <Stage chapter={day.chapter} site={day.site} title={day.title} />
        <div className="mx-gutter mt-3 rounded-card bg-surface">
          <EmptyState title="아직 열리지 않은 길">
            {JOSHUA_2026.book.name} {day.chapter}장은 {formatDate(day.readingDate, true)}에 열려요.
            <br />
            그날 공동체와 함께 걸어요.
          </EmptyState>
        </div>
        <div className="mx-gutter mt-4">
          <ButtonLink href="/" variant="line">
            오늘의 여정으로
          </ButtonLink>
        </div>
      </>
    );
  }

  const day = access.day;
  const [chapter, completed, comments, commentCount] = await Promise.all([
    getJoshuaChapter(day.chapter),
    getCompletedDays(member.userId),
    listComments(member, day.day, sort),
    countComments(day.day),
  ]);
  const done = new Set(completed);
  const next = nextToRead(done, today);
  const after =
    next && next.day !== day.day ? { label: `${next.day}장 이어 읽기`, href: `/day/${next.day}` } : { label: "오늘의 여정으로", href: "/" };
  const shared = toShared(comments, nowKst());

  return (
    <div className="pb-[calc(110px+env(safe-area-inset-bottom))]">
      <ReadingBar title={`${formatDate(day.readingDate)}의 장`} />
      <Stage chapter={day.chapter} site={day.site} title={day.title} />

      <div className="px-7 pt-[26px]">
        <h1 className="font-serif text-display font-bold tracking-[-0.04em] text-main">
          {JOSHUA_2026.book.name} {day.chapter}장
        </h1>
        <p className="mt-3 inline-block rounded-[8px] bg-soft px-2.5 py-1.5 text-caption font-semibold text-mute">
          ACT {day.act} · {ACTS[day.act].title}
        </p>
      </div>

      {chapter ? (
        <ChapterReader text={chapter} />
      ) : (
        <div className="mx-gutter mt-5 rounded-card bg-surface">
          <EmptyState title="본문을 준비하고 있어요">
            {JOSHUA_2026.book.name} {day.chapter}장을 성경에서 읽고 아래 버튼을 눌러 주세요.
          </EmptyState>
        </div>
      )}

      <section id="share" aria-labelledby="share-title" className="scroll-mt-4 px-gutter pt-2 pb-7">
        <div className="px-1 pt-3.5 pb-1">
          <CardHead
            id="share-title"
            title="나눔"
            sub={commentCount}
            right={
              <nav aria-label="나눔 정렬" className="flex text-small font-semibold">
                {(["latest", "likes"] as const).map((s) => (
                  <Link
                    key={s}
                    href={s === "latest" ? `/day/${day.day}#share` : `/day/${day.day}?sort=likes#share`}
                    scroll={false}
                    aria-current={sort === s ? "true" : undefined}
                    className={`flex min-h-11 items-center px-2 ${sort === s ? "text-main" : "text-mid"}`}
                  >
                    {s === "latest" ? "최신순" : "공감순"}
                  </Link>
                ))}
              </nav>
            }
          />
        </div>
        <CommentComposer dayNo={day.day} maxLength={COMMENT_MAX_LENGTH} />
        {shared.length === 0 ? (
          <p className="px-2 py-6 text-center text-small text-mute">아직 나눔이 없어요. 첫 나눔을 남겨 보세요.</p>
        ) : (
          shared.map((c) => <CommentCard key={c.id} comment={c} isAdmin={member.isAdmin} maxLength={COMMENT_MAX_LENGTH} />)
        )}
      </section>

      <CompleteDock
        day={day}
        initiallyDone={done.has(day.day)}
        after={after}
        today={today}
        avatarSeed={member.avatarSeed}
      />
    </div>
  );
}
