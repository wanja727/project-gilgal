import "server-only";
import { and, asc, count, eq, isNull, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { type AdminMetrics, buildAdminMetrics } from "@/lib/admin/metrics";
import { db } from "@/lib/db";
import { cells, dailyVisits, profiles, readingProgress } from "@/lib/db/schema";
import { communityMember, communityPopulation } from "@/lib/data/progress";
import { type Member, requireMember } from "@/lib/data/viewer";
import { campaignSlug, JOSHUA_2026 } from "@/lib/journey/campaign";
import { type IsoDate, toServiceDate } from "@/lib/time";

/**
 * 관리자 화면(ADR-036). 관리자 권한은 DB 에서 profile.is_admin 을 직접 켠다(화면에서 주고받지 않는다).
 * 관리자가 아니면 화면이 있다는 것도 드러내지 않게 404.
 */
export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (!member.isAdmin) notFound();
  return member;
}

/** 지표 원천 행을 모아 계산한다. 이름·셀만 쓰고 카카오 회원번호 등은 읽지 않는다 */
export async function getAdminMetrics(today: IsoDate): Promise<AdminMetrics> {
  const campaign = campaignSlug();
  const [memberRows, [pendingRow], progressRows, visitRows] = await Promise.all([
    db
      .select({ userId: profiles.userId, name: profiles.realName, cell: cells.name, personal: cells.personal })
      .from(profiles)
      .innerJoin(cells, eq(cells.id, profiles.cellId))
      .where(communityMember())
      .orderBy(asc(cells.sortOrder), asc(cells.name), asc(profiles.realName)),
    db
      .select({ n: count() })
      .from(profiles)
      .where(and(communityPopulation(), or(isNull(profiles.realName), isNull(profiles.cellId)))),
    db
      .select({ userId: readingProgress.userId, dayNo: readingProgress.dayNo, at: readingProgress.completedAt })
      .from(readingProgress)
      .where(eq(readingProgress.campaign, campaign)),
    db
      .select({ userId: dailyVisits.userId, date: dailyVisits.visitDate })
      .from(dailyVisits)
      .where(eq(dailyVisits.campaign, campaign)),
  ]);

  return buildAdminMetrics({
    today,
    campaign: JOSHUA_2026,
    members: memberRows.map((r) => ({ userId: r.userId, name: r.name ?? "", cell: r.cell, personal: r.personal })),
    pending: pendingRow?.n ?? 0,
    completions: progressRows.map((r) => ({ userId: r.userId, dayNo: r.dayNo, date: toServiceDate(r.at) })),
    visits: visitRows,
  });
}
