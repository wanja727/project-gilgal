"use server";

import { revalidatePath } from "next/cache";
import { completeDay, type CompleteDayResult } from "@/lib/data/progress";
import { requireMember } from "@/lib/data/viewer";
import { todayKst } from "@/lib/time";

/**
 * 읽기 완료. 입력은 dayNo 하나뿐이고 userId 는 세션에서 얻는다.
 * 공개 여부·범위 검증은 completeDay → checkDayAccess 에서 서버 기준 오늘(KST)로 다시 한다.
 */
export async function completeDayAction(dayNo: number): Promise<CompleteDayResult> {
  const member = await requireMember();
  const result = await completeDay(member.userId, dayNo, todayKst());
  if (result.status === "completed") {
    revalidatePath("/");
    revalidatePath("/journey");
  }
  return result;
}
