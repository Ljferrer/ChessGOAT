import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { selectRandomMove, randomEngine } from "../engines/random.ts";

const START = new Chess().fen();

describe("selectRandomMove", () => {
  it("returns a legal UCI move from the start position", () => {
    const legal = new Chess(START).moves({ verbose: true }).map((m) => m.lan);
    const move = selectRandomMove(START);
    expect(legal).toContain(move);
  });

  it("honors the injected rng to select deterministically", () => {
    // rng -> 0 selects the first legal move (a2a3 from the start position).
    expect(selectRandomMove(START, () => 0)).toBe("a2a3");
  });

  it("can reach the last legal move with rng near 1", () => {
    const legal = new Chess(START).moves({ verbose: true });
    expect(selectRandomMove(START, () => 0.999)).toBe(legal[legal.length - 1].lan);
  });

  it("throws when the Position is terminal (no legal moves)", () => {
    const checkmate = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    expect(() => selectRandomMove(checkmate)).toThrow(/no legal moves/);
  });
});

describe("randomEngine", () => {
  it("implements the Engine contract and resolves to a legal move", async () => {
    expect(randomEngine.id).toBe("random");
    const legal = new Chess(START).moves({ verbose: true }).map((m) => m.lan);
    const move = await randomEngine.getMove(START);
    expect(legal).toContain(move);
  });
});
