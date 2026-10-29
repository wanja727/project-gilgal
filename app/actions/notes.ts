"use server";

import { revalidatePath } from "next/cache";
import { deleteTrailNote, type NoteWriteResult, saveTrailNote, setTrailNoteHidden } from "@/lib/data/notes";
import { requireMember } from "@/lib/data/viewer";
import { todayKst } from "@/lib/time";

/** 한마디 서버 액션. 입력은 장 번호·내용(·숨길 id)뿐이고 userId 는 세션에서 얻는다. */

export async function saveTrailNoteAction(dayNo: number, content: string): Promise<NoteWriteResult> {
  const member = await requireMember();
  const result = await saveTrailNote(member.userId, dayNo, content, todayKst());
  if (result.status === "ok") revalidatePath("/");
  return result;
}

export async function deleteTrailNoteAction(dayNo: number): Promise<NoteWriteResult> {
  const member = await requireMember();
  const result = await deleteTrailNote(member.userId, dayNo);
  if (result.status === "ok") revalidatePath("/");
  return result;
}

export async function setTrailNoteHiddenAction(id: number, hidden: boolean): Promise<NoteWriteResult> {
  const member = await requireMember();
  const result = await setTrailNoteHidden(member.userId, id, hidden);
  if (result.status === "ok") revalidatePath("/");
  return result;
}
