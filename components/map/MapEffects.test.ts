import { describe, expect, it } from "vitest";
import { landsBefore } from "./MapEffects";

describe("이미 나뉜 땅(누적)", () => {
  it("13장 전에는 없다", () => {
    expect(landsBefore(1)).toEqual([]);
    expect(landsBefore(13)).toEqual([]);
  });

  it("그 장에서 새로 받는 땅은 빼고 앞 장들의 땅만", () => {
    expect(landsBefore(14)).toEqual(["east"]);
    expect(landsBefore(16)).toEqual(["east", "caleb", "judah"]);
    expect(landsBefore(19)).toEqual(["east", "caleb", "judah", "ephraim", "manasseh"]);
  });

  it("19장 뒤로는 모든 땅", () => {
    const all = ["east", "caleb", "judah", "ephraim", "manasseh", "north", "benjamin", "dan", "simeon"];
    expect(landsBefore(20)).toEqual(all);
    expect(landsBefore(25)).toEqual(all);
  });
});
