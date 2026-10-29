import type { Metadata, Viewport } from "next";
import { Gowun_Batang } from "next/font/google";
// Pretendard 는 Google Fonts 에 없어 npm 패키지의 동적 서브셋 CSS 로 자체 호스팅한다(필요한 글자 조각만 내려받는다)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { BRAND } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { isTimeOverridden, todayKst } from "@/lib/time";
import "./globals.css";

// 서버리스 함수를 Supabase(서울)와 같은 리전에 둔다 — DB 왕복 지연 최소화
export const preferredRegion = "icn1";

// 한글 폰트는 서브셋이 없어 preload 하지 않는다(필요한 글자만 브라우저가 내려받는다)
const serif = Gowun_Batang({
  weight: ["400", "700"],
  variable: "--font-gowun-batang",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name}: ${BRAND.subtitle}`,
  description: BRAND.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f1f3f6",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={serif.variable}>
      {/* 테스트 안내 띠 높이 — 화면 위에 붙는 다른 바(본문 상단 바)가 그 아래에 붙도록 */}
      <body className="min-h-dvh" style={isTimeOverridden() ? ({ "--test-banner-h": "30px" } as React.CSSProperties) : undefined}>
        {/* 날짜를 바꿔 보는 중이면(개발·오픈 전 운영 테스트) 모든 화면 위에 알린다 — 실제 날짜로 착각하지 않게 */}
        {isTimeOverridden() && (
          <p role="status" className="sticky top-0 z-[60] flex h-[30px] items-center justify-center bg-main px-4 text-caption font-semibold text-white">
            테스트 모드 · {formatDate(todayKst(), true)}로 보는 중
          </p>
        )}
        {/* 모바일 퍼스트: 가운데 정렬된 폭 제한 컨테이너 */}
        <div className="relative mx-auto min-h-dvh w-full max-w-md">{children}</div>
      </body>
    </html>
  );
}
