import "server-only";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { avatarKeyOf } from "@/lib/avatarParts";
import { db } from "@/lib/db";
import { profiles, readingProgress, trailNotes } from "@/lib/db/schema";
import { campaignSlug } from "@/lib/journey/campaign";
import { checkDayAccess } from "@/lib/journey/schedule";
import { normalizeNote, TRAIL_NOTE_MAX_LENGTH } from "@/lib/share/note";
import { type IsoDate, nowKst } from "@/lib/time";
import { communityMember } from "./progress";
import type { Viewer } from "./viewer";

/**
 * 앞서 간 동행자의 한마디(ADR-028). 화면에는 이름·userId 없이 아바타 키와 내용만 보낸다 —
 * 이름 없이 그 자리의 백성이 되어 쓰는 말이라서.
 */
export type TrailNote = { id: number; avatarKey: string; content: string; mine: boolean; hidden: boolean };
export type NoteWriteResult = { status: "ok" | "invalid" | "too_long" | "locked" | "not_arrived" | "not_found" };

/** 그 장의 한마디(최근 것부터 limit 개)와 전체 수. 숨긴 한마디는 운영자와 쓴 사람에게만 */
export async function listTrailNotes(viewer: Viewer, dayNo: number, limit = 30): Promise<{ notes: TrailNote[]; total: number }> {
  const where = and(
    eq(trailNotes.campaign, campaignSlug()),
    eq(trailNotes.dayNo, dayNo),
    or(communityMember(), eq(trailNotes.userId, viewer.userId)),
    viewer.isAdmin ? undefined : or(isNull(trailNotes.hiddenAt), eq(trailNotes.userId, viewer.userId)),
  );
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: trailNotes.id,
        userId: trailNotes.userId,
        content: trailNotes.content,
        hiddenAt: trailNotes.hiddenAt,
        avatarSeed: profiles.avatarSeed,
        avatarOptions: profiles.avatarOptions,
      })
      .from(trailNotes)
      .innerJoin(profiles, eq(profiles.userId, trailNotes.userId))
      .where(where)
      .orderBy(desc(trailNotes.updatedAt), desc(trailNotes.id))
      .limit(limit),
    db.select({ n: count() }).from(trailNotes).innerJoin(profiles, eq(profiles.userId, trailNotes.userId)).where(where),
  ]);
  return {
    total: n,
    notes: rows.map((r) => ({
      id: r.id,
      avatarKey: avatarKeyOf(r.avatarSeed, r.avatarOptions),
      content: r.content,
      mine: r.userId === viewer.userId,
      hidden: r.hiddenAt !== null,
    })),
  };
}

/** 내 한마디 남기기·고치기. 그 장을 읽고 도착한 사람만(먼저 간 사람이 뒤에 올 사람에게 남기는 말) */
export async function saveTrailNote(userId: string, dayNo: unknown, input: unknown, today: IsoDate): Promise<NoteWriteResult> {
  const access = checkDayAccess(dayNo, today);
  if (!access.ok) return { status: access.reason === "locked" ? "locked" : "invalid" };
  const content = normalizeNote(input);
  if (!content) return { status: "invalid" };
  if (content.length > TRAIL_NOTE_MAX_LENGTH) return { status: "too_long" };

  const campaign = campaignSlug();
  const [arrived] = await db
    .select({ id: readingProgress.id })
    .from(readingProgress)
    .where(and(eq(readingProgress.userId, userId), eq(readingProgress.campaign, campaign), eq(readingProgress.dayNo, access.day.day)));
  if (!arrived) return { status: "not_arrived" };

  const now = nowKst();
  await db
    .insert(trailNotes)
    .values({ campaign, dayNo: access.day.day, userId, content, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [trailNotes.campaign, trailNotes.dayNo, trailNotes.userId],
      set: { content, updatedAt: now },
    });
  return { status: "ok" };
}

export async function deleteTrailNote(userId: string, dayNo: unknown): Promise<NoteWriteResult> {
  if (typeof dayNo !== "number" || !Number.isInteger(dayNo)) return { status: "invalid" };
  const deleted = await db
    .delete(trailNotes)
    .where(and(eq(trailNotes.campaign, campaignSlug()), eq(trailNotes.dayNo, dayNo), eq(trailNotes.userId, userId)))
    .returning({ id: trailNotes.id });
  return deleted.length ? { status: "ok" } : { status: "not_found" };
}

/** 운영자 숨김·복구 */
export async function setTrailNoteHidden(adminUserId: string, id: unknown, hidden: boolean): Promise<NoteWriteResult> {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return { status: "invalid" };
  const [admin] = await db.select({ isAdmin: profiles.isAdmin }).from(profiles).where(eq(profiles.userId, adminUserId));
  if (!admin?.isAdmin) return { status: "not_found" };
  const now = nowKst();
  const updated = await db
    .update(trailNotes)
    .set(hidden ? { hiddenAt: now, hiddenBy: adminUserId } : { hiddenAt: null, hiddenBy: null })
    .where(and(eq(trailNotes.id, id), eq(trailNotes.campaign, campaignSlug())))
    .returning({ id: trailNotes.id });
  return updated.length ? { status: "ok" } : { status: "not_found" };
}

/** 내가 그 장에 남긴 한마디(없으면 null) — 홈에서 "나도 한마디" 입력칸을 채울 때 */
export async function getMyTrailNote(userId: string, dayNo: number): Promise<string | null> {
  const [row] = await db
    .select({ content: trailNotes.content })
    .from(trailNotes)
    .where(and(eq(trailNotes.campaign, campaignSlug()), eq(trailNotes.dayNo, dayNo), eq(trailNotes.userId, userId)));
  return row?.content ?? null;
}
