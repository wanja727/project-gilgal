import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { getViewer } from "@/lib/data/viewer";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthCallbackError: "카카오 로그인이 취소되었거나 완료되지 않았어요. 다시 시도해 주세요.",
  AccessDenied: "로그인 권한이 없어요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const viewer = await getViewer().catch(() => null);
  if (viewer) redirect(viewer.onboarded ? "/" : "/onboarding");

  const { error } = await searchParams;
  const errorMessage =
    typeof error === "string" ? (ERROR_MESSAGES[error] ?? "로그인 중 문제가 생겼어요. 다시 시도해 주세요.") : null;

  return (
    <main className="flex min-h-dvh flex-col justify-between px-7 pt-24 pb-10">
      <div className="space-y-5 text-center">
        <p className="text-caption font-semibold tracking-[0.3em] text-mute">{BRAND.kicker}</p>
        <h1 className="font-serif text-[44px] font-bold tracking-[-0.03em] text-main">{BRAND.name}</h1>
        <p className="font-serif text-[18px] leading-relaxed font-bold tracking-[-0.03em] text-main-2">{BRAND.subtitle}</p>
        <p className="mx-auto max-w-[17rem] pt-6 font-serif text-[15px] leading-7 text-text">{BRAND.tagline}</p>
      </div>

      <div className="space-y-4">
        {errorMessage && (
          <p role="alert" className="rounded-btn bg-soft px-4 py-3 text-center text-caption text-main">
            {errorMessage}
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("kakao", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-btn bg-[#FEE500] text-title font-bold text-[#3c1e1e] transition active:scale-[0.985]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 3C6.48 3 2 6.58 2 11c0 2.76 1.67 5.2 4.2 6.74l-.87 3.25a.25.25 0 0 0 .38.27L9.6 18.9c.77.14 1.57.22 2.4.22 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>
        </form>
        <p className="text-center text-[11px] leading-5 text-mute">
          셀라에서 사용하던 이름과 셀 정보를 불러와 연결합니다.
          <br />
          정보가 다르다면 셀 리더나 운영자에게 알려 주세요.
        </p>
      </div>
    </main>
  );
}
