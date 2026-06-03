import type { Engine, Fen, UciString } from "./types.ts";
import { legalMoves, pickRandom, type Rng } from "./position.ts";

/**
 * Random Engine — picks any legal Move with uniform probability.
 * The baseline of the roster.
 *
 * @param rng injectable random source (defaults to Math.random) for testability.
 * @throws if the Position has no legal Moves (it is terminal).
 */
export function selectRandomMove(fen: Fen, rng: Rng = Math.random): UciString {
  const moves = legalMoves(fen);
  if (moves.length === 0) {
    throw new Error("Random Engine: no legal moves in this Position");
  }
  return pickRandom(moves, rng).lan;
}

export const randomEngine: Engine = {
  id: "random",
  label: "Random",
  description: "Plays any legal move, chosen uniformly at random.",
  getMove: (fen) => Promise.resolve(selectRandomMove(fen)),
};
