import type { PieceSymbol } from "chess.js";
import type { Engine, Fen, UciString } from "./types.ts";
import { legalMoves, pickRandom, type Rng } from "./position.ts";

/** Standard material values; the king is never a capture target. */
const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/** The value a Move captures (0 for a non-capture). En passant captures a pawn. */
function captureValue(captured: PieceSymbol | undefined): number {
  return captured ? PIECE_VALUE[captured] : 0;
}

/**
 * Greedy Engine — takes the highest-value capture available; ties are broken
 * randomly, and with no capture on offer it falls back to a random legal Move.
 *
 * @param rng injectable random source (defaults to Math.random) for testability.
 * @throws if the Position has no legal Moves (it is terminal).
 */
export function selectGreedyMove(fen: Fen, rng: Rng = Math.random): UciString {
  const moves = legalMoves(fen);
  if (moves.length === 0) {
    throw new Error("Greedy Engine: no legal moves in this Position");
  }

  let bestValue = 0;
  for (const move of moves) {
    const value = captureValue(move.captured);
    if (value > bestValue) bestValue = value;
  }

  // No capture beats a non-capture → behave like Random over all legal moves.
  if (bestValue === 0) {
    return pickRandom(moves, rng).lan;
  }

  const bestCaptures = moves.filter((m) => captureValue(m.captured) === bestValue);
  return pickRandom(bestCaptures, rng).lan;
}

export const greedyEngine: Engine = {
  id: "greedy",
  label: "Greedy",
  description: "Grabs the most valuable capture; otherwise plays at random.",
  getMove: (fen) => Promise.resolve(selectGreedyMove(fen)),
};
