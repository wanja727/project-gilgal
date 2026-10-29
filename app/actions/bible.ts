"use server";

import { getJoshuaChapter } from "@/lib/bible";
import type { Verse } from "@/lib/bible/types";
import { requireMember } from "@/lib/data/viewer";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { checkDayAccess } from "@/lib/journey/schedule";
import { isValidVerseRef, type VerseRef } from "@/lib/share/verseRef";
import { todayKst } from "@/lib/time";

export type VersesResult =
  | { status: "ok"; verses: Verse[]; attribution: string; dayNo: number }
  | { status: "invalid" | "locked" | "unavailable" };

/**
 * 나눔 속 구절 표기를 눌렀을 때 그 절 본문(팝업). 본문 화면과 같은 Provider·공개 규칙을 따른다 —
 * 아직 열리지 않은 장의 구절은 나눔에 적혀 있어도 내보내지 않는다.
 */
export async function getVersesAction(ref: VerseRef): Promise<VersesResult> {
  await requireMember();
  if (!ref || typeof ref !== "object" || !isValidVerseRef(ref)) return { status: "invalid" };
  const day = JOURNEY_DAYS.find((d) => d.chapter === ref.chapter);
  if (!day) return { status: "invalid" };
  const access = checkDayAccess(day.day, todayKst());
  if (!access.ok) return { status: access.reason === "locked" ? "locked" : "invalid" };

  const text = await getJoshuaChapter(ref.chapter);
  if (!text) return { status: "unavailable" };
  const verses = text.sections.flatMap((s) => s.verses).filter((v) => v.number >= ref.from && v.number <= ref.to);
  if (verses.length === 0) return { status: "invalid" };
  return { status: "ok", verses, attribution: text.attribution, dayNo: day.day };
}
