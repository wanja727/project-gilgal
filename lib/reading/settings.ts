/**
 * 본문 읽기 설정 (글자 크기·글꼴·굵기·줄 간격·배경) — 전자책 뷰어의 기본 설정.
 * 기기별 편의 설정이라 DB 가 아니라 쿠키에 둔다. 서버가 쿠키를 읽어 첫 화면부터 그 설정으로 그리므로
 * 페이지를 열 때 기본값으로 번쩍였다가 바뀌지 않는다. 클라이언트·서버 양쪽에서 쓰는 순수 모듈.
 */

export const READER_COOKIE = "reader";
/** 1년 — 통독 기간(한 달)보다 넉넉히 */
export const READER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const READER_SIZES = [15.5, 17.5, 19.5, 21.5, 23.5] as const;
export const READER_FONTS = { serif: "바탕", sans: "고딕" } as const;
export const READER_WEIGHTS = { normal: "보통", bold: "굵게" } as const;
export const READER_LEADINGS = { tight: "좁게", normal: "보통", loose: "넓게" } as const;
export const READER_THEMES = { light: "기본", sepia: "종이", dark: "어둡게" } as const;

export type ReaderSettings = {
  /** READER_SIZES 의 번호 */
  size: number;
  font: keyof typeof READER_FONTS;
  weight: keyof typeof READER_WEIGHTS;
  leading: keyof typeof READER_LEADINGS;
  theme: keyof typeof READER_THEMES;
};

export const DEFAULT_READER: ReaderSettings = { size: 1, font: "serif", weight: "normal", leading: "normal", theme: "light" };

const LEADING_VALUE: Record<ReaderSettings["leading"], number> = { tight: 1.8, normal: 2.05, loose: 2.4 };

function pick<T extends string>(value: unknown, allowed: Record<T, string>, fallback: T): T {
  return typeof value === "string" && Object.hasOwn(allowed, value) ? (value as T) : fallback;
}

/** 쿠키 값 → 설정. 깨졌거나 모르는 값은 항목별로 기본값 */
export function parseReaderSettings(raw: string | undefined | null): ReaderSettings {
  let o: Record<string, unknown> = {};
  try {
    const v: unknown = raw ? JSON.parse(raw) : {};
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch {
    /* 기본값 */
  }
  const size = Number(o.size);
  return {
    size: Number.isInteger(size) && size >= 0 && size < READER_SIZES.length ? size : DEFAULT_READER.size,
    font: pick(o.font, READER_FONTS, DEFAULT_READER.font),
    weight: pick(o.weight, READER_WEIGHTS, DEFAULT_READER.weight),
    leading: pick(o.leading, READER_LEADINGS, DEFAULT_READER.leading),
    theme: pick(o.theme, READER_THEMES, DEFAULT_READER.theme),
  };
}

export function serializeReaderSettings(s: ReaderSettings): string {
  return JSON.stringify(s);
}

/** 본문이 읽는 CSS 변수 (.reader-text, globals.css) */
export function readerCssVars(s: ReaderSettings): Record<string, string> {
  return {
    "--verse-size": `${READER_SIZES[s.size]}px`,
    "--reader-font": s.font === "sans" ? "var(--font-sans)" : "var(--font-serif)",
    "--reader-weight": s.weight === "bold" ? "700" : "400",
    "--reader-leading": String(LEADING_VALUE[s.leading]),
  };
}
