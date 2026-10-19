/**
 * Selah 명단 CSV → 길갈 cell / roster_entry 적재 (architecture 5.2).
 *
 *   pnpm import:selah --dry          # 계획만 출력 (DB 쓰기 없음)
 *   pnpm import:selah                # 적재
 *   pnpm import:selah --delete-csv   # 적재 성공 후 CSV 삭제
 *
 * - 입력: data/private/A.csv(Selah 회원), data/private/B.csv(Selah cell_roster). 둘 다 gitignore.
 * - 멱등: 다시 실행해도 같은 결과. 이미 claim 된 행과 운영자 수정 행(source='admin')은 덮어쓰지 않는다.
 * - 출력에는 개인정보를 남기지 않는다(실명은 마스킹, 회원번호는 출력하지 않음).
 * - Next 런타임 밖에서 실행되므로 server-only 인 lib/db 대신 자체 연결(DIRECT_URL)을 쓴다.
 */
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { cells, rosterEntries } from "../lib/db/schema";
import { parseRosterCsv, planImport, type CsvRow } from "../lib/roster/plan";

const DIR = path.join(process.cwd(), "data", "private");
const FILE_A = path.join(DIR, "A.csv");
const FILE_B = path.join(DIR, "B.csv");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry");
const deleteCsv = args.has("--delete-csv");

const mask = (name: string) =>
  name.length <= 1 ? "*" : name.length === 2 ? `${name[0]}*` : `${name[0]}${"*".repeat(name.length - 2)}${name.at(-1)}`;
const describe = (r: CsvRow) => `${mask(r.realName)} / ${r.cellName} / 회원번호 ${r.kakaoId ? "있음" : "없음"}`;

async function main() {
  for (const f of [FILE_A, FILE_B]) {
    if (!existsSync(f)) throw new Error(`CSV 가 없습니다: ${path.relative(process.cwd(), f)}`);
  }
  const a = parseRosterCsv(readFileSync(FILE_A, "utf8"));
  const b = parseRosterCsv(readFileSync(FILE_B, "utf8"));
  const plan = planImport(a, b);

  console.log(`CSV: A(회원) ${a.length}행, B(명단) ${b.length}행`);
  console.log(`셀 ${plan.cells.length}개: ${plan.cells.join(", ")}`);
  console.log(
    `명단 계획 ${plan.entries.length}행 (회원 ${plan.entries.filter((e) => e.source === "selah_member").length}, ` +
      `명단 ${plan.entries.filter((e) => e.source === "selah_roster").length}, ` +
      `회원번호 없음 ${plan.entries.filter((e) => !e.kakaoId).length}), 중복 생략 ${plan.skippedDuplicates}`,
  );
  if (plan.conflicts.length) {
    console.log(`충돌 ${plan.conflicts.length}건 (적재하지 않음):`);
    for (const c of plan.conflicts) console.log(`  - [${c.file}] ${c.reason}: ${describe(c.row)}`);
  }

  const url = process.env.DIRECT_URL;
  if (!url) throw new Error("DIRECT_URL 이 설정되지 않았습니다");
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    const existingCells = await db.select().from(cells);
    const existingRoster = await db.select().from(rosterEntries);
    const cellIdByName = new Map(existingCells.map((c) => [c.name, c.id]));
    const newCells = plan.cells.filter((n) => !cellIdByName.has(n));
    console.log(`DB 현재: 셀 ${existingCells.length}개, 명단 ${existingRoster.length}행 → 새 셀 ${newCells.length}개`);

    if (dryRun) {
      const byKakao = new Set(existingRoster.map((r) => r.kakaoId).filter(Boolean));
      const inserts = plan.entries.filter((e) => !(e.kakaoId && byKakao.has(e.kakaoId))).length;
      console.log(`[dry] 새로 들어갈 명단 행(최대) ${inserts}. DB 에는 쓰지 않았습니다.`);
      return;
    }

    const stats = { inserted: 0, updated: 0, unchanged: 0, protected: 0 };

    await db.transaction(async (tx) => {
      for (const [i, name] of plan.cells.entries()) {
        if (cellIdByName.has(name)) continue;
        const [row] = await tx.insert(cells).values({ name, sortOrder: i }).returning({ id: cells.id });
        cellIdByName.set(name, row.id);
      }

      const byKakao = new Map(existingRoster.filter((r) => r.kakaoId).map((r) => [r.kakaoId!, r]));
      const byNameCell = new Map(existingRoster.map((r) => [`${r.realName}\u0000${r.cellId}`, r]));

      for (const e of plan.entries) {
        const cellId = cellIdByName.get(e.cellName)!;
        const existing =
          (e.kakaoId ? byKakao.get(e.kakaoId) : undefined) ?? byNameCell.get(`${e.realName}\u0000${cellId}`);

        if (!existing) {
          await tx.insert(rosterEntries).values({
            kakaoId: e.kakaoId,
            realName: e.realName,
            cellId,
            source: e.source,
          });
          stats.inserted++;
          continue;
        }
        // 이미 사용자에게 연결된 행·운영자가 고친 행은 이관 데이터로 덮어쓰지 않는다
        if (existing.claimedBy || existing.source === "admin") {
          stats.protected++;
          continue;
        }
        const next = { kakaoId: e.kakaoId ?? existing.kakaoId, realName: e.realName, cellId };
        if (
          next.kakaoId === existing.kakaoId &&
          next.realName === existing.realName &&
          next.cellId === existing.cellId
        ) {
          stats.unchanged++;
          continue;
        }
        // 다른 행과 UNIQUE 가 겹치면 예외 → 트랜잭션 전체가 되돌려진다(부분 적재 없음)
        await tx.update(rosterEntries).set(next).where(eq(rosterEntries.id, existing.id));
        stats.updated++;
      }
    });

    const [{ count: cellCount }] = await client`select count(*)::int as count from cell`;
    const [{ count: rosterCount }] = await client`select count(*)::int as count from roster_entry`;
    console.log(`적재 완료: ${JSON.stringify(stats)}`);
    console.log(`DB 결과: 셀 ${cellCount}개, 명단 ${rosterCount}행`);

    if (deleteCsv) {
      unlinkSync(FILE_A);
      unlinkSync(FILE_B);
      console.log("CSV 2개를 삭제했습니다.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
