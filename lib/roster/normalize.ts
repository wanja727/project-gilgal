/**
 * 실명·셀 이름 비교 규칙 (architecture 5.4).
 * 공백 차이("김 제완" / "김제완 ")로 매칭이 갈리지 않도록 모든 공백을 제거한 뒤
 * **완전 일치**만 같은 이름으로 본다. 유사 매칭은 하지 않는다(오매칭이 미매칭보다 위험).
 */
export function normalizeName(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, "");
}

/** 셀 이름도 같은 규칙. "정윤경 셀" → "정윤경셀" */
export const normalizeCellName = normalizeName;

/** 실명 입력 검증: 공백 제거 후 2~20자, 한글·영문만 */
export function validateRealName(input: string): { ok: true; name: string } | { ok: false } {
  const name = normalizeName(input);
  if (name.length < 2 || name.length > 20) return { ok: false };
  if (!/^[가-힣a-zA-Z]+$/.test(name)) return { ok: false };
  return { ok: true, name };
}
