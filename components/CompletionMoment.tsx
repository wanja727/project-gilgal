"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import type { JourneyDay } from "@/lib/journey/days";
import { positionAfterDay, type MapState } from "@/lib/journey/mapState";
import { JourneyMap } from "./JourneyMap";

/**
 * 읽기 완료 연출 (Phase 1, architecture 8.6): 설정 파일의 완료 메시지 + 지도 마커 한 칸 이동 + 짧은 진동.
 * 방금 완료한 경우에만 띄운다(새로고침·재방문 시 다시 나오지 않음).
 * 마커는 "이 장 직전 지점 → 이 장을 마친 지점"으로 움직인다. 앞 장을 나중에 완료해도
 * 그 장의 한 걸음이 보이도록, 내 전체 위치(가장 멀리 간 DAY)와는 따로 계산한다.
 */
export function CompletionMoment({
  day,
  mapAfter,
  avatarSeed,
  onClose,
}: {
  day: JourneyDay;
  mapAfter: MapState;
  avatarSeed: string;
  onClose: () => void;
}) {
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    // 한 프레임 뒤 마커를 옮겨 transition 이 보이게 한다
    const t = setTimeout(() => setMoved(true), 350);
    try {
      navigator.vibrate?.(40);
    } catch {
      /* 진동 미지원 */
    }
    return () => clearTimeout(t);
  }, []);

  const { emoji, headline, body } = day.completion;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="읽기 완료"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 px-4 pb-6 backdrop-blur-[2px] sm:items-center"
    >
      <div className="w-full max-w-md animate-[rise_.45s_ease-out] rounded-3xl bg-card p-6 shadow-xl">
        <div className="text-center">
          {emoji && <div className="text-4xl">{emoji}</div>}
          <p className="mt-3 font-serif text-xl font-semibold text-olive-deep">{headline}</p>
          <p className="mt-2 text-sm leading-6 whitespace-pre-line text-ink-soft">
            {body ?? BRAND.completionBody}
          </p>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-line">
          <JourneyMap state={mapAfter} avatarSeed={avatarSeed} markerAt={positionAfterDay(moved ? day.day : day.day - 1)} compact />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line py-3 text-sm text-ink-soft active:scale-[0.98]"
          >
            닫기
          </button>
          <Link
            href="/journey"
            className="rounded-xl bg-olive py-3 text-center text-sm font-semibold text-white active:scale-[0.98]"
          >
            여정 지도 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
