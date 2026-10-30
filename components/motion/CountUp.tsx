"use client";

import { useEffect, useRef } from "react";

/**
 * 숫자가 from → value 로 올라간다(2026-10-30). 화면에 보일 때 한 번, delay 뒤에 시작한다.
 * 리렌더 없이 글자만 바꾼다 — 화면 낭독기는 움직이는 숫자 대신 최종 값만 읽는다.
 * 동작 줄이기면 바로 최종 값.
 */
export function CountUp({
  value,
  from = 0,
  delay = 0,
  duration = 800,
  className = "",
}: {
  value: number;
  from?: number;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (from === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = String(value);
      return;
    }
    let frame = 0;
    let timer = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        // 끝에서 천천히 멈추게
        const eased = 1 - (1 - t) ** 3;
        el.textContent = String(Math.round(from + (value - from) * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      timer = window.setTimeout(run, delay);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, from, delay, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      <span ref={ref} aria-hidden>
        {from}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
