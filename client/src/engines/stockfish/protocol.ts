import type { Fen, UciString } from "../types.ts";

/**
 * Pure helpers for the slice of the UCI protocol the Roster Stockfish Engine
 * speaks (see CONTEXT.md). The WASM engine communicates in newline-delimited UCI
 * text; these functions build the commands we send and interpret the lines we
 * receive, kept separate from the Worker plumbing so they are trivially testable.
 */

/**
 * Extract the chosen Move (UCI) from a `bestmove` line, e.g.
 * `"bestmove e2e4 ponder e7e5"` → `"e2e4"`. Returns null for `bestmove (none)`
 * (no legal move) and for any line that is not a bestmove line.
 */
export function parseBestMove(line: string): UciString | null {
  const match = line.match(/^bestmove\s+(\S+)/);
  if (!match) return null;
  const move = match[1];
  return move === "(none)" ? null : move;
}

/** True for the `uciok` handshake line (engine finished announcing options). */
export function isUciOk(line: string): boolean {
  return line.trim() === "uciok";
}

/** True for the `readyok` handshake line (engine is initialised and idle). */
export function isReadyOk(line: string): boolean {
  return line.trim() === "readyok";
}

/** Command to load a Position from its FEN. */
export function positionCommand(fen: Fen): string {
  return `position fen ${fen}`;
}

/** Command to search the current Position to a fixed depth. */
export function goCommand(depth: number): string {
  return `go depth ${depth}`;
}

/** Command to set the engine's playing strength (0 = weakest … 20 = full). */
export function skillOption(skill: number): string {
  return `setoption name Skill Level value ${skill}`;
}
