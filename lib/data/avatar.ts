import "server-only";
import { eq } from "drizzle-orm";
import { parseAvatarParts } from "@/lib/avatarParts";
import { AVATAR_SEED_RE } from "@/lib/avatarSeed";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type ChangeAvatarResult = { status: "saved" | "invalid" | "taken" };

/**
 * 아바타 꾸미기 저장(ADR-027). 고른 부품과, 섞기로 바꿨다면 새 seed 를 함께 받는다.
 * 둘 다 클라이언트가 만든 값이라 형식·허용 목록을 다시 검사하고, 바꾸는 대상은 세션의 userId 로만 정한다.
 * 다른 사람의 seed(이미지 주소로 보임)를 그대로 보내도 unique 제약으로 막힌다 — 같은 무늬 사칭 방지.
 */
export async function changeAvatar(userId: string, input: { seed: string | null; parts: unknown }): Promise<ChangeAvatarResult> {
  const parts = parseAvatarParts(input.parts);
  if (!parts) return { status: "invalid" };
  if (input.seed !== null && (typeof input.seed !== "string" || !AVATAR_SEED_RE.test(input.seed))) return { status: "invalid" };
  try {
    await db
      .update(profiles)
      .set({ ...(input.seed !== null && { avatarSeed: input.seed }), avatarOptions: parts, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
    return { status: "saved" };
  } catch (e) {
    if (isUniqueViolation(e)) return { status: "taken" };
    throw e;
  }
}

// drizzle 은 드라이버 오류를 cause 로 감싸서 던진다
function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}
