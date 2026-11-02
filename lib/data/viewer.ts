import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { type AvatarParts, encodeAvatarKey, parseAvatarParts } from "@/lib/avatarParts";
import { getCompletedDays } from "@/lib/data/progress";
import { recordVisit } from "@/lib/data/visits";
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
  /** 셀 없이 개인으로 참여("다른 공동체", ADR-031) — 셀 카드·셀 칩을 보여 주지 않는다 */
  personal: boolean;
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

/** 로그인한 사용자 id — 세션 조회는 요청당 1회 */
const sessionUserId = cache(async (): Promise<string | null> => (await auth())?.user?.id ?? null);

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const userId = await sessionUserId();
  if (!userId) return null;

  const [row] = await db
    .select({
      realName: profiles.realName,
      cellId: profiles.cellId,
      cellName: cells.name,
      personal: cells.personal,
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

  const { avatarOptions, personal, ...rest } = row;
  const avatarParts = parseAvatarParts(avatarOptions);
  return {
    userId,
    ...rest,
    personal: personal ?? false,
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
  // 오늘 방문 기록(관리자 지표, ADR-036) — 응답을 보낸 뒤에 남겨 화면을 늦추지 않는다
  const { userId } = viewer;
  after(() => recordVisit(userId));
  return viewer as Member;
}

/**
 * 로그인 + 온보딩 완료 + 내가 완료한 장(2026-11-01 성능).
 * 세션으로 id 를 안 뒤 프로필 조회와 읽기 기록 조회를 동시에 보낸다 — 차례로 기다리던 DB 왕복이 하나 준다.
 * 온보딩 전이면 읽기 기록은 버려지고 requireMember 가 온보딩으로 보낸다.
 */
export async function requireMemberWithProgress(): Promise<{ member: Member; completed: number[] }> {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");
  const [member, completed] = await Promise.all([requireMember(), getCompletedDays(userId)]);
  return { member, completed };
}
