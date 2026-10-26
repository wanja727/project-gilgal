"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { JourneyMap } from "@/components/map/JourneyMap";
import { SiteGlyph } from "@/components/map/SiteGlyph";
import { ChevronLeft, ChevronRight } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { ACTS, JOURNEY_DAYS, type ActNo } from "@/lib/journey/days";
import { LEGEND_SITES, SITES, type SiteId } from "@/lib/journey/locations";
import { type ChapterStatus, type MapView, previousSite } from "@/lib/journey/mapState";

type ViewMode = "map" | "list";

/**
 * 여정 탭 본문: 지도/목록 전환.
 * 지도에서는 "여정 되짚기" — 장을 하나 고르면(◀ ▶, 눈금 끌기, 장소·장 목록 누르기) 그 장의 한 걸음
 * (이전 장소 → 이 장소)만 진하게 그려지고, 아래 장소 카드가 같은 장소로 바뀐다.
 */
export function JourneyExplorer({
  view,
  statuses,
  position,
  flagDay,
  flagLabel,
  avatarSeed,
  initialChapter,
}: {
  view: MapView;
  statuses: ChapterStatus[];
  position: number;
  flagDay: number | null;
  flagLabel: string | null;
  avatarSeed: string;
  initialChapter: number;
}) {
  const [mode, setMode] = useState<ViewMode>("map");
  const [chapter, setChapterState] = useState(initialChapter);
  // 바로 전에 고른 장의 장소 — 지도에서 그 강조를 서서히 빼는 데 쓴다
  const [prevSite, setPrevSite] = useState<SiteId | null>(null);
  const site = JOURNEY_DAYS[chapter - 1].site;
  const setChapter = (n: number) => {
    if (n === chapter) return;
    setPrevSite(site);
    setChapterState(n);
  };

  // 지도에서 장소를 누르면 그 장소의 장 중 지금 고른 장에서 가장 가까운 장으로
  const selectSite = (id: SiteId) => {
    if (id === site) return;
    const candidates = JOURNEY_DAYS.filter((d) => d.site === id);
    const nearest = candidates.reduce((a, b) => (Math.abs(b.day - chapter) < Math.abs(a.day - chapter) ? b : a));
    setChapter(nearest.day);
  };

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
              flagLabel={flagLabel}
              selected={site}
              leg={{
                from: previousSite(chapter),
                to: site,
                locked: statuses[chapter - 1] === "locked",
                key: String(chapter),
                prev: prevSite,
              }}
              onSelectSite={selectSite}
              ariaLabel={`여호수아 여정 지도. ${chapter}장의 길: ${SITES[previousSite(chapter)].name}에서 ${SITES[site].name}까지. 장소를 누르면 그 장소의 장으로 옮겨요`}
              className="!h-auto"
            />
          </div>
          {/* 아이콘 설명은 지도 바로 아래 — 지도를 보며 바로 읽히게 */}
          <ul className="flex flex-wrap gap-x-3.5 gap-y-2 px-[22px] pt-3 text-caption text-mute" aria-label="장소 아이콘">
            {LEGEND_SITES.map((id) => (
              <li key={id} className="flex items-center gap-1.5">
                <SiteGlyph id={id} size={16} className="text-main" />
                {SITES[id].scene}
              </li>
            ))}
          </ul>
          <p className="px-5 pt-2 text-center text-[11px] text-mid">{BRAND.mapCaption}</p>
          <ChapterStepper chapter={chapter} statuses={statuses} flagDay={flagDay} onChange={setChapter} />
          <PlaceCard site={site} chapter={chapter} statuses={statuses} flagDay={flagDay} onSelect={setChapter} />
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

const STATUS_TEXT: Record<ChapterStatus, string> = { done: "읽음", open: "읽을 차례", locked: "아직 열리지 않음" };

/**
 * 여정 되짚기: ◀ ▶ 로 한 장씩, 아래 눈금을 끌거나 눌러 원하는 장으로.
 * 눈금 위에 투명한 range 입력을 겹쳐 두어 키보드(←→)·스크린리더로도 움직일 수 있다.
 */
function ChapterStepper({
  chapter,
  statuses,
  flagDay,
  onChange,
}: {
  chapter: number;
  statuses: ChapterStatus[];
  flagDay: number | null;
  onChange: (n: number) => void;
}) {
  const day = JOURNEY_DAYS[chapter - 1];
  const st = statuses[chapter - 1];
  const total = JOURNEY_DAYS.length;
  const from = SITES[previousSite(chapter)].name;
  const to = SITES[day.site].name;
  const arrow =
    "grid size-11 shrink-0 place-items-center rounded-full bg-soft text-main disabled:bg-transparent disabled:text-line";

  return (
    <section aria-label="여정 되짚기" className="mx-gutter mt-3 rounded-card bg-surface px-3 pt-3 pb-4">
      <div className="flex items-center gap-2">
        <button type="button" className={arrow} disabled={chapter <= 1} onClick={() => onChange(chapter - 1)} aria-label="이전 장">
          <ChevronLeft />
        </button>
        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="text-caption font-semibold text-mute">
            {chapter}장 · {from === to ? to : `${from} → ${to}`}
          </p>
          <p className="mt-0.5 truncate font-serif text-[18px] font-bold tracking-[-0.03em] text-main">{day.title}</p>
          <p className="mt-0.5 text-caption text-mute">
            {day.day === flagDay ? "오늘의 장" : st === "locked" ? `${formatDate(day.readingDate)}에 열려요` : STATUS_TEXT[st]}
          </p>
        </div>
        <button
          type="button"
          className={arrow}
          disabled={chapter >= total}
          onClick={() => onChange(chapter + 1)}
          aria-label="다음 장"
        >
          <ChevronRight className="size-[22px]" />
        </button>
      </div>

      <div className="relative mx-1 mt-2 h-11">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 grid -translate-y-1/2 grid-cols-[repeat(24,minmax(0,1fr))] items-center gap-[3px]"
          aria-hidden
        >
          {statuses.map((s, i) => (
            <span
              key={i}
              className={`block rounded-full transition-all ${i + 1 === chapter ? "h-4" : "h-1.5"} ${
                s === "done" ? "bg-main" : s === "open" ? "bg-mid" : "bg-soft"
              } ${i + 1 === chapter ? "shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-main)]" : ""}`}
            />
          ))}
        </div>
        <input
          type="range"
          min={1}
          max={total}
          step={1}
          value={chapter}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="장 고르기"
          aria-valuetext={`${chapter}장 ${day.title}, ${STATUS_TEXT[st]}`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="mx-1 flex justify-between text-[11px] text-mid" aria-hidden>
        <span>1장</span>
        <span>24장</span>
      </div>

      <div className="mt-3 px-1">
        {st === "locked" ? (
          <p className="py-2 text-center text-small text-mute">이 장은 {formatDate(day.readingDate, true)}에 열려요</p>
        ) : (
          <Link
            href={`/day/${day.day}`}
            className="flex h-12 items-center justify-center rounded-btn bg-main text-body font-bold text-white active:scale-[0.985]"
          >
            {st === "done" ? `${day.chapter}장 다시 읽기` : `${day.chapter}장 읽기`}
          </Link>
        )}
      </div>
    </section>
  );
}

function PlaceCard({
  site,
  chapter,
  statuses,
  flagDay,
  onSelect,
}: {
  site: SiteId;
  chapter: number;
  statuses: ChapterStatus[];
  flagDay: number | null;
  onSelect: (n: number) => void;
}) {
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
      {/* 장을 누르면 위 지도와 되짚기가 그 장으로 옮겨 간다 */}
      <ul className="mt-3">
        {days.map((d) => (
          <li key={d.day} className="border-t border-soft first:border-t-0">
            <button
              type="button"
              onClick={() => onSelect(d.day)}
              aria-current={d.day === chapter ? "true" : undefined}
              className={`-mx-2 grid min-h-11 w-[calc(100%+16px)] grid-cols-[44px_1fr_auto] items-center rounded-[12px] px-2 py-2.5 text-left ${
                d.day === chapter ? "bg-soft" : ""
              }`}
            >
              <span className="text-small font-bold text-mute">{d.chapter}장</span>
              <b className="text-body font-semibold text-main">{d.title}</b>
              {statusTag(d, statuses[d.day - 1], flagDay)}
            </button>
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
