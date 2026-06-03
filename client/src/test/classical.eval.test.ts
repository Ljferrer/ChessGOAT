import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { evaluate } from "../engines/classical/eval.ts";

const START = new Chess().fen();

describe("evaluate", () => {
  it("scores the symmetric starting Position as a dead heat", () => {
    expect(evaluate(new Chess(START))).toBe(0);
  });

  it("is positive when White is up material", () => {
    // Black is missing its queen → White is far ahead.
    const fen = "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(evaluate(new Chess(fen))).toBeGreaterThan(800);
  });

  it("is negative when Black is up material", () => {
    // White is missing its queen → Black is far ahead.
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1";
    expect(evaluate(new Chess(fen))).toBeLessThan(-800);
  });

  it("rewards a centralized knight over a knight in the corner", () => {
    const centralized = "4k3/8/8/4N3/8/8/8/4K3 w - - 0 1"; // Ne5
    const cornered = "4k3/8/8/8/8/8/8/N3K3 w - - 0 1"; //   Na1
    expect(evaluate(new Chess(centralized))).toBeGreaterThan(
      evaluate(new Chess(cornered)),
    );
  });

  it("is sign-symmetric for mirrored Positions", () => {
    // A White pawn on e4 vs the same pawn mirrored to a Black pawn on e5.
    const white = "4k3/8/8/8/4P3/8/8/4K3 w - - 0 1";
    const black = "4k3/8/8/4p3/8/8/8/4K3 w - - 0 1";
    expect(evaluate(new Chess(white))).toBe(-evaluate(new Chess(black)));
  });
});
