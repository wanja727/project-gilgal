import { AvatarEditor } from "@/components/AvatarEditor";
import { ButtonLink, Card, CardHead, PageTitle } from "@/components/ui";
import { signOut } from "@/lib/auth";
import { resolveAvatarParts } from "@/lib/avatar";
import { BRAND } from "@/lib/brand";
import { getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import { journeyProgress } from "@/lib/journey/guide";
import { todayKst } from "@/lib/time";

export const dynamic = "force-dynamic";

/** 나 탭: 내 정보 · 나의 여정 숫자 · 아바타 꾸미기 · 로그아웃 */
export default async function MePage() {
  const member = await requireMember();
  const today = todayKst();
  const completed = await getCompletedDays(member.userId);
  const p = journeyProgress(completed, today);

  const stats: [string, string][] = [
    ["읽은 장", `${completed.length} / ${JOSHUA_2026.totalDays}`],
    ["이어 읽은 곳", p.position > 0 ? `${p.position}장` : "출발 전"],
    [BRAND.unwalkedPath, `${p.unread.length}개`],
  ];

  return (
    <>
      <PageTitle>나</PageTitle>
      <p className="px-5 pt-1.5 text-sub text-mute">
        {member.realName} · {member.cellName}
      </p>

      <Card aria-labelledby="me-progress">
        <CardHead id="me-progress" title="나의 여정" />
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-btn bg-bg px-3 py-3">
              <dt className="text-caption text-mute">{k}</dt>
              <dd className="mt-0.5 text-[17px] font-bold tracking-[-0.03em] text-main">{v}</dd>
            </div>
          ))}
        </dl>
        {p.finished && (
          <div className="mt-3">
            <ButtonLink href="/finale">나의 24일 돌아보기</ButtonLink>
          </div>
        )}
      </Card>

      <Card aria-labelledby="me-avatar">
        <CardHead id="me-avatar" title="나의 아바타 꾸미기" />
        <div className="mt-4">
          <AvatarEditor seed={member.avatarSeed} parts={resolveAvatarParts(member.avatarSeed, member.avatarParts)} />
        </div>
      </Card>

      <Card aria-labelledby="me-info">
        <CardHead id="me-info" title="알려 드려요" />
        <ul className="mt-3 space-y-2 text-small leading-6 text-mute">
          <li>이름이나 셀이 잘못됐거나 빠졌다면 셀 리더나 운영자에게 알려 주세요.</li>
          <li>지도는 이야기 흐름을 보여 주는 개념도이고, 실제 위치와 다를 수 있어요.</li>
        </ul>
      </Card>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-6 text-center"
      >
        <button type="submit" className="min-h-11 px-4 text-small text-mute underline underline-offset-4">
          로그아웃
        </button>
      </form>
    </>
  );
}
