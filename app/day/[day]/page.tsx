import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterReader } from "@/components/ChapterReader";
import { JourneyMap } from "@/components/map/JourneyMap";
import { READER_ROOT_ID, ReaderSettingsButton } from "@/components/reading/ReaderSettingsButton";
import { CommentCard } from "@/components/share/CommentCard";
import { CommentComposer } from "@/components/share/CommentComposer";
import { ButtonLink, CardHead, ChevronLeft, EmptyState } from "@/components/ui";
import { getJoshuaChapter } from "@/lib/bible";
import { COMMENT_MAX_LENGTH, type CommentSort, countComments, listComments, toShared } from "@/lib/data/comments";
import { getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { formatDate } from "@/lib/format";
import { campaignSlug, JOSHUA_2026 } from "@/lib/journey/campaign";
import { ACTS, type JourneyDay } from "@/lib/journey/days";
import { cropAround, SITES } from "@/lib/journey/locations";
import type { MapView } from "@/lib/journey/mapState";
import { nextToRead } from "@/lib/journey/mapState";
import { checkDayAccess, getDay } from "@/lib/journey/schedule";
import { parseReaderSettings, READER_COOKIE, readerCssVars, type ReaderSettings } from "@/lib/reading/settings";
import { nowKst, todayKst } from "@/lib/time";
import { CompleteDock } from "./CompleteDock";

export const dynamic = "force-dynamic";

const STAGE_VIEW: MapView = { walked: [], visited: [], me: null, flag: null, canaanFilled: true };

/**
 * 본문 화면 전체를 감싸 읽기 설정(배경·글꼴 등)을 쿠키 값으로 처음부터 적용한다 — 열 때 기본값으로 번쩍이지 않게.
 * 설정을 바꾸면 ReaderSettingsButton 이 이 요소의 속성을 바로 고친다.
 */
function ReaderRoot({ settings, children }: { settings: ReaderSettings; children: React.ReactNode }) {
  return (
    <div
      id={READER_ROOT_ID}
      data-reader-theme={settings.theme}
      style={readerCssVars(settings) as React.CSSProperties}
      className="min-h-dvh bg-bg text-text"
    >
      {children}
    </div>
  );
}

function ReadingBar({ title, settings }: { title: string; settings: ReaderSettings }) {
  return (
    <div className="flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),6px)] text-main">
      <Link href="/" aria-label="오늘로 돌아가기" className="grid size-11 place-items-center rounded-full">
        <ChevronLeft />
      </Link>
      <span className="text-[14px] font-semibold">{title}</span>
      <ReaderSettingsButton initial={settings} />
    </div>
  );
}

/**
 * 장 머리: ACT · "여호수아 N장" + 장 소개 카드(무대 지도 · 장소 · 장 제목 · 한 줄 요약).
 * 어느 경로(홈 진행도·이어 읽기·여정 탭)로 들어와도 읽기 전에 이 장이 어디서 무슨 일인지 먼저 본다(2026-10-26).
 * 장 소개는 여기 한 곳에만 둔다 — 홈 진행도 시트·도착 화면에서는 반복하지 않는다.
 */
function ChapterIntro({ day }: { day: JourneyDay }) {
  return (
    <>
      <div className="px-5 pt-4">
        <p className="text-caption font-semibold text-mute">
          ACT {day.act} · {ACTS[day.act].title}
        </p>
        <h1 className="mt-1 font-serif text-display font-bold tracking-[-0.04em] text-main">
          {JOSHUA_2026.book.name} {day.chapter}장
        </h1>
      </div>
      <section aria-label={`${day.chapter}장 소개`} className="mx-gutter mt-4 grid grid-cols-[96px_1fr] overflow-hidden rounded-[22px] bg-surface">
        <div className="min-h-[112px]">
          <JourneyMap
            view={STAGE_VIEW}
            focus={day.site}
            crop={cropAround(day.site, 110, 120)}
            labels={false}
            ariaLabel={`${day.chapter}장의 무대: ${SITES[day.site].name}`}
          />
        </div>
        <div className="py-4 pr-4 pl-3.5">
          <p className="text-caption font-semibold text-mute">{day.place}</p>
          <b className="mt-0.5 block font-serif text-[18px] leading-snug font-bold tracking-[-0.03em] text-main">{day.title}</b>
          <p className="mt-1.5 text-small leading-[1.6] text-text">{day.summary}</p>
        </div>
      </section>
    </>
  );
}

export default async function DayPage({ params, searchParams }: PageProps<"/day/[day]">) {
  const member = await requireMember();
  const { day: dayParam } = await params;
  const { sort: sortParam } = await searchParams;
  const sort: CommentSort = sortParam === "likes" ? "likes" : "latest";
  const today = todayKst();
  const settings = parseReaderSettings((await cookies()).get(READER_COOKIE)?.value);

  // 공개 여부는 서버에서 판단한다. 미래 장은 URL 을 직접 입력해도 본문을 내보내지 않는다.
  const access = checkDayAccess(dayParam, today);
  if (!access.ok && access.reason === "invalid_day") notFound();

  if (!access.ok) {
    const day = getDay(Number(dayParam))!;
    return (
      <ReaderRoot settings={settings}>
        <ReadingBar title={`${formatDate(day.readingDate)}의 장`} settings={settings} />
        <ChapterIntro day={day} />
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
      </ReaderRoot>
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
  // 읽은 장 끝의 다음 걸음: 책의 다음 장(열렸으면)이 먼저 — 다시 읽는 중에 이어 읽던 먼 장으로 건너뛰지 않게.
  // 이어 읽던 곳이 따로 있으면 작은 링크로 남긴다(2026-10-29)
  const following = checkDayAccess(day.day + 1, today);
  const resumeDay = next && next.day !== day.day ? next.day : null;
  const after = following.ok
    ? {
        primary: {
          label: `${following.day.chapter}장 ${resumeDay === following.day.day ? "이어 읽기" : "읽기"}`,
          href: `/day/${following.day.day}`,
        },
        secondary:
          resumeDay && resumeDay !== following.day.day ? { label: `이어 읽던 ${resumeDay}장으로`, href: `/day/${resumeDay}` } : null,
      }
    : {
        primary: resumeDay ? { label: `${resumeDay}장 이어 읽기`, href: `/day/${resumeDay}` } : { label: "오늘의 여정으로", href: "/" },
        secondary: null,
      };
  const shared = toShared(comments, nowKst());

  return (
    <ReaderRoot settings={settings}>
      <div className="pb-[max(env(safe-area-inset-bottom),24px)]">
      <ReadingBar title={`${formatDate(day.readingDate)}의 장`} settings={settings} />
      <ChapterIntro day={day} />

      {chapter ? (
        <ChapterReader text={chapter} />
      ) : (
        <div className="mx-gutter mt-5 rounded-card bg-surface">
          <EmptyState title="본문을 준비하고 있어요">
            {JOSHUA_2026.book.name} {day.chapter}장을 성경에서 읽고 아래 버튼을 눌러 주세요.
          </EmptyState>
        </div>
      )}

      <CompleteDock
        day={day}
        initiallyDone={done.has(day.day)}
        after={after}
        today={today}
        avatarKey={member.avatarKey}
      />

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
        <CommentComposer
          dayNo={day.day}
          chapter={day.chapter}
          maxLength={COMMENT_MAX_LENGTH}
          avatarKey={member.avatarKey}
          draftKey={`${campaignSlug()}:${member.avatarSeed}:${day.day}`}
        />
        {shared.length === 0 ? (
          <p className="px-2 py-6 text-center text-small text-mute">아직 나눔이 없어요. 첫 나눔을 남겨 보세요.</p>
        ) : (
          shared.map((c) => <CommentCard key={c.id} comment={c} isAdmin={member.isAdmin} maxLength={COMMENT_MAX_LENGTH} quoting />)
        )}
      </section>

      </div>
    </ReaderRoot>
  );
}
