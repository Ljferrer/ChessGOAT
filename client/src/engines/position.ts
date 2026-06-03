import { Chess } from "chess.js";
import type { Move } from "chess.js";
import type { Fen } from "./types.ts";

/**
 * Legal Moves for a Position, in chess.js verbose form. Shared by the client
 * Engines so each one derives its choice purely from the FEN it was handed.
 * Throws on an invalid FEN (fail fast at the boundary).
 */
export function legalMoves(fen: Fen): Move[] {
  const chess = new Chess(fen);
  return chess.moves({ verbose: true });
}

/** A deterministic-by-injection random source, defaulting to Math.random. */
export type Rng = () => number;

/** Pick one element uniformly at random. Caller guarantees a non-empty array. */
export function pickRandom<T>(items: readonly T[], rng: Rng): T {
  const index = Math.floor(rng() * items.length);
  return items[index];
}
