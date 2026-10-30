"use client";

import { useEffect, useRef } from "react";

/**
 * 화면에 들어오면 data-inview 를 붙인다 — 안쪽 연출(막대 채우기·차례로 떠오르기)은 CSS 가 이 표시를 보고 시작한다.
 * 서버 컴포넌트 카드를 그대로 두고 감싸기만 하면 되게.
 */
export function InView({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.dataset.inview = "";
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
