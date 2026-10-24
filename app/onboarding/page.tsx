import { redirect } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { claimByKakaoId, listActiveCells } from "@/lib/data/onboarding";
import { requireViewer } from "@/lib/data/viewer";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const viewer = await requireViewer();
  if (viewer.onboarded) redirect("/");

  // 로그인 이벤트에서 자동 연결이 실패했을 수 있으므로 회원번호 매칭을 한 번 더 시도한다
  if (await claimByKakaoId(viewer.userId)) redirect("/");

  const cells = await listActiveCells();

  return (
    <main className="flex min-h-dvh flex-col justify-center px-7 py-12">
      <div className="mb-10 space-y-2 text-center">
        <h1 className="font-serif text-h1 font-bold tracking-[-0.04em] text-main">{BRAND.name}에 오신 것을 환영해요</h1>
        <p className="text-small leading-6 text-mute">
          함께 걸을 동행자를 찾기 위해
          <br />
          이름과 소속 셀을 확인할게요.
        </p>
      </div>
      <OnboardingForm cells={cells} />
    </main>
  );
}
