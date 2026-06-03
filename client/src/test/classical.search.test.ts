import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { selectClassicalMove } from "../engines/classical/search.ts";
import { classicalEngine } from "../engines/classical/classical.ts";

const START = new Chess().fen();

/** Every Move the engine returns must be legal in the given Position. */
function isLegal(fen: string, uci: string): boolean {
  const moves = new Chess(fen).moves({ verbose: true });
  return moves.some((m) => m.lan === uci);
}

describe("selectClassicalMove", () => {
  it("returns a legal move from the opening Position", () => {
    const uci = selectClassicalMove(START, 2);
    expect(isLegal(START, uci)).toBe(true);
  });

  it("grabs a hanging queen even at shallow depth", () => {
    // White rook on a1 can capture the undefended Black queen on a8.
    const fen = "q3k3/8/8/8/8/8/8/R3K3 w - - 0 1";
    expect(selectClassicalMove(fen, 2)).toBe("a1a8");
  });

  it("does NOT take a defended pawn that loses material (sees the recapture)", () => {
    // The White queen could grab the b7 pawn, but the Black queen defends it; a
    // search that looks past the capture must avoid hanging its own queen.
    const fen = "1q2k3/1p6/8/8/8/8/6Q1/4K3 w - - 0 1";
    const uci = selectClassicalMove(fen, 3);
    expect(isLegal(fen, uci)).toBe(true);
    expect(uci).not.toBe("g2b7");
  });

  it("finds a back-rank mate in one", () => {
    const fen = "6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1";
    expect(selectClassicalMove(fen, 2)).toBe("a1a8");
  });

  it("prefers a forced mate over winning a queen", () => {
    // White can win the loose Black queen with Qxa5, or play Re8# — a search that
    // scores mate above material must choose the mate.
    const fen = "6k1/5ppp/8/q7/8/8/8/Q3R1K1 w - - 0 1";
    expect(selectClassicalMove(fen, 3)).toBe("e1e8");
  });

  it("throws when the Position is terminal (no legal moves)", () => {
    const stalemate = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";
    expect(() => selectClassicalMove(stalemate, 2)).toThrow(/no legal moves/i);
  });

  it("is deterministic for a fixed Position and depth", () => {
    const fen = "1q2k3/1p6/8/8/8/8/6Q1/4K3 w - - 0 1";
    expect(selectClassicalMove(fen, 3)).toBe(selectClassicalMove(fen, 3));
  });

  it("respects a tiny time budget by returning a legal move from a shallow pass", () => {
    // A 1ms budget cannot finish deep iterations, but iterative deepening always
    // leaves a completed depth-1 result to return.
    const uci = selectClassicalMove(START, 6, 1);
    expect(isLegal(START, uci)).toBe(true);
  });
});

describe("classicalEngine contract", () => {
  it("exposes a stable id, label, and description", () => {
    expect(classicalEngine.id).toBe("classical");
    expect(classicalEngine.label.length).toBeGreaterThan(0);
    expect(classicalEngine.description.length).toBeGreaterThan(0);
  });
});
