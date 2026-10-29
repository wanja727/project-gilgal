import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { type AvatarParts, encodeAvatarKey, parseAvatarParts } from "@/lib/avatarParts";
import { db } from "@/lib/db";
import { cells, profiles } from "@/lib/db/schema";

/**
 * 현재 요청의 사용자. 요청당 1회만 조회한다(React cache).
 * 카카오 회원번호는 여기에 담지 않는다 — 화면으로 흘러갈 수 있는 객체이기 때문.
 */
export type Viewer = {
  userId: string;
  realName: string | null;
  cellId: number | null;
  cellName: string | null;
  onboarded: boolean;
  isAdmin: boolean;
  isTest: boolean;
  avatarSeed: string;
  /** 꾸미기로 고른 부품(없으면 null — seed 가 정한 모양) */
  avatarParts: AvatarParts | null;
  /** 화면에 쓰는 아바타 키(seed + 고른 부품, lib/avatarParts.ts) */
  avatarKey: string;
};

export type Member = Viewer & { realName: string; cellId: number };

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [row] = await db
    .select({
      realName: profiles.realName,
      cellId: profiles.cellId,
      cellName: cells.name,
      isAdmin: profiles.isAdmin,
      isTest: profiles.isTest,
      avatarSeed: profiles.avatarSeed,
      avatarOptions: profiles.avatarOptions,
    })
    .from(profiles)
    .leftJoin(cells, eq(cells.id, profiles.cellId))
    .where(eq(profiles.userId, userId));
  // 세션은 있는데 프로필이 없는 경우(로그인 이벤트 실패 등) — 로그인부터 다시
  if (!row) return null;

  const { avatarOptions, ...rest } = row;
  const avatarParts = parseAvatarParts(avatarOptions);
  return {
    userId,
    ...rest,
    avatarParts,
    avatarKey: encodeAvatarKey(row.avatarSeed, avatarParts),
    onboarded: row.realName !== null && row.cellId !== null,
  };
});

/** 로그인 필수 페이지 */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** 로그인 + 온보딩 완료 필수 페이지 */
export async function requireMember(): Promise<Member> {
  const viewer = await requireViewer();
  if (!viewer.onboarded) redirect("/onboarding");
  return viewer as Member;
}
