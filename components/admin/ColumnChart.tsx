"use client";

import { useState } from "react";

export type Column = {
  key: string;
  /** 막대 아래 눈금 글자 */
  tick: string;
  /** 누르면 차트 위에 보이는 설명 */
  label: string;
  /** 뒤쪽(옅은) 막대 — 예: 방문자. 없으면 한 계열 */
  back?: number;
  /** 앞쪽(진한) 막대 — 예: 읽은 사람 */
  front: number;
  /** 강조할 막대(오늘) */
  mark?: boolean;
};

/**
 * 관리자 지표의 세로 막대(ADR-036). 휴대폰에서도 값을 보도록 막대를 누르면 그 값을 차트 위에 보여 준다(처음엔 마지막 막대).
 * 두 계열이면 뒤에 옅은 막대(전체, 예: 방문)를 두고 앞에 진한 막대(그 안의 일부, 예: 읽음)를 겹친다 —
 * 읽은 사람은 그날 들어온 사람이라 "방문 중 읽음"으로 한 막대에서 읽힌다. 색만으로 구분하지 않게 범례와 숫자를 함께 둔다.
 */
export function ColumnChart({
  columns,
  legend,
  ariaLabel,
}: {
  columns: Column[];
  /** [뒤 막대 이름, 앞 막대 이름] 또는 [앞 막대 이름] */
  legend: [string, string] | [string];
  ariaLabel: string;
}) {
  const [picked, setPicked] = useState(columns.length - 1);
  if (columns.length === 0) return <p className="py-6 text-center text-small text-mute">아직 기록이 없어요.</p>;
  const max = Math.max(1, ...columns.map((c) => Math.max(c.back ?? 0, c.front)));
  const cur = columns[Math.min(picked, columns.length - 1)];
  const two = legend.length === 2;

  return (
    <figure aria-label={ariaLabel}>
      <figcaption className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-caption text-mute" aria-live="polite">
        <b className="font-semibold text-main">{cur.label}</b>
        {two && (
          <span className="flex items-center gap-1">
            <i className="inline-block size-2 rounded-[2px] bg-water" aria-hidden />
            {legend[0]} <b className="font-bold text-main tabular-nums">{cur.back ?? 0}</b>
          </span>
        )}
        <span className="flex items-center gap-1">
          <i className="inline-block size-2 rounded-[2px] bg-main" aria-hidden />
          {legend[two ? 1 : 0]} <b className="font-bold text-main tabular-nums">{cur.front}</b>
        </span>
      </figcaption>
      <div className="-mx-1 mt-2 overflow-x-auto px-1">
        <div className="flex h-28 items-end gap-[3px]" style={{ minWidth: columns.length * 13 }}>
          {columns.map((c, i) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setPicked(i)}
              aria-pressed={i === picked}
              aria-label={`${c.label}: ${two ? `${legend[0]} ${c.back ?? 0}, ` : ""}${legend[two ? 1 : 0]} ${c.front}`}
              // 막대보다 넓은 누르는 자리 — 칸 전체
              className="relative flex h-full min-w-[10px] flex-1 items-end justify-center"
            >
              {two && (
                <span
                  className={`absolute bottom-0 w-full rounded-t-[4px] bg-water ${i === picked ? "" : "opacity-70"}`}
                  style={{ height: `${((c.back ?? 0) / max) * 100}%` }}
                />
              )}
              <span
                className={`relative w-full rounded-t-[4px] ${two ? "mx-[2px]" : ""} ${i === picked ? "bg-main" : "bg-main-2/80"}`}
                style={{ height: `${(c.front / max) * 100}%`, minHeight: c.front > 0 ? 2 : 0 }}
              />
            </button>
          ))}
        </div>
        <div className="mt-1 flex gap-[3px] border-t border-line pt-1" style={{ minWidth: columns.length * 13 }} aria-hidden>
          {columns.map((c, i) => (
            <span
              key={c.key}
              className={`min-w-[10px] flex-1 overflow-visible text-center text-[9.5px] whitespace-nowrap tabular-nums ${c.mark || i === picked ? "font-bold text-main" : "text-mid"}`}
            >
              {/* 칸이 좁아 두 자리 눈금이 겹치지 않게 — 많으면 하나 걸러, 오늘·고른 막대는 늘 */}
              {columns.length <= 16 || i % 2 === 0 || c.mark || i === picked ? c.tick : ""}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
