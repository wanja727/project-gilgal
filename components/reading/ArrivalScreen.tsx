"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { JourneyMap } from "@/components/map/JourneyMap";
import { buttonClass, CloseIcon } from "@/components/ui";
import { JOSHUA_2026 } from "@/lib/journey/campaign";
import type { JourneyDay } from "@/lib/journey/days";
import { goal, journeyProgress } from "@/lib/journey/guide";
import { cropAroundLeg, SITES } from "@/lib/journey/locations";
import { type MapView, previousSite, trail } from "@/lib/journey/mapState";

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
  avatarSeed,
  onClose,
  onShare,
}: {
  day: JourneyDay;
  completed: number[];
  arrival: { rank: number; total: number } | null;
  today: string;
  avatarSeed: string;
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
  const walked = trail(1, day.day);
  const view: MapView = {
    walked,
    visited: walked,
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
  const desc = [day.completion.body ?? day.summary, suffix].filter(Boolean).join(" ");

  const stats: [string, string][] = arrival
    ? [
        ["도착한 순서", `${arrival.rank}번째`],
        [p.phase === "reading" ? "오늘 함께 도착" : "함께 도착", `${arrival.total}명`],
      ]
    : [
        ["나의 여정", `${completed.length} / ${JOSHUA_2026.totalDays}`],
        p.flag ? ["깃발까지", `${p.unread.length}장`] : ["아직 걷지 않은 길", `${p.unread.length}개`],
      ];

  const shareButton = (variant: "main" | "line") => (
    <button type="button" onClick={onShare} className={buttonClass(variant)}>
      나눔 남기기
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
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-[max(env(safe-area-inset-top),18px)] right-[26px] z-[2] grid size-11 place-items-center rounded-full bg-surface text-main shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
      >
        <CloseIcon />
      </button>

      <div className="mx-gutter mt-[max(env(safe-area-inset-top),12px)] h-[300px] shrink-0 overflow-hidden rounded-[28px] bg-surface">
        <JourneyMap
          view={view}
          avatarSeed={avatarSeed}
          crop={cropAroundLeg(previousSite(day.day), day.site)}
          arrival={{ crossJordan: day.day === 3, from: previousSite(day.day) }}
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
        <p className="rise-in mt-2 text-body leading-[1.65] text-mute" style={{ animationDelay: "1.9s" }}>
          {desc}
        </p>
        <dl className="rise-in mt-5 grid grid-cols-2 gap-2" style={{ animationDelay: "2s" }}>
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-btn bg-surface px-4 py-3.5">
              <dt className="text-caption text-mute">{k}</dt>
              <dd className="mt-0.5 text-[19px] font-bold tracking-[-0.03em] text-main">{v}</dd>
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
        {p.finished ? (
          <>
            <Link href="/finale" className={buttonClass("main")}>
              나의 24일 돌아보기
            </Link>
            {shareButton("line")}
          </>
        ) : p.next ? (
          <>
            <Link href={`/day/${p.next.day}`} className={buttonClass("main")}>
              {p.next.day}장 이어 읽기
            </Link>
            {shareButton("line")}
          </>
        ) : (
          <>
            {shareButton("main")}
            <Link href="/" className={buttonClass("line")}>
              홈으로
            </Link>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
