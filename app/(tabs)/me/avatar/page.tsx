import { AvatarEditor } from "@/components/AvatarEditor";
import { Card, PageTitle } from "@/components/ui";
import { resolveAvatarParts } from "@/lib/avatar";
import { requireMember } from "@/lib/data/viewer";

export const dynamic = "force-dynamic";

/**
 * 아바타 꾸미기(ADR-027). 나 탭 아래 화면 — 홈 오른쪽 위 아바타·나 탭의 아바타 카드에서 들어온다(2026-10-29).
 * 부위·보기 칸이 길어 나 탭 안에 펼쳐 두지 않고 따로 둔다.
 */
export default async function AvatarPage() {
  const member = await requireMember();

  return (
    <>
      <PageTitle>아바타 꾸미기</PageTitle>
      <Card aria-label="아바타 꾸미기">
        <AvatarEditor seed={member.avatarSeed} parts={resolveAvatarParts(member.avatarSeed, member.avatarParts)} />
      </Card>
    </>
  );
}
