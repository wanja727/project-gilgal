"use server";

import { revalidatePath } from "next/cache";
import {
  type CommentWriteResult,
  createComment,
  deleteComment,
  editComment,
  type LikeResult,
  setCommentHidden,
  setLike,
} from "@/lib/data/comments";
import { requireMember } from "@/lib/data/viewer";
import { todayKst } from "@/lib/time";

/**
 * 나눔 서버 액션. 입력은 장 번호·나눔 id·내용뿐이고 userId 는 항상 세션에서 얻는다.
 * 공개 여부·소유권·운영자 여부는 lib/data/comments 에서 다시 검증한다.
 */

function refresh(dayNo?: number) {
  if (dayNo) revalidatePath(`/day/${dayNo}`);
  revalidatePath("/share");
}

export async function createCommentAction(dayNo: number, content: string): Promise<CommentWriteResult> {
  const member = await requireMember();
  const result = await createComment(member.userId, dayNo, content, todayKst());
  if (result.status === "ok") refresh(dayNo);
  return result;
}

export async function editCommentAction(id: number, content: string, dayNo?: number): Promise<CommentWriteResult> {
  const member = await requireMember();
  const result = await editComment(member.userId, id, content);
  if (result.status === "ok") refresh(dayNo);
  return result;
}

export async function deleteCommentAction(id: number, dayNo?: number): Promise<CommentWriteResult> {
  const member = await requireMember();
  const result = await deleteComment(member.userId, id);
  if (result.status === "ok") refresh(dayNo);
  return result;
}

export async function setLikeAction(id: number, like: boolean): Promise<LikeResult> {
  const member = await requireMember();
  return setLike(member.userId, id, like === true, todayKst());
}

/** 운영자 숨김/복구 */
export async function setHiddenAction(id: number, hidden: boolean, dayNo?: number): Promise<CommentWriteResult> {
  const member = await requireMember();
  if (!member.isAdmin) return { status: "not_found" };
  const result = await setCommentHidden(member.userId, id, hidden === true);
  if (result.status === "ok") refresh(dayNo);
  return result;
}
