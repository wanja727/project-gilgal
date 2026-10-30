import { TabTransition } from "@/components/TabTransition";

/** 탭 화면을 오갈 때마다 새로 그려지는 틀 — 들어오는 연출만 맡는다 */
export default function TabsTemplate({ children }: { children: React.ReactNode }) {
  return <TabTransition>{children}</TabTransition>;
}
