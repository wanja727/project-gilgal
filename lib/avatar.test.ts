import { Avatar, Style } from "@dicebear/core";
import marblesDefinition from "@dicebear/styles/marbles.json";
import { describe, expect, it } from "vitest";
import { avatarSvg, isValidSeed, resolveAvatarParts } from "./avatar";
import { AVATAR_PARTS, type AvatarParts, encodeAvatarKey, NONE, parseAvatarKey, parseAvatarParts, randomAvatarParts, TOP_GROUPS } from "./avatarParts";
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
  it("꾸미지 않은 사람은 Marbles 그림 그대로(다시 그린 캡모자만 다름) — 길갈 부위를 붙여도 뽑기가 흔들리지 않는다", () => {
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
      if (resolveAvatarParts(seed, null).top === "cap") continue;
      const original = new Avatar(stock, { seed, ...palette, borderRadius: 50 });
      // 뺀 입(시무룩·메롱)이 나온 seed 는 입만 다른 것으로 바꿔 그린다(2026-11-01) — 그 밖은 그대로
      if (["pout", "tongue"].includes((original.toJSON().options as { mouthVariant?: string }).mouthVariant ?? "")) continue;
      expect(avatarSvg(seed)).toBe(original.toString());
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
  it("뺀 입(시무룩·메롱)은 꾸미지 않은 아바타에도 나오지 않고, 꾸미기 화면의 출발 모양도 저장할 수 있다", () => {
    const mouths = AVATAR_PARTS.find((p) => p.id === "mouth")!.options.map((o) => o.id);
    expect(mouths).not.toContain("pout");
    expect(mouths).not.toContain("tongue");
    for (let i = 0; i < 400; i++) {
      const seed = `seed-${i}`;
      const resolved = resolveAvatarParts(seed, null);
      expect(mouths).toContain(resolved.mouth);
      expect(parseAvatarParts(resolved)).not.toBeNull();
    }
  });
  it("뺀 부품(점·수염·선글라스)을 고른 저장값은 그 부위만 없음으로 — 나머지 꾸민 모양은 그대로", () => {
    for (const [face, glasses] of [["mustache", "round"], ["beard", NONE], ["mole", "square"], ["blush", "sun"]]) {
      const parsed = parseAvatarParts({ ...PARTS, face, glasses });
      expect(parsed).not.toBeNull();
      expect(parsed!.top).toBe(PARTS.top);
      expect(["mustache", "beard", "mole"]).not.toContain(parsed!.face);
      expect(parsed!.glasses).not.toBe("sun");
    }
    const ids = (part: string) => AVATAR_PARTS.find((p) => p.id === part)!.options.map((o) => o.id);
    for (const gone of ["mole", "mustache", "beard"]) expect(ids("face")).not.toContain(gone);
    expect(ids("glasses")).not.toContain("sun");
  });
  it("꾸미기 화면의 머리 묶음은 모든 머리를 정확히 한 번씩 담는다", () => {
    const ids = AVATAR_PARTS.find((p) => p.id === "top")!.options.map((o) => o.id);
    const grouped = TOP_GROUPS.flatMap((g) => g.ids);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...ids].sort());
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
