import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// 서버리스 함수를 Supabase(서울)와 같은 리전에 둔다 — DB 왕복 지연 최소화
export const preferredRegion = "icn1";

// 한글 폰트는 서브셋이 없어 preload 하지 않는다(필요한 글자만 브라우저가 내려받는다)
const sans = Noto_Sans_KR({
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans",
  preload: false,
  display: "swap",
});
const serif = Noto_Serif_KR({
  weight: ["400", "600"],
  variable: "--font-noto-serif",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.subtitle}`,
  description: BRAND.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f1e7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-dvh antialiased">
        {/* 모바일 퍼스트: 가운데 정렬된 폭 제한 컨테이너 */}
        <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>
      </body>
    </html>
  );
}
