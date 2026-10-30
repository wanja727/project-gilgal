"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "오늘", icon: <path d="M4 10.5l8-6 8 6V19a1 1 0 01-1 1h-4.5v-5.5h-5V20H5a1 1 0 01-1-1z" /> },
  { href: "/journey", label: "여정", icon: <path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5l-6-2zM9 4.5v13M15 6.5v13" /> },
  {
    href: "/overview",
    label: "개관",
    icon: <path d="M12 6.5C10 5 7.5 4.5 4 4.5v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2zM12 6.5v13" />,
  },
  {
    href: "/me",
    label: "나",
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.6" />
        <path d="M5 20c1-3.6 3.6-5.3 7-5.3s6 1.7 7 5.3" />
      </>
    ),
  },
];

/** 지금 주소가 몇 번째 탭인지(-1: 탭 밖, 예: /share) — 탭 전환 방향을 정할 때 */
export function tabIndexOf(pathname: string) {
  return TABS.findIndex((t) => (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)));
}

/** 하단 탭 (오늘 · 여정 · 개관 · 나). 나눔은 탭 대신 홈 미리보기·본문 아래에서(2026-10-26). 본문 읽기·로그인·온보딩 화면에는 없다 */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-4 border-t border-line bg-surface/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur"
    >
      {TABS.map((tab) => {
        const on = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center gap-1 pt-1 text-micro font-semibold ${on ? "text-main" : "text-mid"}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill={on ? "currentColor" : "none"}
              fillOpacity={on ? 0.12 : 0}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              aria-hidden
            >
              {tab.icon}
            </svg>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
