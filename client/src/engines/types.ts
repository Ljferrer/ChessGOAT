/**
 * The Engine contract — the canonical unit of ChessGOAT (see CONTEXT.md).
 *
 * An Engine is a move-producing strategy: given a Position, it returns one legal
 * Move. Random, Greedy, Classical alpha-beta, Stockfish, and the Searchless net are
 * each an Engine. Engines derive everything from the Position and hold NO game
 * history — that statelessness is what makes mid-game swapping free.
 */

/** A Position, encoded as a FEN string. The only input an Engine ever receives. */
export type Fen = string;

/**
 * A Move in UCI long-algebraic notation: "e2e4", "e7e8q" (promotion suffix).
 * The single value every Engine's `getMove` returns — the contract shared by all
 * client Engines and, later, the Searchless backend.
 */
export type UciString = string;

/**
 * The interface every Engine implements. Identical for trivial heuristics and the
 * neural backend alike; for the Searchless engine `getMove` is simply an HTTP call.
 */
export interface Engine {
  /** Stable identifier used by the per-side selector and persistence. */
  readonly id: string;
  /** UI-facing label (the side's "Brain"). */
  readonly label: string;
  /** One-line description shown in the selector. */
  readonly description: string;
  /**
   * Given a Position (FEN), resolve to one legal Move (UCI). Async so the contract
   * holds whether the work is local (heuristics) or remote (the Searchless backend).
   */
  getMove(fen: Fen): Promise<UciString>;
}
