import { describe, expect, it } from "vitest";
import { DEFAULT_READER, parseReaderSettings, readerCssVars, serializeReaderSettings } from "./settings";

describe("읽기 설정 쿠키", () => {
  it("저장한 값을 그대로 되읽는다", () => {
    const s = { size: 3, font: "sans", weight: "bold", leading: "loose", theme: "dark" } as const;
    expect(parseReaderSettings(serializeReaderSettings(s))).toEqual(s);
  });

  it("없거나 깨진 쿠키는 기본값", () => {
    expect(parseReaderSettings(undefined)).toEqual(DEFAULT_READER);
    expect(parseReaderSettings("{not json")).toEqual(DEFAULT_READER);
    expect(parseReaderSettings("[1,2]")).toEqual(DEFAULT_READER);
  });

  it("모르는 값·범위 밖 값은 그 항목만 기본값", () => {
    const s = parseReaderSettings(JSON.stringify({ size: 99, font: "comic", weight: "bold", theme: "toString" }));
    expect(s).toEqual({ ...DEFAULT_READER, weight: "bold" });
  });

  it("CSS 변수로 바꾼다", () => {
    const v = readerCssVars({ ...DEFAULT_READER, weight: "bold", font: "sans" });
    expect(v["--reader-weight"]).toBe("700");
    expect(v["--reader-font"]).toBe("var(--font-sans)");
    expect(v["--verse-size"]).toBe("17.5px");
  });
});
