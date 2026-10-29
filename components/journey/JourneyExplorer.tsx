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
import { EXPLORER_CROP, SITES, type SiteId } from "@/lib/journey/locations";
import { type ChapterStatus, type MapView, previousSite } from "@/lib/journey/mapState";

type ViewMode = "map" | "list";

/**
 * 여정 탭 본문: 지도/목록 전환.
 * 지도에서는 "여정 되짚기" — 장을 하나 고르면(◀ ▶, 눈금 끌기, 지도의 장소·같은 장소 칩 누르기) 그 장의 한 걸음
 * (이전 장소 → 이 장소)만 진하게 그려지고, 아래 장 카드에 그 장의 제목과 그 장소에서 있었던 일이 나온다.
 * 지도와 장 카드가 모바일 한 화면에 들어오게 지도 높이를 제한한다(2026-10-26).
 */
export function JourneyExplorer({
  view,
  statuses,
  position,
  flagDay,
  flagLabel,
  avatarKey,
  initialChapter,
}: {
  view: MapView;
  statuses: ChapterStatus[];
  position: number;
  flagDay: number | null;
  flagLabel: string | null;
  avatarKey: string;
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
          {/* 지도 높이 = 화면 높이 - (제목·장 카드·하단 탭 약 470px). 장 카드가 첫 화면에 다 들어오게.
              장소 아이콘 설명은 장 카드(아이콘 + 장소 이름)가 대신한다 */}
          <div className="mx-gutter mt-3 h-[clamp(240px,calc(100dvh-470px),440px)] overflow-hidden rounded-map bg-surface">
            <JourneyMap
              view={view}
              avatarKey={avatarKey}
              flagLabel={flagLabel}
              selected={site}
              crop={EXPLORER_CROP}
              fit="meet"
              leg={{
                from: previousSite(chapter),
                to: site,
                locked: statuses[chapter - 1] === "locked",
                key: String(chapter),
                prev: prevSite,
              }}
              onSelectSite={selectSite}
              ariaLabel={`여호수아 여정 지도. ${chapter}장의 길: ${SITES[previousSite(chapter)].name}에서 ${SITES[site].name}까지. 장소를 누르면 그 장소의 장으로 옮겨요. ${BRAND.mapCaption}`}
            />
          </div>
          <ChapterCard chapter={chapter} statuses={statuses} flagDay={flagDay} onChange={setChapter} />
        </div>
      ) : (
        <ChapterList statuses={statuses} position={position} flagDay={flagDay} avatarKey={avatarKey} />
      )}
    </>
  );
}

const STATUS_TEXT: Record<ChapterStatus, string> = { done: "읽음", open: "읽을 차례", locked: "아직 열리지 않음" };

/**
 * 장 카드 = 여정 되짚기 + 장소 카드 (2026-10-26 하나로 합침).
 * 장 순서대로 넘기며(◀ ▶, 눈금 끌기·누르기, 키보드 ←→) 그 장의 걸음·제목과 그 장소에서 있었던 일을 본다.
 * 눈금 위에 투명한 range 입력을 겹쳐 두어 키보드·스크린리더로도 움직일 수 있다.
 */
function ChapterCard({
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
  const place = SITES[day.site];
  const from = SITES[previousSite(chapter)].name;
  const samePlace = JOURNEY_DAYS.filter((d) => d.site === day.site);
  const arrow =
    "grid size-11 shrink-0 place-items-center rounded-full bg-soft text-main disabled:bg-transparent disabled:text-line";

  return (
    <section aria-label="여정 되짚기" className="mx-gutter mt-2 mb-4 rounded-card bg-surface px-3 pt-3 pb-3.5">
      <div className="flex items-center gap-2">
        <button type="button" className={arrow} disabled={chapter <= 1} onClick={() => onChange(chapter - 1)} aria-label="이전 장">
          <ChevronLeft />
        </button>
        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="truncate text-caption font-semibold text-mute">
            {chapter}장 · {from === place.name ? place.name : `${from} → ${place.name}`} ·{" "}
            {day.day === flagDay ? "오늘의 장" : st === "locked" ? `${formatDate(day.readingDate)}에 열려요` : STATUS_TEXT[st]}
          </p>
          <p className="mt-0.5 truncate font-serif text-[18px] font-bold tracking-[-0.03em] text-main">{day.title}</p>
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

      {/* 이 장에서 있었던 일 (장별 한 줄) */}
      <div className="mx-1 mt-2.5 flex gap-3 rounded-tile bg-bg px-3.5 py-3">
        <SiteGlyph id={day.site} size={22} strokeWidth={1.7} className="mt-0.5 shrink-0 text-main" />
        <p className="text-small leading-[1.6] text-text">
          <b className="font-bold text-main">{place.name}</b> {day.summary}
        </p>
      </div>

      <div className="relative mx-1 mt-1 h-9">
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

      <div className="mx-1 mt-1 flex items-center gap-2">
        {/* 같은 장소의 다른 장으로 바로 */}
        <div
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]"
          role="group"
          aria-label={`${place.name}의 장`}
        >
          {samePlace.length > 1 &&
            samePlace.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => onChange(d.day)}
                aria-current={d.day === chapter ? "true" : undefined}
                aria-label={`${d.chapter}장 ${d.title}`}
                className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-chip px-2 text-caption font-bold ${
                  d.day === chapter ? "bg-main text-white" : statuses[d.day - 1] === "locked" ? "bg-soft text-mid" : "bg-soft text-main"
                }`}
              >
                {d.chapter}
              </button>
            ))}
        </div>
        {st === "locked" ? (
          <span className="shrink-0 py-3 text-small text-mute">{formatDate(day.readingDate, true)}에 열려요</span>
        ) : (
          <Link
            href={`/day/${day.day}`}
            className="flex h-11 shrink-0 items-center justify-center rounded-btn bg-main px-5 text-small font-bold text-white active:scale-[0.985]"
          >
            {st === "done" ? `${day.chapter}장 다시 읽기` : `${day.chapter}장 읽기`}
          </Link>
        )}
      </div>
    </section>
  );
}

function ChapterList({
  statuses,
  position,
  flagDay,
  avatarKey,
}: {
  statuses: ChapterStatus[];
  position: number;
  flagDay: number | null;
  avatarKey: string;
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
                          <Avatar avatarKey={avatarKey} size={20} ring={false} />나
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
