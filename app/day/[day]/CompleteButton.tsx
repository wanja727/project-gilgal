"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CompletionMoment } from "@/components/CompletionMoment";
import type { JourneyDay } from "@/lib/journey/days";
import { mapState } from "@/lib/journey/mapState";
import { completeDayAction } from "./actions";

/** 본문 끝의 읽기 완료 버튼. 이미 완료한 장이면 완료 상태만 보여 준다. */
export function CompleteButton({
  day,
  initiallyDone,
  completedDays,
  avatarSeed,
}: {
  day: JourneyDay;
  initiallyDone: boolean;
  completedDays: number[];
  avatarSeed: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyDone);
  const [showMoment, setShowMoment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onComplete = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await completeDayAction(day.day);
        if (result.status === "completed") {
          setDone(true);
          setShowMoment(true);
        } else if (result.status === "already") {
          setDone(true);
        } else {
          setError(result.status === "locked" ? "아직 열리지 않은 장이에요." : "잘못된 요청이에요.");
        }
      } catch {
        setError("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
      }
    });
  };

  return (
    <>
      {done ? (
        <div className="rounded-2xl border border-olive/30 bg-olive-soft/50 px-4 py-4 text-center">
          <p className="text-sm font-semibold text-olive-deep">✓ 함께 걸은 길이에요</p>
          <p className="mt-1 text-xs text-ink-soft">{day.completion.headline}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={onComplete}
          disabled={pending}
          className="w-full rounded-2xl bg-olive py-4 text-[15px] font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "기록하는 중…" : "읽기 완료"}
        </button>
      )}
      {error && <p className="mt-2 text-center text-xs text-clay">{error}</p>}
      {showMoment && (
        <CompletionMoment
          day={day}
          mapAfter={mapState([...completedDays, day.day])}
          avatarSeed={avatarSeed}
          onClose={() => {
            setShowMoment(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
