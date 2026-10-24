"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { JourneyMap } from "@/components/map/JourneyMap";
import { SiteGlyph } from "@/components/map/SiteGlyph";
import { ChevronRight } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { ACTS, JOURNEY_DAYS, type ActNo } from "@/lib/journey/days";
import { LEGEND_SITES, SITES, type SiteId } from "@/lib/journey/locations";
import type { ChapterStatus, MapView } from "@/lib/journey/mapState";

type ViewMode = "map" | "list";

/** 여정 탭 본문: 지도/목록 전환, 장소를 누르면 장소 카드 */
export function JourneyExplorer({
  view,
  statuses,
  position,
  flagDay,
  avatarSeed,
  initialSite,
}: {
  view: MapView;
  statuses: ChapterStatus[];
  position: number;
  flagDay: number | null;
  avatarSeed: string;
  initialSite: SiteId;
}) {
  const [mode, setMode] = useState<ViewMode>("map");
  const [site, setSite] = useState<SiteId>(initialSite);

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-5">
        <h1 className="font-serif text-h1 font-bold tracking-[-0.04em] text-main">여정</h1>
        <div role="tablist" aria-label="보기 방식" className="flex rounded-[12px] bg-soft p-[3px]">
          {(["map", "list"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-11 rounded-[9px] px-3.5 text-small font-semibold ${
                mode === m ? "bg-surface text-main shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "text-mute"
              }`}
            >
              {m === "map" ? "지도" : "목록"}
            </button>
          ))}
        </div>
      </div>
      <p className="px-5 pt-1.5 text-sub text-mute">
        {view.me ? `${SITES.shittim.name}에서 ${SITES[view.me].name}까지, 지금까지 걸어온 길` : "싯딤에서 출발하는 24일의 길"}
      </p>

      {mode === "map" ? (
        <div>
          <div className="mx-gutter mt-4 overflow-hidden rounded-map bg-surface">
            <JourneyMap
              view={view}
              avatarSeed={avatarSeed}
              selected={site}
              onSelectSite={setSite}
              ariaLabel="여호수아 여정 지도. 장소를 누르면 아래에 장소 카드가 열려요"
              className="!h-auto"
            />
          </div>
          <p className="px-5 pt-2 text-center text-[11px] text-mid">{BRAND.mapCaption}</p>
          <ul className="flex flex-wrap gap-x-3.5 gap-y-2 px-[22px] pt-3 text-caption text-mute" aria-label="장소 아이콘">
            {LEGEND_SITES.map((id) => (
              <li key={id} className="flex items-center gap-1.5">
                <SiteGlyph id={id} size={16} className="text-main" />
                {SITES[id].scene}
              </li>
            ))}
          </ul>
          <PlaceCard site={site} statuses={statuses} flagDay={flagDay} />
        </div>
      ) : (
        <ChapterList statuses={statuses} position={position} flagDay={flagDay} avatarSeed={avatarSeed} />
      )}
    </>
  );
}

function statusTag(day: (typeof JOURNEY_DAYS)[number], st: ChapterStatus, flagDay: number | null) {
  if (st === "done") return <em className="rounded-chip bg-main px-2.5 py-1 text-caption font-bold text-white not-italic">읽음</em>;
  if (day.day === flagDay) return <em className="rounded-chip bg-soft px-2.5 py-1 text-caption font-bold text-main not-italic">오늘</em>;
  if (st === "open") return <em className="rounded-chip bg-soft px-2.5 py-1 text-caption font-bold text-main not-italic">읽을 차례</em>;
  return <em className="text-caption font-medium text-mid not-italic">{formatDate(day.readingDate)}</em>;
}

function PlaceCard({ site, statuses, flagDay }: { site: SiteId; statuses: ChapterStatus[]; flagDay: number | null }) {
  const s = SITES[site];
  const days = JOURNEY_DAYS.filter((d) => d.site === site);
  return (
    <section aria-live="polite" className="mx-gutter mt-3 mb-6 rounded-card bg-surface p-5">
      <div className="grid grid-cols-[52px_1fr] items-center gap-3.5">
        <span className="grid size-[52px] place-items-center rounded-btn bg-soft text-main">
          <SiteGlyph id={site} size={30} strokeWidth={1.7} />
        </span>
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-h2 font-bold tracking-[-0.04em] text-main">{s.name}</h2>
            <span className="text-[12.5px] font-bold text-mute">{days.length}개의 장</span>
          </div>
          <p className="mt-0.5 text-sub font-semibold text-mute">{s.scene}</p>
        </div>
      </div>
      <p className="mt-3.5 pb-1 text-[14px] leading-[1.65] text-text">{s.description}</p>
      <ul className="mt-3">
        {days.map((d) => (
          <li key={d.day} className="border-t border-soft first:border-t-0">
            <Link href={`/day/${d.day}`} className="grid min-h-11 grid-cols-[44px_1fr_auto] items-center py-2.5">
              <span className="text-small font-bold text-mute">{d.chapter}장</span>
              <b className="text-body font-semibold text-main">{d.title}</b>
              {statusTag(d, statuses[d.day - 1], flagDay)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChapterList({
  statuses,
  position,
  flagDay,
  avatarSeed,
}: {
  statuses: ChapterStatus[];
  position: number;
  flagDay: number | null;
  avatarSeed: string;
}) {
  return (
    <div className="pb-5">
      {(Object.keys(ACTS) as unknown as ActNo[]).map((act) => {
        const a = ACTS[act];
        const days = JOURNEY_DAYS.filter((d) => d.act === Number(act));
        return (
          <section key={act} aria-label={`ACT ${act} ${a.title}`}>
            <h2 className="flex justify-between px-6 pt-[22px] pb-2 text-small font-bold text-mute">
              <span>{a.short}</span>
              <span>
                {a.chapters[0]}–{a.chapters[1]}장
              </span>
            </h2>
            <ol className="mx-gutter rounded-[22px] bg-surface py-0.5">
              {days.map((d) => {
                const st = statuses[d.day - 1];
                return (
                  <li key={d.day} className="border-t border-soft first:border-t-0">
                    <Link href={`/day/${d.day}`} className="grid min-h-11 grid-cols-[56px_1fr_auto] items-center py-[13px] pr-4">
                      <span
                        className={`grid size-[30px] place-items-center justify-self-center rounded-full text-small font-bold ${
                          st === "done"
                            ? "bg-main text-white"
                            : st === "open"
                              ? "border-[1.5px] border-dashed border-main text-main"
                              : "text-mid shadow-[inset_0_0_0_1px_var(--color-line)]"
                        }`}
                      >
                        {d.day}
                      </span>
                      <span>
                        <b className={`block text-body ${st === "locked" ? "font-medium text-mid" : "font-semibold text-main"}`}>
                          {d.title}
                        </b>
                        <span className="mt-0.5 block text-[12.5px] text-mute">{d.place}</span>
                      </span>
                      {d.day === position ? (
                        <span className="flex items-center gap-1.5 rounded-chip bg-soft py-0.5 pr-2.5 pl-0.5 text-[11.5px] font-bold text-main">
                          <Avatar seed={avatarSeed} size={20} ring={false} />나
                        </span>
                      ) : d.day === flagDay ? (
                        <span className="rounded-chip bg-main px-2.5 py-1 text-[11.5px] font-bold text-white">오늘</span>
                      ) : st === "locked" ? (
                        <span className="text-caption text-mid">{formatDate(d.readingDate)}</span>
                      ) : (
                        <ChevronRight className="size-4 text-mid" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
