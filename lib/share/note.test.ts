import { describe, expect, it } from "vitest";
import { normalizeNote } from "./note";

describe("한마디 정리", () => {
  it("줄바꿈·겹친 띄어쓰기를 한 칸으로, 앞뒤 공백 제거", () => {
    expect(normalizeNote("  성벽이\n무너졌어요!   어서 와요 ")).toBe("성벽이 무너졌어요! 어서 와요");
  });
  it("비었거나 글자가 아니면 null", () => {
    expect(normalizeNote("   \n ")).toBeNull();
    expect(normalizeNote(42)).toBeNull();
  });
});
