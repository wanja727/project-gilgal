import "server-only";
import { eq } from "drizzle-orm";
import { AVATAR_SEED_RE } from "@/lib/avatarSeed";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type ChangeAvatarResult = { status: "saved" | "invalid" | "taken" };

/**
 * 아바타 섞기 저장. 후보 seed 는 클라이언트가 만들어 미리 보여 준 값이라 형식을 다시 검사하고,
 * 바꾸는 대상은 세션의 userId 로만 정한다.
 * 다른 사람의 seed(이미지 주소로 보임)를 그대로 보내도 unique 제약으로 막힌다 — 같은 모양 사칭 방지.
 */
export async function changeAvatarSeed(userId: string, seed: string): Promise<ChangeAvatarResult> {
  if (typeof seed !== "string" || !AVATAR_SEED_RE.test(seed)) return { status: "invalid" };
  try {
    await db
      .update(profiles)
      .set({ avatarSeed: seed, updatedAt: new Date() })
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
