import { CountUp } from "@/components/motion/CountUp";

/**
 * 카드 오른쪽 위 "12 / 40명 · 30%" — 오늘 본문(기준 장)을 읽은 사람 / 전체 인원(온보딩 완료).
 * 홈의 "오늘 N장까지 읽은 사람"과 셀 카드가 같은 모양으로 쓴다(2026-11-01).
 */
export function ReadRatio({ read, total }: { read: number; total: number }) {
  const pct = total > 0 ? Math.round((read / total) * 100) : 0;
  return (
    <span className="shrink-0 text-small font-semibold text-mute tabular-nums">
      <b className="font-bold text-main">
        <CountUp value={read} delay={150} />
      </b>{" "}
      / {total}명{total > 0 && (
        <>
          {" · "}
          <CountUp value={pct} delay={150} />%
        </>
      )}
    </span>
  );
}
