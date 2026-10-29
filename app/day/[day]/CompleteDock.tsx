"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ArrivalScreen } from "@/components/reading/ArrivalScreen";
import { DockComposer } from "@/components/share/CommentComposer";
import { buttonClass } from "@/components/ui";
import type { JourneyDay } from "@/lib/journey/days";
import { type CompleteDayResponse, completeDayAction } from "./actions";

/**
 * 본문이 끝나는 자리의 "N장 읽기 완료" 버튼. 읽는 도중에 누를 일이 없어 화면 아래에 고정하지 않는다(2026-10-26).
 * 처음 완료가 저장된 경우에만 도착 화면을 띄우고, 이미 읽은 장이면 다음 걸음으로 이어 준다.
 * 도착 화면의 "나눔 남기기" → 도착 화면이 닫히고 화면 아래 입력창(DockComposer)이 떠서 본문을 다시 보며 쓴다 →
 * 남기면 입력창이 닫히고 본문 아래 나눔 목록으로 내려간다(2026-10-29).
 */
export function CompleteDock({
  day,
  initiallyDone,
  after,
  today,
  avatarKey,
  commentMaxLength,
}: {
  day: JourneyDay;
  initiallyDone: boolean;
  /** 이미 읽은 장일 때 버튼: 다음에 읽을 장 또는 홈 */
  after: { label: string; href: string };
  today: string;
  avatarKey: string;
  commentMaxLength: number;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyDone);
  const [arrived, setArrived] = useState<Extract<CompleteDayResponse, { status: "completed" }> | null>(null);
  const [composing, setComposing] = useState(false);
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
    setComposing(true);
    router.refresh();
  }, [router]);

  const closeComposer = useCallback(() => setComposing(false), []);
  const posted = useCallback(() => {
    setComposing(false);
    // 방금 남긴 나눔이 최신순 맨 위에 — 이어서 다른 동행자 나눔을 읽게 목록으로 내려간다
    requestAnimationFrame(() => document.getElementById("share")?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  return (
    <>
      <div className="px-gutter pt-8 pb-2">
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
          avatarKey={avatarKey}
          onClose={close}
          onShare={share}
        />
      )}
      {composing && (
        <DockComposer
          dayNo={day.day}
          chapter={day.chapter}
          maxLength={commentMaxLength}
          onClose={closeComposer}
          onPosted={posted}
        />
      )}
    </>
  );
}
