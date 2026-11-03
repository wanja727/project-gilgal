"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PLAYABLE_EFFECTS } from "@/components/map/MapEffects";
import { JourneyMap } from "@/components/map/JourneyMap";
import { CountUp } from "@/components/motion/CountUp";
import { buttonClass } from "@/components/ui";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import type { JourneyDay } from "@/lib/journey/days";
import { goal, journeyProgress } from "@/lib/journey/guide";
import { cropAroundLeg, SITES } from "@/lib/journey/locations";
import { legFrom, type MapView, revealedSites, routeTrail, trail } from "@/lib/journey/mapState";

/**
 * 도착 화면 — 읽기 완료를 처음 저장했을 때만 뜬다(다시 읽기·이미 완료한 장에서는 뜨지 않음).
 * 이전 장소 → 이번 장소로 길이 그려지고, 3장이면 가나안 경계 점선이 사라지며 영역이 채워진다.
 * 문구는 lib/journey 설정(도착 문구·장소 설명)에서만 가져온다.
 */
export function ArrivalScreen({
  day,
  completed,
  arrival,
  today,
  avatarKey,
  hasShare = false,
  onClose,
  onShare,
}: {
  day: JourneyDay;
  completed: number[];
  arrival: { rank: number; total: number } | null;
  today: string;
  avatarKey: string;
  /** 이 장에 이미 나눔을 남겼다 — 다시 읽은 뒤면 새로 쓰지 않고 내 나눔으로 */
  hasShare?: boolean;
  onClose: () => void;
  onShare: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try {
      navigator.vibrate?.(40);
    } catch {
      /* 진동 미지원 */
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const p = journeyProgress(completed, today);
  // 선은 길로 잇는 장(1~12장)까지만, 채운 아이콘은 지나온 모든 장소(ADR-038)
  const view: MapView = {
    walked: routeTrail(day.day),
    visited: trail(1, day.day),
    me: day.site,
    // 도착 장면은 이번 걸음에만 집중한다 — 깃발은 그리지 않는다(남은 장 수는 아래 문구로)
    flag: null,
    canaanFilled: p.done.has(3) && day.day !== 3,
  };

  const site = SITES[day.site];
  let suffix = "";
  if (!p.finished) {
    if (p.unread.length > 0) {
      suffix = p.flag ? `깃발까지 ${p.unread.length}장 남았어요.` : `아직 걷지 않은 길이 ${p.unread.length}개 남았어요.`;
    } else if (p.flag) {
      suffix = `오늘의 깃발에 닿았어요. ${goal(p).body}.`;
    }
  }
  // 순위 카드가 없을 때는 아래 숫자 카드(나의 여정·남은 길)가 같은 말을 하므로 남은 길 문장은 뺀다
  const desc = [day.completion.body, arrival ? suffix : null].filter(Boolean).join(" ");

  // [이름, 숫자, 뒤에 붙는 말] — 숫자는 카드가 떠오른 뒤 올라간다
  const stats: [string, number, string][] = arrival
    ? [
        ["도착한 순서", arrival.rank, "번째"],
        [p.phase === "reading" ? "오늘 함께 도착" : "함께 도착", arrival.total, "명"],
      ]
    : [
        ["나의 여정", completed.length, ` / ${JOSHUA_2026.totalDays}`],
        p.flag ? ["깃발까지", p.unread.length, "장"] : ["아직 걷지 않은 길", p.unread.length, "개"],
      ];

  const shareButton = (variant: "main" | "line") => (
    <button type="button" onClick={onShare} className={buttonClass(variant)}>
      {hasShare ? "내 나눔 보기" : "나눔 남기기"}
    </button>
  );

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="arrival-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 mx-auto flex max-w-md animate-[rise_.35s_ease-out] flex-col overflow-y-auto bg-bg outline-none"
    >
      <div className="mx-gutter mt-[max(env(safe-area-inset-top),12px)] h-[300px] shrink-0 overflow-hidden rounded-[28px] bg-surface">
        <JourneyMap
          view={view}
          avatarKey={avatarKey}
          crop={cropAroundLeg(legFrom(day.day), day.site)}
          arrival={{ crossJordan: day.day === 3, from: legFrom(day.day) }}
          // 사건 연출: 요단은 아바타가 건너기 전에 물이 멈추고, 여리고는 도착한 뒤 행렬이 돈다
          effect={
            day.mapEffect && PLAYABLE_EFFECTS.includes(day.mapEffect)
              ? { kind: day.mapEffect, key: `arrive-${day.day}`, delay: day.mapEffect === "cross-jordan" ? 0 : 1.9 }
              : null
          }
          revealed={revealedSites(today)}
          ariaLabel={`${day.chapter}장 완료: ${site.name}에 도착한 지도`}
        />
      </div>

      <div className="flex-1 px-[26px] pt-[26px]">
        <p className="rise-in text-sub font-semibold text-mute" style={{ animationDelay: "1.7s" }}>
          {JOSHUA_2026.book.name} {day.chapter}장 완료
        </p>
        <h2
          id="arrival-title"
          className="rise-in mt-1.5 font-serif text-[30px] leading-tight font-bold tracking-[-0.04em] text-main"
          style={{ animationDelay: "1.8s" }}
        >
          {day.completion.headline}
        </h2>
        {desc && (
          <p className="rise-in mt-2 text-body leading-[1.65] text-mute" style={{ animationDelay: "1.9s" }}>
            {desc}
          </p>
        )}
        <dl className="rise-in mt-5 grid grid-cols-2 gap-2" style={{ animationDelay: "2s" }}>
          {stats.map(([k, n, unit], i) => (
            <div key={k} className="rounded-btn bg-surface px-4 py-3.5">
              <dt className="text-caption text-mute">{k}</dt>
              <dd className="mt-0.5 text-[19px] font-bold tracking-[-0.03em] text-main">
                <CountUp value={n} delay={2150 + i * 120} duration={700} />
                {unit}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 떠오르기 전(8px 아래)의 버튼이 화면 높이를 넘어 스크롤바가 잠깐 생기지 않게 바깥에서 자른다 */}
      <div className="overflow-hidden">
      <div
        className="rise-in grid gap-2 px-5 pt-[18px] pb-[max(env(safe-area-inset-bottom),40px)]"
        style={{ animationDelay: "2.1s" }}
      >
        {/* 나눔이 먼저(읽은 직후 마음이 남아 있을 때), 다음 걸음은 그다음. 지도 위 닫기(X) 대신 맨 아래 "홈으로" —
            본문으로 돌아가는 길은 "나눔 남기기"가, 그냥 닫기는 Esc 가 맡는다(2026-10-29) */}
        {p.finished ? (
          <>
            <Link href="/finale" className={buttonClass("main")}>
              나의 24일 돌아보기
            </Link>
            {shareButton("line")}
          </>
        ) : (
          <>
            {shareButton("main")}
            {p.next && (
              <Link href={`/day/${p.next.day}`} className={buttonClass("line")}>
                {p.next.day}장 이어 읽기
              </Link>
            )}
          </>
        )}
        <Link href="/" className="mx-auto flex min-h-11 items-center px-4 text-small font-semibold text-mute">
          홈으로
        </Link>
      </div>
      </div>
    </div>
  );
}
