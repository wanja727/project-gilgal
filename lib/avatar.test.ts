import { describe, expect, it } from "vitest";
import { avatarSvg, isValidSeed } from "./avatar";

describe("avatar", () => {
  it("같은 seed 는 같은 SVG", () => {
    expect(avatarSvg("abcDEF123_-x")).toBe(avatarSvg("abcDEF123_-x"));
  });
  it("다른 seed 는 다른 SVG", () => {
    const set = new Set(Array.from({ length: 50 }, (_, i) => avatarSvg(`seed-${i}`)));
    expect(set.size).toBe(50);
  });
  it("seed 형식 검증", () => {
    expect(isValidSeed("abcDEF123_-x")).toBe(true);
    expect(isValidSeed("<script>")).toBe(false);
    expect(isValidSeed("../etc")).toBe(false);
  });
});
