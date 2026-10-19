import { normalizeCellName, normalizeName } from "./normalize";

/**
 * Selah CSV → 길갈 명단 적재 계획 (순수 함수, scripts/import-selah-roster.ts 에서 사용).
 *
 * A = Selah 회원(온보딩 완료, 실제 셀 배정자): kakao_id 필수
 * B = Selah cell_roster: kakao_id 없을 수 있음
 *
 * 규칙(architecture 5.2):
 * - 셀 목록 = A ∪ B 의 셀 이름(정규화). B 가 셀 편성의 기준이므로 B 에 처음 나오는 순서로 정렬한다.
 * - A 를 우선 적재(source=selah_member). B 는 A 와 kakao_id 가 겹치지 않는 행만 추가(selah_roster).
 * - 같은 kakao_id 가 다른 실명·셀로 나오거나, (실명, 셀) 이 다른 kakao_id 로 겹치면 충돌로 보고하고 적재하지 않는다.
 */

export type CsvRow = { kakaoId: string | null; realName: string; cellName: string };
export type PlannedEntry = CsvRow & { source: "selah_member" | "selah_roster" };
export type Conflict = { reason: string; row: CsvRow; file: "A" | "B" };

export type ImportPlan = {
  cells: string[];
  entries: PlannedEntry[];
  conflicts: Conflict[];
  skippedDuplicates: number;
};

const NULLISH = new Set(["", "null", "NULL"]);

/** 3열(kakao_id,real_name,cell_name) CSV 파싱. 값에 쉼표·따옴표가 없는 Selah 추출 형식을 가정한다. */
export function parseRosterCsv(text: string): CsvRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const [header, ...rows] = lines;
  if (header.trim() !== "kakao_id,real_name,cell_name") {
    throw new Error(`예상하지 못한 CSV 헤더: ${header}`);
  }
  return rows.map((line, i) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"(.*)"$/, "$1"));
    if (cols.length !== 3) throw new Error(`${i + 2}행: 열 개수가 3이 아닙니다`);
    const [kakaoId, realName, cellName] = cols;
    if (!realName || !cellName) throw new Error(`${i + 2}행: 실명 또는 셀이 비어 있습니다`);
    if (!NULLISH.has(kakaoId) && !/^\d+$/.test(kakaoId)) {
      throw new Error(`${i + 2}행: 카카오 회원번호 형식이 아닙니다`);
    }
    return {
      kakaoId: NULLISH.has(kakaoId) ? null : kakaoId,
      realName: normalizeName(realName),
      cellName: normalizeCellName(cellName),
    };
  });
}

export function planImport(a: CsvRow[], b: CsvRow[]): ImportPlan {
  const cells: string[] = [];
  const seenCell = new Set<string>();
  for (const r of [...b, ...a]) {
    if (!seenCell.has(r.cellName)) {
      seenCell.add(r.cellName);
      cells.push(r.cellName);
    }
  }

  const entries: PlannedEntry[] = [];
  const conflicts: Conflict[] = [];
  const byKakao = new Map<string, PlannedEntry>();
  const byNameCell = new Map<string, PlannedEntry>();
  let skippedDuplicates = 0;
  const key = (r: CsvRow) => `${r.realName}\u0000${r.cellName}`;

  const add = (row: CsvRow, source: PlannedEntry["source"], file: "A" | "B") => {
    if (file === "A" && !row.kakaoId) {
      conflicts.push({ reason: "회원 행에 카카오 회원번호 없음", row, file });
      return;
    }
    const sameKakao = row.kakaoId ? byKakao.get(row.kakaoId) : undefined;
    if (sameKakao) {
      if (sameKakao.realName === row.realName && sameKakao.cellName === row.cellName) {
        skippedDuplicates++;
      } else {
        conflicts.push({ reason: "같은 회원번호가 다른 실명/셀로 등장", row, file });
      }
      return;
    }
    const sameNameCell = byNameCell.get(key(row));
    if (sameNameCell) {
      // 같은 셀의 동명 행: 회원번호가 없거나 같으면 중복, 서로 다른 회원번호면 같은 셀 동명이인 → 충돌
      if (!row.kakaoId || !sameNameCell.kakaoId || sameNameCell.kakaoId === row.kakaoId) {
        if (!sameNameCell.kakaoId && row.kakaoId) {
          sameNameCell.kakaoId = row.kakaoId;
          byKakao.set(row.kakaoId, sameNameCell);
        }
        skippedDuplicates++;
      } else {
        conflicts.push({ reason: "같은 셀에 같은 실명이 다른 회원번호로 등장", row, file });
      }
      return;
    }
    const entry: PlannedEntry = { ...row, source };
    entries.push(entry);
    if (entry.kakaoId) byKakao.set(entry.kakaoId, entry);
    byNameCell.set(key(entry), entry);
  };

  for (const r of a) add(r, "selah_member", "A");
  for (const r of b) add(r, "selah_roster", "B");

  return { cells, entries, conflicts, skippedDuplicates };
}
