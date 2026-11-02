"use server";

import { MAX_VERSE, setHighlights } from "@/lib/data/highlights";
import { requireMember } from "@/lib/data/viewer";
import { JOURNEY_DAYS } from "@/lib/journey/days";
import { checkDayAccess } from "@/lib/journey/schedule";
import { todayKst } from "@/lib/time";

export type HighlightResult = { status: "ok" | "invalid" | "locked" };

/** 형광펜 긋기·지우기(ADR-035). 열린 장에서만 — 본문을 볼 수 있는 장이어야 절을 고를 수 있다 */
export async function setHighlightsAction(chapter: number, verses: number[], on: boolean): Promise<HighlightResult> {
  const member = await requireMember();
  const day = JOURNEY_DAYS.find((d) => d.chapter === chapter);
  if (!day || !Array.isArray(verses) || verses.length === 0 || verses.length > MAX_VERSE || typeof on !== "boolean") {
    return { status: "invalid" };
  }
  if (!verses.every((v) => Number.isInteger(v) && v >= 1 && v <= MAX_VERSE)) return { status: "invalid" };
  if (!checkDayAccess(day.day, todayKst()).ok) return { status: "locked" };
  await setHighlights(member.userId, chapter, [...new Set(verses)], on);
  return { status: "ok" };
}
