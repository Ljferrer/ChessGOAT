import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { selectGreedyMove, greedyEngine } from "../engines/greedy.ts";

const START = new Chess().fen();

describe("selectGreedyMove", () => {
  it("takes the highest-value capture when several are available", () => {
    // White pawn e4 can capture the queen on d5 or the pawn on f5 → grabs the queen.
    const fen = "4k3/8/8/3q1p2/4P3/8/8/4K3 w - - 0 1";
    expect(selectGreedyMove(fen)).toBe("e4d5");
  });

  it("breaks ties by staying within the set of best captures", () => {
    // White pawn d4 can capture either knight (both worth 3).
    const fen = "4k3/8/8/2n1n3/3P4/8/8/4K3 w - - 0 1";
    const best = new Set(["d4c5", "d4e5"]);
    expect(best.has(selectGreedyMove(fen, () => 0))).toBe(true);
    expect(best.has(selectGreedyMove(fen, () => 0.999))).toBe(true);
  });

  it("falls back to a random legal move when no capture exists", () => {
    // Start position has no captures → behaves like Random (rng 0 → a2a3).
    expect(selectGreedyMove(START, () => 0)).toBe("a2a3");
  });

  it("values an en passant capture as a pawn and takes it", () => {
    const fen = "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1";
    expect(selectGreedyMove(fen)).toBe("e5d6");
  });

  it("throws when the Position is terminal (no legal moves)", () => {
    const stalemate = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";
    expect(() => selectGreedyMove(stalemate)).toThrow(/no legal moves/);
  });
});

describe("greedyEngine", () => {
  it("implements the Engine contract", async () => {
    expect(greedyEngine.id).toBe("greedy");
    const fen = "4k3/8/8/3q1p2/4P3/8/8/4K3 w - - 0 1";
    expect(await greedyEngine.getMove(fen)).toBe("e4d5");
  });
});
