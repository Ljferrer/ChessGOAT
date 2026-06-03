import { Chess } from "chess.js";
import type { Move, PieceSymbol } from "chess.js";
import type { Fen, UciString } from "../types.ts";
import { evaluate } from "./eval.ts";

/**
 * The from-scratch search Engine (CONTEXT.md "Classical alpha-beta"): depth-limited
 * negamax with alpha-beta pruning over the handcrafted {@link evaluate}. Move
 * ordering (MVV-LVA) sharpens the pruning. Because chess.js move generation is the
 * dominant cost, the search runs as **iterative deepening under a soft time cap** —
 * the depth argument is a ceiling, but the engine returns the best line from the
 * deepest iteration that finished within the budget, so a single move never hangs
 * the game regardless of how tangled the Position is. With no budget the search is
 * exhaustive to the target depth and fully deterministic (used by the tests).
 */

/** A mate score, offset by ply so the search prefers faster mates. */
const MATE = 1_000_000;
/** Default soft budget per move (ms); the live Engine searches no longer than this. */
export const DEFAULT_TIME_BUDGET_MS = 2_000;
/** Check the clock once per this many nodes, so timing barely costs anything. */
const NODES_PER_TIME_CHECK = 2_048;
/** Capture victim/attacker values for MVV-LVA move ordering. */
const ORDER_VALUE: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20_000,
};

/** Thrown internally to abandon a depth iteration once the budget is spent. */
class TimeUp extends Error {}

/** Evaluation relative to the side to move (negamax convention). */
function relativeEval(chess: Chess): number {
  const score = evaluate(chess);
  return chess.turn() === "w" ? score : -score;
}

/** MVV-LVA: order captures (most-valuable-victim, least-valuable-attacker) first. */
function orderMoves(moves: Move[]): Move[] {
  const scored = moves.map((move) => {
    let rank = 0;
    if (move.captured) {
      rank = 10 * ORDER_VALUE[move.captured] - ORDER_VALUE[move.piece];
    }
    if (move.promotion) rank += ORDER_VALUE[move.promotion];
    return { move, rank };
  });
  scored.sort((a, b) => b.rank - a.rank);
  return scored.map((s) => s.move);
}

/** A running deadline; checked sparingly to keep the hot loop cheap. */
interface Clock {
  deadline: number;
  nodes: number;
}

function tick(clock: Clock): void {
  clock.nodes++;
  if (clock.nodes % NODES_PER_TIME_CHECK === 0 && now() >= clock.deadline) {
    throw new TimeUp();
  }
}

/** Monotonic clock; `performance` is available in both the Worker and tests. */
function now(): number {
  return typeof performance !== "undefined" ? performance.now() : 0;
}

/** Negamax with alpha-beta pruning; returns the score for the side to move. */
function negamax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  clock: Clock,
): number {
  tick(clock);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    // No legal moves: checkmate (bad for side to move) or stalemate (draw).
    return chess.isCheckmate() ? -(MATE - ply) : 0;
  }
  if (depth === 0) return relativeEval(chess);

  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, clock);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // beta cutoff
  }
  return best;
}

/** One full-width search of the root moves to a fixed depth, returning the best. */
function searchToDepth(
  chess: Chess,
  rootMoves: Move[],
  depth: number,
  clock: Clock,
): { move: Move; score: number } {
  let bestScore = -Infinity;
  let bestMove = rootMoves[0];
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of rootMoves) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, 1, clock);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
  }
  return { move: bestMove, score: bestScore };
}

/**
 * Choose the best Move for a Position by searching up to {@link maxDepth} via
 * iterative deepening. Returns the Move in UCI long-algebraic form (the universal
 * Engine contract). With `timeBudgetMs = Infinity` the search completes every
 * depth and is deterministic; with a finite budget it returns the best move from
 * the deepest iteration that finished in time.
 *
 * @throws if the Position is terminal (no legal Moves).
 */
export function selectClassicalMove(
  fen: Fen,
  maxDepth: number,
  timeBudgetMs: number = Infinity,
): UciString {
  const chess = new Chess(fen);
  let rootMoves = orderMoves(chess.moves({ verbose: true }));
  if (rootMoves.length === 0) {
    throw new Error("Classical Engine: no legal moves in this Position");
  }

  const clock: Clock = { deadline: now() + timeBudgetMs, nodes: 0 };
  let best = rootMoves[0];

  for (let depth = 1; depth <= maxDepth; depth++) {
    try {
      const result = searchToDepth(chess, rootMoves, depth, clock);
      best = result.move;
      // Search the previous-best move first next iteration → more cutoffs.
      rootMoves = [best, ...rootMoves.filter((m) => m !== best)];
    } catch (error) {
      if (error instanceof TimeUp) break; // keep the deepest completed result
      throw error;
    }
  }

  return best.lan;
}
