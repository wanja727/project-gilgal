import { CountUp } from "@/components/motion/CountUp";

/**
 * 카드 오른쪽 위 "12/40명 [30%]" — 오늘 본문(기준 장)을 읽은 사람 / 전체 인원(온보딩 완료).
 * 홈의 "오늘 N장까지 읽은 사람"과 셀 카드가 같은 모양으로 쓴다(2026-11-01).
 * 숫자 두 덩어리가 섞이지 않게 구분 점 대신 퍼센트를 옅은 칩에 담는다.
 */
export function ReadRatio({ read, total }: { read: number; total: number }) {
  const pct = total > 0 ? Math.round((read / total) * 100) : 0;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-small font-semibold text-mute tabular-nums">
      <span>
        <b className="font-bold text-main">
          <CountUp value={read} delay={150} />
        </b>
        /{total}명
      </span>
      {total > 0 && (
        <span className="rounded-chip bg-soft px-2 py-0.5 text-caption font-bold text-main">
          <CountUp value={pct} delay={150} />%
        </span>
      )}
    </span>
  );
}
