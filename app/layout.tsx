import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// 서버리스 함수를 Supabase(서울)와 같은 리전에 둔다 — DB 왕복 지연 최소화
export const preferredRegion = "icn1";

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.subtitle}`,
  description: BRAND.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">
        {/* 모바일 퍼스트: 가운데 정렬된 폭 제한 컨테이너 */}
        <div className="mx-auto min-h-dvh w-full max-w-md">{children}</div>
      </body>
    </html>
  );
}
