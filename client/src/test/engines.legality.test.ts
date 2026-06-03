import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { selectRandomMove } from "../engines/random.ts";
import { selectGreedyMove } from "../engines/greedy.ts";
import { selectClassicalMove } from "../engines/classical/search.ts";
import type { Fen, UciString } from "../engines/types.ts";

/**
 * Acceptance criterion (1): EVERY client-rules Engine returns ONLY legal Moves
 * across a battery of diverse Positions. Random, Greedy and Classical alpha-beta
 * run in the browser over chess.js move generation; this sweep proves their output
 * is always a legal Move for the Position they were handed.
 *
 * Stockfish (a UCI WASM worker) and the Searchless net (the backend) produce moves
 * outside this process: Stockfish's legality is intrinsic to the engine + the
 * `parseBestMove` contract (stockfish.protocol.test.ts), and the backend chooses
 * from `board.legal_moves` (backend test_returned_move_is_legal_for_position). See
 * docs/VERIFICATION.md for how all five engines are covered.
 */

/** A battery of non-terminal Positions exercising distinct move-generation paths. */
const POSITIONS: ReadonlyArray<{ name: string; fen: Fen }> = [
  {
    name: "opening (start)",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  },
  {
    name: "open middlegame (Italian)",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
  },
  {
    name: "tactical, castling both sides (Kiwipete)",
    fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
  },
  {
    name: "king-and-pawn endgame",
    fen: "8/8/8/4k3/8/8/4P3/4K3 w - - 0 1",
  },
  {
    name: "en passant available",
    fen: "rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3",
  },
  {
    name: "promotion available",
    fen: "4k3/P7/8/8/8/8/8/4K3 w - - 0 1",
  },
  {
    name: "side to move is in check (forced responses)",
    fen: "rnbqkbnr/ppp1pppp/8/1B1p4/8/4P3/PPPP1PPP/RNBQK1NR b KQkq - 1 2",
  },
  {
    name: "rook endgame",
    fen: "8/8/8/8/8/4k3/4p3/R3K3 w Q - 0 1",
  },
];

/** True when `uci` (long-algebraic) is a legal Move for the Position. */
function isLegal(fen: Fen, uci: UciString): boolean {
  return new Chess(fen).moves({ verbose: true }).some((m) => m.lan === uci);
}

/** A deterministic rng cycling across [0, 1) so we sample the whole move list. */
function steppedRng(steps: number): () => number {
  let i = 0;
  return () => {
    const value = (i % steps) / steps;
    i += 1;
    return value;
  };
}

describe("engine legality battery — every client engine, every position", () => {
  for (const { name, fen } of POSITIONS) {
    it(`Random returns only legal moves: ${name}`, () => {
      // Sweep the rng across the full move list so every branch is sampled.
      const rng = steppedRng(64);
      for (let trial = 0; trial < 64; trial += 1) {
        const uci = selectRandomMove(fen, rng);
        expect(isLegal(fen, uci), `illegal move ${uci} for ${fen}`).toBe(true);
      }
    });

    it(`Greedy returns only legal moves: ${name}`, () => {
      const rng = steppedRng(64);
      for (let trial = 0; trial < 64; trial += 1) {
        const uci = selectGreedyMove(fen, rng);
        expect(isLegal(fen, uci), `illegal move ${uci} for ${fen}`).toBe(true);
      }
    });

    it(`Classical returns a legal move at several depths: ${name}`, () => {
      // Exhaustive (no time budget) → deterministic; check depths 1–3.
      for (let depth = 1; depth <= 3; depth += 1) {
        const uci = selectClassicalMove(fen, depth);
        expect(isLegal(fen, uci), `illegal move ${uci} at depth ${depth}`).toBe(
          true,
        );
      }
    });
  }

  it("Random can reach a promotion and the promoted move is legal", () => {
    const fen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
    const rng = steppedRng(16);
    const promotions = new Set<string>();
    for (let trial = 0; trial < 64; trial += 1) {
      const uci = selectRandomMove(fen, rng);
      expect(isLegal(fen, uci)).toBe(true);
      if (uci.length === 5) promotions.add(uci[4]);
    }
    // The a7 pawn can promote to q/r/b/n — the sweep should surface a promotion.
    expect(promotions.size).toBeGreaterThan(0);
  });
});
