import { TabBar } from "@/components/TabBar";

/** 하단 탭이 있는 화면들 (오늘 · 여정 · 개관 · 나) + 모든 나눔(/share) */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pb-[calc(96px+env(safe-area-inset-bottom))]">{children}</main>
      <TabBar />
    </>
  );
}
