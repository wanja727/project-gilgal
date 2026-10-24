"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "오늘", icon: <path d="M4 10.5l8-6 8 6V19a1 1 0 01-1 1h-4.5v-5.5h-5V20H5a1 1 0 01-1-1z" /> },
  { href: "/journey", label: "여정", icon: <path d="M9 4.5L3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5l-6-2zM9 4.5v13M15 6.5v13" /> },
  { href: "/share", label: "나눔", icon: <path d="M4.5 5.5h15v10h-9l-4.5 4v-4h-1.5z" /> },
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

/** 하단 탭 (오늘 · 여정 · 나눔 · 나). 본문 읽기·로그인·온보딩 화면에는 없다 */
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
