import { Avatar, Style } from "@dicebear/core";
import marblesDefinition from "@dicebear/styles/marbles.json";
import { describe, expect, it } from "vitest";
import { avatarSvg, isValidSeed, resolveAvatarParts } from "./avatar";
import { AVATAR_PARTS, type AvatarParts, encodeAvatarKey, NONE, parseAvatarKey, parseAvatarParts, randomAvatarParts } from "./avatarParts";
import { AVATAR_SEED_RE, randomAvatarSeed } from "./avatarSeed";

const PARTS: AvatarParts = { top: "cap", eyes: "wink", mouth: "grin", nose: NONE, glasses: "round", face: "freckles", color: 2 };

describe("avatar", () => {
  it("같은 seed 는 같은 SVG", () => {
    expect(avatarSvg("abcDEF123_-x")).toBe(avatarSvg("abcDEF123_-x"));
  });
  it("다른 seed 는 다른 SVG", () => {
    const set = new Set(Array.from({ length: 50 }, (_, i) => avatarSvg(`seed-${i}`)));
    expect(set.size).toBe(50);
  });
  it("꾸미지 않은 사람은 안경·얼굴 부위를 붙이기 전 Marbles 그림 그대로", () => {
    const stock = new Style(marblesDefinition);
    const palette = {
      backgroundColor: ["#f6f8fb"],
      sphereColor: ["#6f87a8", "#a9bbd3", "#8c97a8", "#7fa0c4", "#b7c6d9", "#93a9c6"],
      blendColor: ["#3a5578", "#6f87a8", "#a9bbd3", "#dce4ef", "#5b7699"],
      tintColor: ["#dce4ef", "#f6f8fb", "#e9edf3"],
      inkColor: ["#1e3150"],
    };
    for (let i = 0; i < 100; i++) {
      const seed = randomAvatarSeed();
      expect(avatarSvg(seed)).toBe(new Avatar(stock, { seed, ...palette, borderRadius: 50 }).toString());
    }
  });
  it("seed 형식 검증", () => {
    expect(isValidSeed("abcDEF123_-x")).toBe(true);
    expect(isValidSeed("<script>")).toBe(false);
    expect(isValidSeed("../etc")).toBe(false);
  });
  it("섞기 seed 는 12자 base64url 이고 매번 다르다", () => {
    const seeds = Array.from({ length: 200 }, randomAvatarSeed);
    for (const s of seeds) {
      expect(s).toMatch(AVATAR_SEED_RE);
      expect(isValidSeed(s)).toBe(true);
    }
    expect(new Set(seeds).size).toBe(200);
    expect(AVATAR_SEED_RE.test("abc")).toBe(false);
    expect(AVATAR_SEED_RE.test("abcDEF123_-x/")).toBe(false);
  });
});

describe("아바타 꾸미기", () => {
  it("모든 부품을 그릴 수 있고, 고른 부품마다 그림이 달라진다", () => {
    for (const part of AVATAR_PARTS) {
      const ids = [...(part.optional ? [NONE] : []), ...part.options.map((o) => o.id)];
      const svgs = new Set(ids.map((id) => avatarSvg("abcDEF123_-x", { ...PARTS, [part.id]: id })));
      expect(svgs.size).toBe(ids.length);
    }
  });
  it("꾸미지 않은 사람의 지금 모양을 허용 목록 안의 부품으로 풀어낸다", () => {
    for (let i = 0; i < 30; i++) {
      const resolved = resolveAvatarParts(randomAvatarSeed(), null);
      expect(parseAvatarParts(resolved)).toEqual(resolved);
      expect(resolved.glasses).toBe(NONE);
      expect(resolved.face).toBe(NONE);
    }
    expect(resolveAvatarParts("abcDEF123_-x", PARTS)).toEqual(PARTS);
  });
  it("아바타 키: 꾸미지 않으면 seed 그대로, 꾸미면 seed~부품 이고 되읽힌다", () => {
    expect(encodeAvatarKey("abcDEF123_-x", null)).toBe("abcDEF123_-x");
    const key = encodeAvatarKey("abcDEF123_-x", PARTS);
    expect(key).toBe("abcDEF123_-x~cap.wink.grin.none.round.freckles.2");
    expect(parseAvatarKey(key)).toEqual({ seed: "abcDEF123_-x", parts: PARTS });
    expect(parseAvatarKey("abcDEF123_-x")).toEqual({ seed: "abcDEF123_-x", parts: null });
    for (let i = 0; i < 50; i++) {
      const parts = randomAvatarParts();
      expect(parseAvatarKey(encodeAvatarKey("abcDEF123_-x", parts))?.parts).toEqual(parts);
    }
  });
  it("허용 목록 밖의 부품·색·형식은 받지 않는다", () => {
    expect(parseAvatarKey("abcDEF123_-x~crown.wink.grin.none.round.freckles.2")).toBeNull();
    expect(parseAvatarKey("abcDEF123_-x~cap.none.grin.none.round.freckles.2")).toBeNull(); // 눈은 "없음" 불가
    expect(parseAvatarKey("abcDEF123_-x~cap.wink.grin.none.round.freckles.6")).toBeNull();
    expect(parseAvatarKey("abcDEF123_-x~cap.wink.grin.none.round.2")).toBeNull();
    expect(parseAvatarKey("abc/../x~cap.wink.grin.none.round.freckles.2")).toBeNull();
    expect(parseAvatarParts({})).toBeNull();
    expect(parseAvatarParts({ ...PARTS, color: "2" })).toBeNull();
    expect(parseAvatarParts({ ...PARTS, top: "toString" })).toBeNull();
    expect(parseAvatarParts([PARTS])).toBeNull();
  });
});
