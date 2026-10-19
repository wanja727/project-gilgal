import { describe, expect, it } from "vitest";
import { normalizeName, validateRealName } from "./normalize";
import { parseRosterCsv, planImport, type CsvRow } from "./plan";

const row = (kakaoId: string | null, realName: string, cellName: string): CsvRow => ({
  kakaoId,
  realName,
  cellName,
});

describe("normalizeName / validateRealName", () => {
  it("공백을 모두 제거한다", () => {
    expect(normalizeName(" 김 제완 ")).toBe("김제완");
  });
  it("2~20자 한글·영문만 허용", () => {
    expect(validateRealName("홍길동")).toEqual({ ok: true, name: "홍길동" });
    expect(validateRealName(" 홍 길동")).toEqual({ ok: true, name: "홍길동" });
    expect(validateRealName("홍").ok).toBe(false);
    expect(validateRealName("홍길동1").ok).toBe(false);
    expect(validateRealName("<script>").ok).toBe(false);
  });
});

describe("parseRosterCsv", () => {
  it("null 문자열과 빈 값을 회원번호 없음으로 읽는다", () => {
    const rows = parseRosterCsv(
      "﻿kakao_id,real_name,cell_name\r\n123,홍 길동,가셀\r\nnull,김철수,나 셀\r\n,이영희,가셀\r\n",
    );
    expect(rows).toEqual([row("123", "홍길동", "가셀"), row(null, "김철수", "나셀"), row(null, "이영희", "가셀")]);
  });
  it("헤더가 다르면 거부", () => {
    expect(() => parseRosterCsv("id,name\n1,a")).toThrow();
  });
  it("회원번호 형식이 아니면 거부", () => {
    expect(() => parseRosterCsv("kakao_id,real_name,cell_name\nabc,홍길동,가셀")).toThrow();
  });
});

describe("planImport", () => {
  it("A 우선, B 는 겹치지 않는 행만 추가", () => {
    const plan = planImport(
      [row("1", "홍길동", "가셀")],
      [row("1", "홍길동", "가셀"), row("2", "김철수", "나셀"), row(null, "이영희", "가셀")],
    );
    expect(plan.cells).toEqual(["가셀", "나셀"]);
    expect(plan.entries.map((e) => [e.kakaoId, e.source])).toEqual([
      ["1", "selah_member"],
      ["2", "selah_roster"],
      [null, "selah_roster"],
    ]);
    expect(plan.skippedDuplicates).toBe(1);
    expect(plan.conflicts).toEqual([]);
  });

  it("같은 회원번호가 다른 셀이면 충돌", () => {
    const plan = planImport([row("1", "홍길동", "가셀")], [row("1", "홍길동", "나셀")]);
    expect(plan.entries).toHaveLength(1);
    expect(plan.conflicts).toHaveLength(1);
  });

  it("다른 셀의 동명이인은 각각 적재", () => {
    const plan = planImport([], [row(null, "김민수", "가셀"), row(null, "김민수", "나셀")]);
    expect(plan.entries).toHaveLength(2);
  });

  it("같은 셀 동명 행은 회원번호를 합쳐 하나로", () => {
    const plan = planImport([], [row(null, "김민수", "가셀"), row("9", "김민수", "가셀")]);
    expect(plan.entries).toEqual([{ ...row("9", "김민수", "가셀"), source: "selah_roster" }]);
  });

  it("같은 셀 동명인데 회원번호가 다르면 충돌", () => {
    const plan = planImport([row("1", "김민수", "가셀")], [row("2", "김민수", "가셀")]);
    expect(plan.conflicts).toHaveLength(1);
  });
});
