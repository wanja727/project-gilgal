"use client";

import { useState } from "react";
import { type CellRow, type PersonRow, pct } from "@/lib/admin/metrics";

const short = (d: string | null) => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8))}` : "—");

/**
 * 관리자 지표의 셀별·개인별 목록(ADR-036).
 * 개인별은 많이 읽은 사람부터(읽은 장 → 당일 읽음 순) 보여 준다.
 * "꾸준히 읽은 사람만"은 어제까지 열린 장을 모두 당일에 읽은 사람.
 * ("밀린 사람만" 거르기는 운영자가 쓰지 않아 2026-11-24 뺐다)
 */
export function AdminLists({ cells, people, openDays }: { cells: CellRow[]; people: PersonRow[]; openDays: number }) {
  const [tab, setTab] = useState<"cells" | "people">("cells");
  const [steadyOnly, setSteadyOnly] = useState(false);
  const [q, setQ] = useState("");

  const cellRows = [...cells].sort(
    (a, b) => Number(a.personal) - Number(b.personal) || pct(b.doneSum, b.doneMax) - pct(a.doneSum, a.doneMax),
  );
  const query = q.trim();
  const personRows = people
    .filter((p) => (!steadyOnly || p.steady) && (!query || p.name.includes(query) || p.cell.includes(query)))
    .sort((a, b) => b.done - a.done || b.onTime - a.onTime || a.name.localeCompare(b.name, "ko"));
  const steady = people.filter((p) => p.steady).length;

  return (
    <div>
      <div role="tablist" aria-label="목록" className="flex rounded-[12px] bg-soft p-[3px]">
        {(
          [
            ["cells", `셀별 ${cells.length}`],
            ["people", `개인별 ${people.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-9 flex-1 rounded-[10px] text-small font-semibold ${tab === key ? "bg-surface text-main shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "text-mute"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cells" ? (
        <ul className="mt-3 divide-y divide-line">
          {cellRows.map((c) => {
            const p = pct(c.doneSum, c.doneMax);
            return (
              <li key={c.cell} className="py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-small font-semibold text-main">
                    {c.cell}
                    <span className="ml-1.5 font-medium text-mute">{c.members}명</span>
                  </span>
                  <span className="shrink-0 text-caption text-mute tabular-nums">
                    {c.todayDone !== null && (
                      <>
                        오늘 <b className="font-bold text-main">{c.todayDone}</b>/{c.members}
                        <span className="mx-1.5 text-line">|</span>
                      </>
                    )}
                    진행 <b className="font-bold text-main">{p}%</b>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft" aria-hidden>
                  <div className="h-full rounded-full bg-main" style={{ width: `${p}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-mid tabular-nums">
                  열린 장을 모두 읽은 사람 {c.caughtUp}/{c.members}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름·셀 찾기"
              aria-label="이름이나 셀로 찾기"
              className="h-10 min-w-0 flex-1 rounded-[10px] bg-bg px-3 text-small text-text outline-none placeholder:text-mid focus-visible:outline-2 focus-visible:outline-main"
            />
            <button
              type="button"
              aria-pressed={steadyOnly}
              onClick={() => setSteadyOnly((v) => !v)}
              className={`h-10 shrink-0 rounded-chip px-3 text-caption font-semibold ${steadyOnly ? "bg-main text-surface" : "bg-soft text-mute"}`}
            >
              꾸준히 읽은 사람만 {steady}
            </button>
          </div>
          {steadyOnly && (
            <p className="mt-2 text-[11px] text-mid">어제까지 열린 장을 모두 그 장이 열린 날 읽은 사람이에요. 오늘의 장은 아직 안 읽어도 포함돼요.</p>
          )}
          {personRows.length === 0 ? (
            <p className="py-6 text-center text-small text-mute">
              {steadyOnly && !query ? "아직 꾸준히 읽은 사람이 없어요." : "찾는 사람이 없어요."}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {personRows.map((p, i) => (
                <li key={`${p.name}-${p.cell}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-small font-semibold text-main">
                      {p.name}
                      <span className="ml-1.5 font-medium text-mute">{p.cell}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-mid tabular-nums">
                      마지막 읽음 {short(p.lastRead)} · 마지막 방문 {short(p.lastVisit)}
                    </span>
                  </span>
                  <span className="shrink-0 text-small font-semibold text-mute tabular-nums">
                    <b className="font-bold text-main">{p.done}</b>/{openDays}장
                    <span className="mx-1.5 text-line">|</span>
                    당일 <b className="font-bold text-main">{p.onTime}</b>/{openDays}장
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
