import Link from "next/link";
import { Card, CardHead, ChevronRight, MoreLink } from "@/components/ui";
import type { SharedComment } from "@/lib/data/comments";
import { ShareCarousel } from "./ShareCarousel";

/**
 * 홈의 나눔 미리보기 (2026-10-26, 나눔 탭 대신).
 * 나눔은 본문과 함께 읽을 때 맥락이 살아서, 홈에서는 세 개씩만 보여 주고 장 본문 아래 나눔으로 보낸다.
 * 최근 나눔 몇 개를 세 개씩 말풍선으로 넘겨 보여 주고, 홈에서 바로 공감할 수 있다(ShareCarousel, ADR-029).
 * - 깃발이 있으면 그 장의 나눔, 없으면(보충 기간·종료 후) 여러 장의 최근 나눔
 * 수정·삭제 같은 조작은 본문 아래 나눔에서만 한다.
 */
export function SharePreview({
  dayNo,
  comments,
  total,
}: {
  /** 깃발 장. null 이면 여러 장의 최근 나눔 */
  dayNo: number | null;
  comments: SharedComment[];
  /** 그 장의 전체 나눔 수 (dayNo 가 있을 때) */
  total: number;
}) {
  const allHref = dayNo ? `/day/${dayNo}#share` : "/share";
  return (
    <Card aria-labelledby="share-preview-title">
      <CardHead
        id="share-preview-title"
        title={dayNo ? `${dayNo}장 나눔` : "최근 나눔"}
        sub={dayNo ? total : undefined}
        right={comments.length > 0 ? <MoreLink href={allHref}>모두 보기</MoreLink> : undefined}
      />

      {comments.length === 0 ? (
        <Link href={allHref} className="mt-3 flex items-center justify-between gap-3 rounded-tile bg-bg px-4 py-3.5">
          <span className="text-small leading-6 text-mute">
            {dayNo ? `아직 ${dayNo}장 나눔이 없어요. 읽고 첫 나눔을 남겨 보세요.` : "아직 나눔이 없어요."}
          </span>
          <ChevronRight className="size-4 shrink-0 text-mid" />
        </Link>
      ) : (
        <ShareCarousel comments={comments} showChapter={!dayNo} />
      )}

      {dayNo && (
        <Link href="/share" className="-mb-2 flex min-h-11 items-center justify-center gap-0.5 text-small font-semibold text-mute">
          다른 장 나눔도 보기
          <ChevronRight />
        </Link>
      )}
    </Card>
  );
}
