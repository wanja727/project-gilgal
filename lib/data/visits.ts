import "server-only";
import { db } from "@/lib/db";
import { dailyVisits } from "@/lib/db/schema";
import { campaignSlug } from "@/lib/journey/campaign";
import { todayKst } from "@/lib/time";

/**
 * 하루 방문 기록(ADR-036). 사람·서비스 날짜(새벽 4시 기준)마다 한 행 — 여러 번 열어도 처음 한 번만 남는다.
 * 같은 서버 인스턴스에서 이미 남긴 날은 DB 에 다시 묻지 않는다(화면마다 쓰기가 생기지 않게).
 * 기록에 실패해도 화면에는 영향이 없다 — 다음 방문에서 다시 시도한다.
 */
const recorded = new Set<string>();

export async function recordVisit(userId: string): Promise<void> {
  const campaign = campaignSlug();
  const visitDate = todayKst();
  const key = `${campaign}:${visitDate}:${userId}`;
  if (recorded.has(key)) return;
  // 날이 바뀌며 쌓이기만 하지 않게 — 사람 수가 적어 넉넉히 두고 넘치면 비운다
  if (recorded.size > 5000) recorded.clear();
  recorded.add(key);
  try {
    await db.insert(dailyVisits).values({ campaign, visitDate, userId }).onConflictDoNothing();
  } catch (e) {
    recorded.delete(key);
    console.error("[visit] 방문 기록 실패", e);
  }
}
