import "server-only";
import { and, count, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cells, COMMENT_MAX_LENGTH, profiles, readingCommentLikes, readingComments } from "@/lib/db/schema";
import { campaignSlug } from "@/lib/journey/campaign";
import { checkDayAccess, unlockedDays } from "@/lib/journey/schedule";
import { relativeTime } from "@/lib/format";
import { addDays, type IsoDate, nowKst } from "@/lib/time";

/**
 * 장별 나눔과 공감 (architecture 8.7).
 *
 * 권한 원칙
 * - 작성자·공감한 사람은 항상 세션 userId. 수정·삭제는 WHERE 에 user_id 를 넣어 본인 것만 바뀐다.
 * - 공개된 장에만 쓰고 공감할 수 있다(checkDayAccess, 서버 기준 KST).
 * - 삭제(deleted_at)는 누구에게도 안 보이고, 운영자 숨김(hidden_at)은 작성자와 운영자에게만 보인다.
 */

export { COMMENT_MAX_LENGTH };
/** 하루(KST)에 쓸 수 있는 나눔 수 — 실수로 반복 전송되거나 도배되는 것을 막는다 */
export const COMMENT_DAILY_LIMIT = 20;

export type CommentSort = "latest" | "likes";

export type CommentView = {
  id: number;
  dayNo: number;
  content: string;
  createdAt: Date;
  edited: boolean;
  /** 운영자 숨김 (작성자·운영자에게만 내려간다) */
  hidden: boolean;
  mine: boolean;
  author: { name: string; cellName: string | null; avatarSeed: string };
  likeCount: number;
  likedByMe: boolean;
};

type Viewer = { userId: string; isAdmin: boolean };

function visibleTo(viewer: Viewer) {
  return and(
    eq(readingComments.campaign, campaignSlug()),
    isNull(readingComments.deletedAt),
    viewer.isAdmin ? undefined : or(isNull(readingComments.hiddenAt), eq(readingComments.userId, viewer.userId)),
  );
}

const likeCount = sql<number>`(select count(*)::int from ${readingCommentLikes} where ${readingCommentLikes.commentId} = ${readingComments.id})`;

function likedBy(userId: string) {
  return sql<boolean>`exists(select 1 from ${readingCommentLikes} where ${readingCommentLikes.commentId} = ${readingComments.id} and ${readingCommentLikes.userId} = ${userId})`;
}

async function selectComments(viewer: Viewer, where: ReturnType<typeof and>, sort: CommentSort, limit: number) {
  const rows = await db
    .select({
      id: readingComments.id,
      dayNo: readingComments.dayNo,
      content: readingComments.content,
      createdAt: readingComments.createdAt,
      editedAt: readingComments.editedAt,
      hiddenAt: readingComments.hiddenAt,
      userId: readingComments.userId,
      name: profiles.realName,
      cellName: cells.name,
      avatarSeed: profiles.avatarSeed,
      likeCount,
      likedByMe: likedBy(viewer.userId),
    })
    .from(readingComments)
    .innerJoin(profiles, eq(profiles.userId, readingComments.userId))
    .leftJoin(cells, eq(cells.id, profiles.cellId))
    .where(and(visibleTo(viewer), where))
    .orderBy(
      ...(sort === "likes" ? [desc(likeCount), desc(readingComments.createdAt)] : [desc(readingComments.createdAt)]),
      desc(readingComments.id),
    )
    .limit(limit);

  return rows.map(
    (r): CommentView => ({
      id: r.id,
      dayNo: r.dayNo,
      content: r.content,
      createdAt: r.createdAt,
      edited: r.editedAt !== null,
      hidden: r.hiddenAt !== null,
      mine: r.userId === viewer.userId,
      author: { name: r.name ?? "", cellName: r.cellName, avatarSeed: r.avatarSeed },
      likeCount: r.likeCount,
      likedByMe: r.likedByMe,
    }),
  );
}

/** 한 장의 나눔 */
export function listComments(viewer: Viewer, dayNo: number, sort: CommentSort = "latest") {
  return selectComments(viewer, and(eq(readingComments.dayNo, dayNo)), sort, 200);
}

/** 나눔 탭: 공개된 장들의 최근 나눔 */
export function listRecentComments(viewer: Viewer, today: IsoDate, limit = 40) {
  const days = unlockedDays(today).map((d) => d.day);
  if (days.length === 0) return Promise.resolve([] as CommentView[]);
  return selectComments(viewer, and(inArray(readingComments.dayNo, days)), "latest", limit);
}

/** 장별 나눔 수 (숨김·삭제 제외 — 모두에게 같은 숫자) */
export async function countComments(dayNo: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(readingComments)
    .where(
      and(
        eq(readingComments.campaign, campaignSlug()),
        eq(readingComments.dayNo, dayNo),
        isNull(readingComments.deletedAt),
        isNull(readingComments.hiddenAt),
      ),
    );
  return row.n;
}

export type CommentWriteResult =
  | { status: "ok" }
  | { status: "invalid" | "too_long" | "locked" | "limit" | "not_found" };

function normalizeContent(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // 줄바꿈은 살리고, 3줄 이상 빈 줄과 앞뒤 공백만 정리한다
  return input.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function createComment(
  userId: string,
  dayNo: unknown,
  input: unknown,
  today: IsoDate,
): Promise<CommentWriteResult> {
  const access = checkDayAccess(dayNo, today);
  if (!access.ok) return { status: access.reason === "locked" ? "locked" : "invalid" };
  const content = normalizeContent(input);
  if (!content) return { status: "invalid" };
  if (content.length > COMMENT_MAX_LENGTH) return { status: "too_long" };

  const since = new Date(`${today}T00:00:00+09:00`);
  const until = new Date(`${addDays(today, 1)}T00:00:00+09:00`);
  const [{ n }] = await db
    .select({ n: count() })
    .from(readingComments)
    .where(
      and(
        eq(readingComments.userId, userId),
        gte(readingComments.createdAt, since),
        lt(readingComments.createdAt, until),
      ),
    );
  if (n >= COMMENT_DAILY_LIMIT) return { status: "limit" };

  const now = nowKst();
  await db.insert(readingComments).values({
    campaign: campaignSlug(),
    dayNo: access.day.day,
    userId,
    content,
    createdAt: now,
    updatedAt: now,
  });
  return { status: "ok" };
}

function validId(id: unknown): id is number {
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0;
}

export async function editComment(userId: string, id: unknown, input: unknown): Promise<CommentWriteResult> {
  if (!validId(id)) return { status: "invalid" };
  const content = normalizeContent(input);
  if (!content) return { status: "invalid" };
  if (content.length > COMMENT_MAX_LENGTH) return { status: "too_long" };
  const now = nowKst();
  const updated = await db
    .update(readingComments)
    .set({ content, editedAt: now, updatedAt: now })
    .where(
      and(
        eq(readingComments.id, id),
        eq(readingComments.userId, userId),
        eq(readingComments.campaign, campaignSlug()),
        isNull(readingComments.deletedAt),
      ),
    )
    .returning({ id: readingComments.id });
  return updated.length ? { status: "ok" } : { status: "not_found" };
}

export async function deleteComment(userId: string, id: unknown): Promise<CommentWriteResult> {
  if (!validId(id)) return { status: "invalid" };
  const now = nowKst();
  const updated = await db
    .update(readingComments)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(readingComments.id, id),
        eq(readingComments.userId, userId),
        eq(readingComments.campaign, campaignSlug()),
        isNull(readingComments.deletedAt),
      ),
    )
    .returning({ id: readingComments.id });
  return updated.length ? { status: "ok" } : { status: "not_found" };
}

/** 운영자 숨김/복구. 호출 전에 운영자 여부를 확인한다(actions) — 여기서도 한 번 더 본다 */
export async function setCommentHidden(adminUserId: string, id: unknown, hidden: boolean): Promise<CommentWriteResult> {
  if (!validId(id)) return { status: "invalid" };
  const [admin] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.userId, adminUserId));
  if (!admin?.isAdmin) return { status: "not_found" };
  const now = nowKst();
  const updated = await db
    .update(readingComments)
    .set(hidden ? { hiddenAt: now, hiddenBy: adminUserId, updatedAt: now } : { hiddenAt: null, hiddenBy: null, updatedAt: now })
    .where(and(eq(readingComments.id, id), eq(readingComments.campaign, campaignSlug())))
    .returning({ id: readingComments.id });
  return updated.length ? { status: "ok" } : { status: "not_found" };
}

export type LikeResult = { status: "ok"; liked: boolean; likeCount: number } | { status: "not_found" };

/**
 * 공감 켜기/끄기. 원하는 상태(like)를 받아 멱등하게 맞춘다 — 두 번 눌려도 중복 행이 생기지 않는다(PK).
 * 볼 수 있는 나눔(삭제·숨김 아님)이고 공개된 장일 때만.
 */
export async function setLike(userId: string, commentId: unknown, like: boolean, today: IsoDate): Promise<LikeResult> {
  if (!validId(commentId)) return { status: "not_found" };
  const [comment] = await db
    .select({ dayNo: readingComments.dayNo })
    .from(readingComments)
    .where(
      and(
        eq(readingComments.id, commentId),
        eq(readingComments.campaign, campaignSlug()),
        isNull(readingComments.deletedAt),
        isNull(readingComments.hiddenAt),
      ),
    );
  if (!comment || !checkDayAccess(comment.dayNo, today).ok) return { status: "not_found" };

  if (like) {
    await db.insert(readingCommentLikes).values({ commentId, userId }).onConflictDoNothing();
  } else {
    await db
      .delete(readingCommentLikes)
      .where(and(eq(readingCommentLikes.commentId, commentId), eq(readingCommentLikes.userId, userId)));
  }
  const [{ n }] = await db
    .select({ n: count() })
    .from(readingCommentLikes)
    .where(eq(readingCommentLikes.commentId, commentId));
  return { status: "ok", liked: like, likeCount: n };
}

/** 클라이언트로 보내는 나눔 — 시각은 서버에서 문구로 만들어 하이드레이션 차이를 없앤다 */
export type SharedComment = Omit<CommentView, "createdAt"> & { timeLabel: string };

export function toShared(comments: CommentView[], now: Date): SharedComment[] {
  return comments.map(({ createdAt, ...c }) => ({ ...c, timeLabel: relativeTime(createdAt, now) }));
}
