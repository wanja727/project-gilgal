import { Avatar } from "@/components/Avatar";
import { CountUp } from "@/components/motion/CountUp";
import { ArrivalBoard } from "@/components/home/ArrivalBoard";
import { CellCard } from "@/components/home/CellCard";
import { CellChip } from "@/components/home/CellChip";
import { ChapterPath } from "@/components/home/ChapterPath";
import { SharePreview } from "@/components/home/SharePreview";
import { cookies } from "next/headers";
import Link from "next/link";
import { buttonClass, ButtonLink, Card, CardHead, ChevronRight, FlagIcon, MoreLink } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { countComments, listComments, listRecentComments, toShared } from "@/lib/data/comments";
import { getArrivalBoard, getCellMembers, getCommunityToday, getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { sampleShares } from "@/lib/share/sample";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { flagCaption, goal, greeting, journeyProgress } from "@/lib/journey/guide";
import { chapterStatus } from "@/lib/journey/mapState";
import { formatPathSeen, PATH_SEEN_COOKIE, pathCount, pathMotion } from "@/lib/journey/pathMotion";
import { OVERVIEW_INTRO } from "@/lib/journey/overview";
import { todaysDay } from "@/lib/journey/schedule";
import { nowKst, todayKst } from "@/lib/time";

// 날짜와 사용자에 따라 내용이 바뀌므로 정적 캐시하지 않는다
export const dynamic = "force-dynamic";

const ALL_DAYS = JOURNEY_DAYS.map((d) => d.day);
/** 홈 나눔 미리보기에서 세 개씩 넘겨 보여 줄 나눔 수 */
const SHARE_PREVIEW = 12;
/** 이만큼의 최근 나눔 중에서 무작위로 골라 섞는다 — 늘 같은 사람(가장 최근·먼저 쓴 사람)만 앞에 보이지 않게 */
const SHARE_POOL = 40;

/** 홈 = 인사 + 'ㄹ'자 진행도 + 나눔 미리보기 + 오늘 장에 도착한 사람 + 우리 셀 (기간 상태별 분기, architecture 7절) */
export default async function Home() {
  const member = await requireMember();
  const today = todayKst();
  const completed = await getCompletedDays(member.userId);
  const p = journeyProgress(completed, today);

  // 셀 카드 기준: 깃발이 있으면 그 장, 보충 기간·종료 후에는 24장 전체, 기간 전에는 없음
  const criterion = p.flag ? [p.flag.day] : p.phase === "before" ? [] : ALL_DAYS;
  // 나눔 미리보기: 깃발 장의 나눔, 깃발이 없으면(보충 기간·종료 후) 여러 장의 최근 나눔, 기간 전엔 없음.
  // 최근 나눔 여럿을 가져와 숨김 처리된 것을 빼고(작성자·운영자에게도 미리보기에서는 뺀다) 무작위로 고른다
  const [board, cellMembers, community, recent, shareTotal] = await Promise.all([
    p.flag ? getArrivalBoard(p.flag.day, member.userId) : null,
    member.personal ? [] : getCellMembers(member.cellId, member.userId, criterion),
    p.flag ? null : getCommunityToday(today),
    p.flag
      ? listComments(member, p.flag.day, "latest", SHARE_POOL)
      : p.phase === "before"
        ? null
        : listRecentComments(member, today, SHARE_POOL),
    p.flag ? countComments(p.flag.day) : 0,
  ]);
  const sharePreview = recent ? toShared(sampleShares(recent.filter((c) => !c.hidden), SHARE_PREVIEW), nowKst()) : null;

  const hello = greeting(p, member.realName);
  const g = goal(p);
  const statuses = JOURNEY_DAYS.map((d) => chapterStatus(d, p.done, today));
  // 진행도 연출: 이 기기에서 마지막으로 본 진행도와 비교해 걸어가기·처음 그리기를 정한다
  const pathSeen = (await cookies()).get(PATH_SEEN_COOKIE)?.value;
  const motion = pathMotion(pathSeen, member.avatarSeed, p.position, today);
  const nextSeen = formatPathSeen({ seed: member.avatarSeed, position: p.position, date: today });
  const flagLabel = p.flag
    ? {
        day: p.flag.day,
        label: flagCaption(p)!,
        sub: `${board?.total ?? 0}명 도착`,
      }
    : null;

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-4">
        <span className="font-serif text-[20px] font-bold tracking-[-0.03em] text-main">{BRAND.name}</span>
        <span className="flex items-center gap-2">
          {member.cellName && !member.personal && <CellChip cellName={member.cellName} />}
          {/* 내 아바타를 누르면 꾸미기로 (2026-10-29) */}
          <Link href="/me/avatar" aria-label="아바타 꾸미기" className="-m-1 rounded-full p-1">
            <Avatar avatarKey={member.avatarKey} size={34} />
          </Link>
        </span>
      </header>

      <div className="px-6 pt-[22px] pb-1">
        <p className="text-sub font-medium text-mute">{hello.kicker}</p>
        <h1 className="mt-1.5 font-serif text-h1 font-bold tracking-[-0.04em] whitespace-pre-line text-main">
          {hello.headline}
        </h1>
      </div>

      {/* 출발 전이거나 아직 한 장도 읽지 않았으면 개관부터 권한다 (탭 순서는 그대로, 2026-10-26) */}
      {(p.phase === "before" || completed.length === 0) && (
        <Link href="/overview" className="mx-gutter mt-3 flex items-center gap-3.5 rounded-card bg-main px-5 py-4 text-white">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/12" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
              <path d="M12 6.5C10 5 7.5 4.5 4 4.5v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2zM12 6.5v13" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-title font-bold tracking-[-0.03em]">
              {p.phase === "before" ? "출발 전에 여호수아 개관을 읽어 보세요" : "1장을 읽기 전에 개관을 먼저 살펴보세요"}
            </b>
            <span className="mt-0.5 block text-small text-white/70">
              표어 ‘{OVERVIEW_INTRO.theme}’ · 네 부분으로 보는 여호수아
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-white/70" />
        </Link>
      )}

      <Card className="px-3 pt-5 pb-[18px]" aria-labelledby="path-title">
        <div className="px-2">
          <CardHead
            id="path-title"
            title="나의 여정"
            sub={
              <>
                <CountUp value={completed.length} {...pathCount(motion, p.position, completed.length)} /> /{" "}
                {JOSHUA_2026.totalDays}
              </>
            }
            right={<MoreLink href="/journey">지도</MoreLink>}
          />
        </div>
        <ChapterPath
          statuses={statuses}
          position={p.position}
          flag={flagLabel}
          avatarKey={member.avatarKey}
          motion={motion}
          seen={nextSeen}
          revealDay={todaysDay(today)?.day ?? null}
        />
        <div className="mx-2 mt-1.5 flex items-center gap-3.5 rounded-tile bg-bg p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface text-main">
            <FlagIcon />
          </span>
          <span>
            <b className="block text-title font-bold tracking-[-0.03em] text-main">{g.title}</b>
            <span className="mt-0.5 block text-small text-mute">{g.body}</span>
          </span>
        </div>
        <div className="mx-2 mt-3">
          {g.action.href ? (
            <ButtonLink href={g.action.href} variant={g.action.variant}>
              {g.action.label}
            </ButtonLink>
          ) : (
            <button type="button" disabled className={buttonClass("quiet")}>
              {g.action.label}
            </button>
          )}
        </div>
      </Card>

      {/* 나눔은 "오늘 읽기" 바로 다음 — 첫 할 일(읽기 버튼)은 밀어내지 않으면서, 조금만 내려도 넘어가는 말풍선이 보이게(ADR-029) */}
      {sharePreview && <SharePreview dayNo={p.flag?.day ?? null} comments={sharePreview} total={shareTotal} />}

      {board && p.flag && (
        <ArrivalBoard
          board={board}
          title={p.phase === "reading" ? `오늘 ${p.flag.day}장까지 읽은 사람` : `${p.flag.day}장까지 읽은 사람`}
          avatarKey={member.avatarKey}
          position={p.position}
          remaining={p.unread.length}
        />
      )}

      {community && p.phase !== "before" && (
        <Card aria-labelledby="community-title">
          <CardHead id="community-title" title="오늘의 공동체" />
          <dl className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-btn bg-bg px-4 py-3.5">
              <dt className="text-caption text-mute">오늘 함께 걸은 동행자</dt>
              <dd className="mt-0.5 text-[19px] font-bold tracking-[-0.03em] text-main">{community.walkedToday}명</dd>
            </div>
            <div className="rounded-btn bg-bg px-4 py-3.5">
              <dt className="text-caption text-mute">24장을 완주한 동행자</dt>
              <dd className="mt-0.5 text-[19px] font-bold tracking-[-0.03em] text-main">
                {community.finishers}명
                <span className="ml-1 text-small font-medium text-mute">/ {community.participants}</span>
              </dd>
            </div>
          </dl>
        </Card>
      )}

      {/* 셀 없이 개인으로 참여하면 셀 카드는 없다(ADR-031) */}
      {member.cellName && !member.personal && (
        <CellCard
          cellName={member.cellName}
          members={cellMembers}
          showCount={p.phase !== "before"}
          note={
            p.phase === "before"
              ? "11월 2일, 우리 셀이 함께 출발해요."
              : p.flag
                ? `흐린 얼굴은 아직 ${p.flag.day}장까지 오지 않은 셀원이에요.`
                : "흐린 얼굴은 아직 24장을 걷고 있는 셀원이에요."
          }
        />
      )}
    </>
  );
}
