import { CommentCard } from "@/components/share/CommentCard";
import { EmptyState, PageTitle } from "@/components/ui";
import { COMMENT_MAX_LENGTH, listRecentComments, toShared } from "@/lib/data/comments";
import { requireMember } from "@/lib/data/viewer";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { campaignPhase } from "@/lib/journey/schedule";
import { nowKst, todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 나눔 탭: 공개된 장들의 최근 나눔을 한곳에서 (장 이름을 누르면 그 장의 본문과 나눔으로) */
export default async function SharePage() {
  const member = await requireMember();
  const today = todayKst();
  const comments = toShared(await listRecentComments(member, today), nowKst());

  return (
    <>
      <PageTitle>나눔</PageTitle>
      <p className="px-5 pt-1.5 text-sub text-mute">말씀을 읽고 마음에 남은 것을 함께 나눠요</p>
      <div className="px-gutter pt-3">
        {comments.length === 0 ? (
          <div className="mt-2 rounded-card bg-surface">
            {campaignPhase(today) === "before" ? (
              <EmptyState title="아직 나눔이 열리지 않았어요">11월 2일 1장이 열리면 나눔도 함께 시작돼요.</EmptyState>
            ) : (
              <EmptyState title="아직 나눔이 없어요">오늘의 장을 읽고 첫 나눔을 남겨 보세요.</EmptyState>
            )}
          </div>
        ) : (
          comments.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              isAdmin={member.isAdmin}
              maxLength={COMMENT_MAX_LENGTH}
              chapterLink={{ href: `/day/${c.dayNo}#share`, label: `${c.dayNo}장 · ${JOURNEY_DAYS[c.dayNo - 1].place}` }}
            />
          ))
        )}
      </div>
    </>
  );
}
