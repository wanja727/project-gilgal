import type { IsoDate } from "@/lib/time";
import { weekdayOf } from "@/lib/time";

/**
 * 화면 문구 포맷 — 날짜·시각은 모두 KST 기준이다.
 * 서버·클라이언트 어디서든 같은 결과가 나오도록 Intl·로캘에 의존하지 않는다.
 */

const WEEKDAYS = "일월화수목금토";

/** "11월 7일", withWeekday 면 "11월 7일 토요일" */
export function formatDate(date: IsoDate, withWeekday = false): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일${withWeekday ? ` ${WEEKDAYS[weekdayOf(date)]}요일` : ""}`;
}

/** 순간 → KST "오전 5:48" */
export function formatKstTime(instant: Date): string {
  const kst = new Date(instant.getTime() + 9 * 60 * 60 * 1000);
  const h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${h12}:${String(m).padStart(2, "0")}`;
}

/** 1 → "1st", 2 → "2nd", 85 → "85th" */
export function ordinalEn(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

// ─── 조사 ─────────────────────────────────────────────────────────────────

function lastHangul(word: string): number | null {
  const code = word.trim().charCodeAt(word.trim().length - 1);
  return code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 : null;
}

/**
 * 받침에 맞는 조사를 붙인다. pair = "으로/로" | "이/가" | "을/를" | "은/는" | "과/와" | "이에요/예요"
 * "으로/로"는 ㄹ 받침에도 "로"를 쓴다(길갈로, 실로로).
 */
export function josa(word: string, pair: "으로/로" | "이/가" | "을/를" | "은/는" | "과/와" | "이에요/예요"): string {
  const [withBatchim, without] = pair.split("/");
  const jong = lastHangul(word);
  if (jong === null) return word + without;
  const hasBatchim = jong !== 0 && !(pair === "으로/로" && jong === 8);
  return word + (hasBatchim ? withBatchim : without);
}

/** 대표 이름: "정다윤" → "다윤". 세 글자 한글 이름만 성을 뺀다 */
export function givenName(realName: string): string {
  return /^[가-힣]{3}$/.test(realName) ? realName.slice(1) : realName;
}

/** 나눔 시각: "방금", "5분 전", "2시간 전", 그 외에는 "11월 7일" */
export function relativeTime(instant: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - instant.getTime()) / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return toKstDateLabel(instant);
}

/** 순간 → KST 날짜 "11월 7일" */
export function toKstDateLabel(instant: Date): string {
  const kst = new Date(instant.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
}
