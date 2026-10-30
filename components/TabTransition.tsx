"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { tabIndexOf } from "./TabBar";

/** 바로 전에 보던 주소 — template 이 화면마다 새로 그려져도 남도록 모듈에 둔다 */
let lastPath: string | null = null;

/**
 * 탭 화면이 바뀔 때 내용이 살짝 미끄러져 들어온다(2026-10-30, app/(tabs)/template.tsx).
 * 오른쪽 탭으로 가면 오른쪽에서, 왼쪽 탭이면 왼쪽에서, 탭 밖 화면(모든 나눔 /share)과 오갈 때는 아래에서 떠오른다.
 * 같은 탭 안(나 → 아바타 꾸미기)은 template 이 다시 그려지지 않아 움직이지 않는다. 처음 열 때도 움직이지 않는다. 끝나면 transform 이 남지 않아 안쪽의 fixed 시트·하단 입력창 위치에 영향이 없다.
 */
export function TabTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [motion] = useState(() => {
    if (lastPath === null || lastPath === pathname) return "";
    const from = tabIndexOf(lastPath);
    const to = tabIndexOf(pathname);
    if (from < 0 || to < 0 || from === to) return "tab-in-up";
    return to > from ? "tab-in-right" : "tab-in-left";
  });
  useEffect(() => {
    lastPath = pathname;
  }, [pathname]);
  return <div className={motion}>{children}</div>;
}
