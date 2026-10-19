import Link from "next/link";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import type { IsoDate } from "@/lib/time";

/**
 * 나의 24일 — 완료/아직 걷지 않은 길/아직 열리지 않은 길.
 * 열리지 않은 DAY 는 링크를 만들지 않는다(서버도 별도로 막는다).
 */
export function ProgressDots({ completed, today }: { completed: number[]; today: IsoDate }) {
  const done = new Set(completed);
  return (
    <ol className="grid grid-cols-8 gap-2">
      {JOURNEY_DAYS.map((d) => {
        const unlocked = d.readingDate <= today;
        const isDone = done.has(d.day);
        const isToday = d.readingDate === today;
        const cls = isDone
          ? "bg-olive text-white border-olive"
          : unlocked
            ? "bg-card text-olive-deep border-olive/50 border-dashed"
            : "bg-transparent text-stone/50 border-line";
        const dot = (
          <span
            className={`flex aspect-square w-full items-center justify-center rounded-full border text-[11px] font-medium ${cls} ${isToday ? "ring-2 ring-clay/60 ring-offset-1 ring-offset-paper" : ""}`}
          >
            {d.day}
          </span>
        );
        return (
          <li key={d.day}>
            {unlocked ? (
              <Link href={`/day/${d.day}`} aria-label={`DAY ${d.day} ${d.title}${isDone ? " (완료)" : ""}`}>
                {dot}
              </Link>
            ) : (
              <span aria-label={`DAY ${d.day} 아직 열리지 않음`}>{dot}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
