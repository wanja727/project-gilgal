"use client";

import { useEffect, useState } from "react";

/**
 * 본문 화면 상단 바: 화면 위에 붙어 있다가 아래로 읽어 내려가면 숨고, 조금이라도 위로 올리면 다시 나타난다(2026-10-29).
 * 본문 화면에는 하단 탭이 없어서 "오늘로" 버튼이 유일한 나가는 길 — 읽는 동안엔 가리지 않고, 찾을 때는 어디서든 보이게.
 */
export function StickyBar({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    // 페이지 길이가 바뀌며 생긴 스크롤(구절 펼침이 접혀 끝에서 당겨지거나, 브라우저가 보던 자리를 지키려 옮긴 것)은
    // 사람이 올리고 내린 게 아니다 — 길이가 바뀐 직후의 스크롤은 바를 바꾸지 않고 기준만 맞춘다(2026-11-03)
    let resizedAt = -Infinity;
    const ro = new ResizeObserver(() => {
      resizedAt = performance.now();
    });
    ro.observe(document.body);
    const onScroll = () => {
      const y = window.scrollY;
      if (performance.now() - resizedAt < 150) {
        last = y;
        return;
      }
      // 맨 위 근처에서는 늘 보이고, 작은 흔들림(6px 미만)은 무시한다
      if (y < 80) setHidden(false);
      else if (y - last > 6) setHidden(true);
      else if (last - y > 6) setHidden(false);
      if (Math.abs(y - last) > 6) last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      className={`sticky top-[var(--test-banner-h,0px)] z-30 bg-bg/95 backdrop-blur-sm transition-transform duration-300 ease-[var(--ease-sheet)] ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {children}
    </div>
  );
}
