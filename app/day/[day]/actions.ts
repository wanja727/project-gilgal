"use server";

import { revalidatePath } from "next/cache";
import { completeDay, getArrivalBoard, getCompletedDays } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { flagDay } from "@/lib/journey/mapState";
import { todayKst } from "@/lib/time";

export type CompleteDayResponse =
  | {
      status: "completed";
      day: number;
      /** 완료 후 내 기록 — 도착 화면의 진행도·지도 */
      completed: number[];
      /** 이 장이 오늘의 깃발이면 도착 순서 */
      arrival: { rank: number; total: number } | null;
    }
  | { status: "already" | "invalid_day" | "locked" };

/**
 * 읽기 완료. 입력은 dayNo 하나뿐이고 userId 는 세션에서 얻는다.
 * 공개 여부·범위 검증은 completeDay → checkDayAccess 에서 서버 기준 오늘(KST)로 다시 한다.
 * 도착 화면은 처음 완료했을 때(completed)만 띄우므로, 그때만 진행도와 순서를 함께 돌려준다.
 */
export async function completeDayAction(dayNo: number): Promise<CompleteDayResponse> {
  const member = await requireMember();
  const today = todayKst();
  const result = await completeDay(member.userId, dayNo, today);
  if (result.status !== "completed") return { status: result.status };

  revalidatePath("/");
  revalidatePath("/journey");
  revalidatePath("/me");
  const flag = flagDay(today);
  const [completed, board] = await Promise.all([
    getCompletedDays(member.userId),
    flag?.day === result.day ? getArrivalBoard(result.day, member.userId, 0) : null,
  ]);
  return {
    status: "completed",
    day: result.day,
    completed,
    arrival: board?.mine ? { rank: board.mine.rank, total: board.total } : null,
  };
}
