"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PLAYABLE_EFFECTS } from "@/components/map/MapEffects";
import { JourneyMap } from "@/components/map/JourneyMap";
import { SiteGlyph } from "@/components/map/SiteGlyph";
import { ChevronLeft, ChevronRight } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { ACTS, JOURNEY_DAYS, type ActNo } from "@/lib/journey/days";
import { EXPLORER_CROP, SITES, type SiteId } from "@/lib/journey/locations";
import { type ChapterStatus, type MapView, previousSite } from "@/lib/journey/mapState";

type ViewMode = "map" | "list";
const REVEAL_SEEN_KEY = "gilgal_reveal_seen";

/**
 * 여정 탭 본문: 지도/목록 전환.
 * 지도에서는 "여정 되짚기" — 장을 하나 고르면(◀ ▶, 눈금 끌기, 지도의 장소·같은 장소 칩 누르기) 그 장의 한 걸음
 * (이전 장소 → 이 장소)만 진하게 그려지고, 아래 장 카드에 그 장의 제목과 그 장소에서 있었던 일이 나온다.
 * 지도와 장 카드가 모바일 한 화면에 들어오게 지도 높이를 제한한다(2026-10-26).
 * [2026-11-01] 지도를 키웠다 — 제목 아래 설명 줄을 빼고, 장 카드의 같은 장소 칩 줄을 없애 읽기 버튼을 눈금 옆으로 올렸다.
 * 내 아바타도 고른 장의 장소로 함께 걸어간다(도착 화면의 걷기와 같은 방식).
 * [2026-11-01] 길은 그날 열린다: 지도에는 드러난 장소만, 장 카드·눈금은 열린 장까지만 움직이고, 목록도 열리기 전 장은 날짜만.
 * 그날 처음 지도를 보면 오늘 열린 장소가 톡 나타난다(기기에 날짜를 남겨 하루 한 번).
 */
export function JourneyExplorer({
  view,
  statuses,
  position,
  flagDay,
  flagLabel,
  avatarKey,
  initialChapter,
  revealed,
  today,
  revealDay,
}: {
  view: MapView;
  statuses: ChapterStatus[];
  position: number;
  flagDay: number | null;
  flagLabel: string | null;
  avatarKey: string;
  initialChapter: number;
  /** 지도에 드러난 장소(revealedSites) */
  revealed: SiteId[];
  today: string;
  /** 오늘 열린 장 */
  revealDay: number | null;
}) {
  // 열린 장 수 — 공개는 날짜순이라 1장부터 이만큼이 열려 있다. 그 뒤로는 고를 수 없다
  const lastOpen = statuses.filter((s) => s !== "locked").length;
  const [mode, setMode] = useState<ViewMode>("map");
  const [chapter, setChapterState] = useState(initialChapter);
  // 바로 전에 고른 장의 장소 — 지도에서 그 강조를 서서히 빼는 데 쓴다
  const [prevSite, setPrevSite] = useState<SiteId | null>(null);
  const site = JOURNEY_DAYS[chapter - 1].site;
  const setChapter = (want: number) => {
    const n = Math.min(Math.max(want, 1), Math.max(lastOpen, 1));
    if (n === chapter) return;
    setPrevSite(site);
    setChapterState(n);
  };

  // 그날 처음 지도를 볼 때 오늘 열린 장소를 톡 — 그리기 상태와 무관해 DOM 에 직접 붙인다
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== "map" || !revealDay) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(REVEAL_SEEN_KEY);
      localStorage.setItem(REVEAL_SEEN_KEY, today);
    } catch {}
    if (seen === today) return;
    const marker = mapRef.current?.querySelector<SVGGElement>(`[data-site="${JOURNEY_DAYS[revealDay - 1].site}"]`);
    marker?.classList.add("map-reveal");
  }, [mode, revealDay, today]);

  // 지도에서 장소를 누르면 그 장소의 (열린) 장 중 지금 고른 장에서 가장 가까운 장으로
  const selectSite = (id: SiteId) => {
    if (id === site) return;
    const candidates = JOURNEY_DAYS.filter((d) => d.site === id && d.day <= lastOpen);
    if (candidates.length === 0) return;
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

      {mode === "map" ? (
        <div>
          {/* 지도 높이 = 화면 높이 - (제목·장 카드·하단 탭 약 390px). 장 카드가 첫 화면에 다 들어오게.
              지도는 세로로 긴 그림이라 폭보다 높이가 크기를 정한다. 장소 아이콘 설명은 장 카드(아이콘 + 장소 이름)가 대신한다 */}
          <div ref={mapRef} className="mx-gutter mt-3 h-[clamp(260px,calc(100dvh-392px),620px)] overflow-hidden rounded-map bg-surface">
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
              walker={{ from: prevSite, to: site, key: String(chapter) }}
              effect={effectFor(chapter, statuses[chapter - 1] !== "locked")}
              revealed={revealed}
              onSelectSite={selectSite}
              ariaLabel={`여호수아 여정 지도. ${view.me ? `${SITES.shittim.name}에서 ${SITES[view.me].name}까지 걸어온 길. ` : ""}${lastOpen ? `${chapter}장의 길: ${SITES[previousSite(chapter)].name}에서 ${SITES[site].name}까지. ` : ""}장소를 누르면 그 장소의 장으로 옮겨요. ${BRAND.mapCaption}`}
            />
          </div>
          <ChapterCard chapter={chapter} statuses={statuses} flagDay={flagDay} lastOpen={lastOpen} onChange={setChapter} />
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
 * [2026-11-01] 같은 장소 칩 줄은 지도를 키우려고 없앴다(지도에서 장소를 누르면 그 장소의 가까운 장으로 간다).
 * 눈금 위에 투명한 range 입력을 겹쳐 두어 키보드·스크린리더로도 움직일 수 있다.
 * 열린 장(lastOpen)까지만 고를 수 있다. 출발 전에는(열린 장 없음) 첫 길이 언제 열리는지만 보여 준다.
 */
function ChapterCard({
  chapter,
  statuses,
  flagDay,
  lastOpen,
  onChange,
}: {
  chapter: number;
  statuses: ChapterStatus[];
  flagDay: number | null;
  lastOpen: number;
  onChange: (n: number) => void;
}) {
  const day = JOURNEY_DAYS[chapter - 1];
  const st = statuses[chapter - 1];
  const total = JOURNEY_DAYS.length;
  const place = SITES[day.site];
  const from = SITES[previousSite(chapter)].name;
  const arrow =
    "grid size-11 shrink-0 place-items-center rounded-full bg-soft text-main disabled:bg-transparent disabled:text-line";
  const hidden = st === "locked";

  return (
    <section aria-label="여정 되짚기" className="mx-gutter mt-2 mb-4 rounded-card bg-surface px-3 pt-3 pb-3.5">
      <div className="flex items-center gap-2">
        <button type="button" className={arrow} disabled={chapter <= 1} onClick={() => onChange(chapter - 1)} aria-label="이전 장">
          <ChevronLeft />
        </button>
        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="truncate text-caption font-semibold text-mute">
            {hidden
              ? `${chapter}장 · 출발 전`
              : `${chapter}장 · ${from === place.name ? place.name : `${from} → ${place.name}`} · ${day.day === flagDay ? "오늘의 장" : STATUS_TEXT[st]}`}
          </p>
          <p className="mt-0.5 truncate font-serif text-[18px] font-bold tracking-[-0.03em] text-main">
            {hidden ? "아직 열리지 않은 길" : day.title}
          </p>
        </div>
        <button
          type="button"
          className={arrow}
          disabled={chapter >= lastOpen}
          onClick={() => onChange(chapter + 1)}
          aria-label="다음 장"
        >
          <ChevronRight className="size-[22px]" />
        </button>
      </div>

      {/* 이 장에서 있었던 일 (장별 한 줄) */}
      <div className="mx-1 mt-2.5 flex gap-3 rounded-tile bg-bg px-3.5 py-3">
        {hidden ? (
          <p className="text-small leading-[1.6] text-mute">
            {formatDate(day.readingDate, true)}, {SITES.shittim.name}에서 첫 길이 열려요. 어디로 가는지는 그날그날 열려요.
          </p>
        ) : (
          <>
            <SiteGlyph id={day.site} size={22} strokeWidth={1.7} className="mt-0.5 shrink-0 text-main" />
            <p className="text-small leading-[1.6] text-text">
              <b className="font-bold text-main">{place.name}</b> {day.summary}
            </p>
          </>
        )}
      </div>

      {/* 눈금(장 고르기) + 읽기 버튼 한 줄 — 같은 장소의 다른 장은 지도에서 그 장소를 누르거나 눈금으로 */}
      <div className="mx-1 mt-2 flex items-center gap-3">
        <div className="relative h-10 min-w-0 flex-1">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 grid -translate-y-1/2 grid-cols-[repeat(24,minmax(0,1fr))] items-center gap-[2px]"
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
            aria-valuetext={hidden ? `${chapter}장, ${STATUS_TEXT[st]}` : `${chapter}장 ${day.title}, ${STATUS_TEXT[st]}`}
            disabled={lastOpen < 2}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        {st === "locked" ? (
          <span className="shrink-0 text-caption text-mute">{formatDate(day.readingDate, true)}에 열려요</span>
        ) : (
          <Link
            href={`/day/${day.day}`}
            className="flex h-10 shrink-0 items-center justify-center rounded-btn bg-main px-4 text-small font-bold text-white active:scale-[0.985]"
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
                          {st === "locked" ? "아직 열리지 않은 길" : d.title}
                        </b>
                        {st !== "locked" && <span className="mt-0.5 block text-[12.5px] text-mute">{d.place}</span>}
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

/** 고른 장의 사건 연출 — 열린 장이고 연출이 준비된 장만(MapEffects) */
function effectFor(chapter: number, open: boolean) {
  const kind = JOURNEY_DAYS[chapter - 1].mapEffect;
  if (!open || !kind || !PLAYABLE_EFFECTS.includes(kind)) return null;
  // 요단은 아바타가 건너는 동안 물이 멈춰 있어야 해서 바로, 나머지는 길(0.6초)이 다 그려진 뒤
  return { kind, key: String(chapter), delay: kind === "cross-jordan" ? 0 : 0.65 };
}
