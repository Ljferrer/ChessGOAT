import { describe, it, expect } from "vitest";
import { parseUci, toUci } from "../engines/uci.ts";

describe("parseUci", () => {
  it("parses a plain move into from/to", () => {
    expect(parseUci("e2e4")).toEqual({ from: "e2", to: "e4" });
  });

  it("parses a promotion move including the piece suffix", () => {
    expect(parseUci("e7e8q")).toEqual({ from: "e7", to: "e8", promotion: "q" });
  });

  it("lowercases the promotion piece", () => {
    expect(parseUci("e7e8Q")).toEqual({ from: "e7", to: "e8", promotion: "q" });
  });

  it("rejects malformed length", () => {
    expect(() => parseUci("e2e")).toThrow(/Invalid UCI move/);
    expect(() => parseUci("e2e4qx")).toThrow(/Invalid UCI move/);
  });

  it("rejects off-board squares", () => {
    expect(() => parseUci("e2z9")).toThrow(/Invalid UCI squares/);
  });

  it("rejects an illegal promotion piece", () => {
    expect(() => parseUci("e7e8k")).toThrow(/Invalid UCI promotion piece/);
  });

  it("rejects non-string input", () => {
    expect(() => parseUci(undefined as unknown as string)).toThrow();
  });
});

describe("toUci", () => {
  it("is the inverse of parseUci for plain moves", () => {
    expect(toUci(parseUci("g1f3"))).toBe("g1f3");
  });

  it("is the inverse of parseUci for promotions", () => {
    expect(toUci(parseUci("a7a8r"))).toBe("a7a8r");
  });
});
