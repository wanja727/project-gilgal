import { describe, expect, it } from "vitest";
import { sampleShares } from "./sample";

/** 주어진 값을 차례로 내는 결정적 난수 */
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe("홈 나눔 고르기", () => {
  const pool = Array.from({ length: 20 }, (_, i) => i);

  it("n 개를 중복 없이 고른다", () => {
    const got = sampleShares(pool, 12);
    expect(got).toHaveLength(12);
    expect(new Set(got).size).toBe(12);
    expect(got.every((x) => pool.includes(x))).toBe(true);
  });

  it("모자라면 있는 만큼, 원본은 그대로", () => {
    const small = [1, 2, 3];
    expect(sampleShares(small, 12).sort()).toEqual([1, 2, 3]);
    expect(small).toEqual([1, 2, 3]);
  });

  it("난수를 따라 앞쪽(최근)만이 아니라 뒤쪽 나눔도 고른다", () => {
    expect(sampleShares(pool, 3, seq(0.99, 0, 0.5))).toEqual([19, 1, 11]);
  });

  it("여러 번 열면 첫 자리가 고루 돈다", () => {
    const first = new Set(Array.from({ length: 200 }, () => sampleShares(pool, 12)[0]));
    expect(first.size).toBeGreaterThan(10);
  });
});
