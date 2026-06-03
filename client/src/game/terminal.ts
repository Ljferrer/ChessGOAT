import type { Chess, Color } from "chess.js";

/** Why a game is over, or that it is still live. */
export type Outcome =
  | "in_progress"
  | "checkmate"
  | "stalemate"
  | "threefold"
  | "insufficient"
  | "fifty-move"
  | "draw";

export interface GameStatus {
  isGameOver: boolean;
  outcome: Outcome;
  /** Side to move. */
  turn: Color;
  inCheck: boolean;
  /** Decisive winner, or null for draws / in-progress. */
  winner: Color | null;
  /** Human-readable status line for the UI. */
  text: string;
}

const SIDE_NAME: Record<Color, string> = { w: "White", b: "Black" };

/** Halfmove clock of 100 (50 full moves) without progress → fifty-move rule. */
const FIFTY_MOVE_HALFMOVES = 100;

function halfmoveClock(chess: Chess): number {
  const field = chess.fen().split(" ")[4];
  const clock = Number.parseInt(field, 10);
  return Number.isNaN(clock) ? 0 : clock;
}

/**
 * Classify the current Position into a {@link GameStatus}. Pure read over a
 * chess.js instance — distinguishes every terminal reason the UI surfaces
 * (checkmate, stalemate, threefold, insufficient material, fifty-move) from an
 * ongoing game, and names the check / side-to-move state otherwise.
 */
export function describeStatus(chess: Chess): GameStatus {
  const turn = chess.turn();
  const inCheck = chess.isCheck();

  if (chess.isCheckmate()) {
    const winner: Color = turn === "w" ? "b" : "w";
    return {
      isGameOver: true,
      outcome: "checkmate",
      turn,
      inCheck,
      winner,
      text: `Checkmate — ${SIDE_NAME[winner]} wins`,
    };
  }

  if (chess.isStalemate()) {
    return drawStatus("stalemate", turn, inCheck, "Draw — stalemate");
  }
  if (chess.isThreefoldRepetition()) {
    return drawStatus("threefold", turn, inCheck, "Draw — threefold repetition");
  }
  if (chess.isInsufficientMaterial()) {
    return drawStatus("insufficient", turn, inCheck, "Draw — insufficient material");
  }
  if (chess.isDraw()) {
    const fiftyMove = halfmoveClock(chess) >= FIFTY_MOVE_HALFMOVES;
    return fiftyMove
      ? drawStatus("fifty-move", turn, inCheck, "Draw — fifty-move rule")
      : drawStatus("draw", turn, inCheck, "Draw");
  }

  const toMove = SIDE_NAME[turn];
  return {
    isGameOver: false,
    outcome: "in_progress",
    turn,
    inCheck,
    winner: null,
    text: inCheck ? `${toMove} to move — in check` : `${toMove} to move`,
  };
}

function drawStatus(
  outcome: Outcome,
  turn: Color,
  inCheck: boolean,
  text: string,
): GameStatus {
  return { isGameOver: true, outcome, turn, inCheck, winner: null, text };
}
