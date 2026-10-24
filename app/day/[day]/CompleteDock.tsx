"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ArrivalScreen } from "@/components/reading/ArrivalScreen";
import { buttonClass } from "@/components/ui";
import type { JourneyDay } from "@/lib/journey/days";
import { type CompleteDayResponse, completeDayAction } from "./actions";

/**
 * 본문 화면 아래에 고정된 "N장 읽기 완료" 버튼.
 * 처음 완료가 저장된 경우에만 도착 화면을 띄우고, 이미 읽은 장이면 다음 걸음으로 이어 준다.
 */
export function CompleteDock({
  day,
  initiallyDone,
  after,
  today,
  avatarSeed,
}: {
  day: JourneyDay;
  initiallyDone: boolean;
  /** 이미 읽은 장일 때 버튼: 다음에 읽을 장 또는 홈 */
  after: { label: string; href: string };
  today: string;
  avatarSeed: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyDone);
  const [arrived, setArrived] = useState<Extract<CompleteDayResponse, { status: "completed" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onComplete = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await completeDayAction(day.day);
        if (result.status === "completed") {
          setDone(true);
          setArrived(result);
        } else if (result.status === "already") {
          // 다른 기기에서 이미 완료 — 도착 화면 없이 상태만 맞춘다
          setDone(true);
          router.refresh();
        } else {
          setError(result.status === "locked" ? "아직 열리지 않은 장이에요." : "잘못된 요청이에요.");
        }
      } catch {
        setError("저장하지 못했어요. 잠시 후 다시 눌러 주세요.");
      }
    });
  };

  const close = useCallback(() => {
    setArrived(null);
    router.refresh();
  }, [router]);

  const share = useCallback(() => {
    setArrived(null);
    router.refresh();
    requestAnimationFrame(() => {
      document.getElementById("share")?.scrollIntoView({ behavior: "smooth" });
      document.getElementById(`compose-${day.day}`)?.focus({ preventScroll: true });
    });
  }, [router, day.day]);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-bg px-gutter pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
        {error && (
          <p role="alert" className="mb-2 text-center text-caption text-main">
            {error}
          </p>
        )}
        {done ? (
          <Link href={after.href} className={buttonClass("line")}>
            <span aria-hidden>✓</span> {day.chapter}장 읽음 · {after.label}
          </Link>
        ) : (
          <button type="button" onClick={onComplete} disabled={pending} className={buttonClass("main")}>
            {pending ? "기록하는 중…" : `${day.chapter}장 읽기 완료`}
          </button>
        )}
      </div>
      {arrived && (
        <ArrivalScreen
          day={day}
          completed={arrived.completed}
          arrival={arrived.arrival}
          today={today}
          avatarSeed={avatarSeed}
          onClose={close}
          onShare={share}
        />
      )}
    </>
  );
}
