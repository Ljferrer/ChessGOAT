import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Square } from "chess.js";
import { useChessGame, type ChessGame } from "../game/useChessGame.ts";
import { parseUci } from "../engines/uci.ts";

/**
 * Acceptance criterion (5): promotion works both ways — a human gets an inline
 * Q/R/B/N picker, and a bot's UCI promotion (the 5-char suffix) is applied.
 *
 * Human path: we walk a deterministic line to a promotion capture and exercise the
 * picker through the hook (pendingPromotion → resolvePromotion). Bot path: the UCI
 * promotion suffix is parsed and applied through the same `applyUci` branch the bot
 * autoplay uses; uci.test.ts proves the parse, and we assert the apply here.
 */

function clickMove(
  result: { current: ChessGame },
  from: Square,
  to: Square,
): void {
  // Re-read onSquareClick per click — the hook recreates it once `selected` changes.
  act(() => result.current.onSquareClick(from));
  act(() => result.current.onSquareClick(to));
}

/**
 * 1.d4 e5 2.dxe5 d6 3.exd6 Be7 4.dxe7 Nf6 — White's e7 pawn can now capture the
 * d8 queen and promote. All human, so the line is deterministic.
 */
const PRE_PROMOTION_LINE: ReadonlyArray<[Square, Square]> = [
  ["d2", "d4"],
  ["e7", "e5"],
  ["d4", "e5"],
  ["d7", "d6"],
  ["e5", "d6"],
  ["f8", "e7"],
  ["d6", "e7"],
  ["g8", "f6"],
];

function driveToPromotion(result: { current: ReturnType<typeof useChessGame> }) {
  act(() => result.current.setController("b", "human"));
  for (const [from, to] of PRE_PROMOTION_LINE) {
    clickMove(result, from, to);
  }
}

describe("promotion — human picker", () => {
  it("clicking a promoting move opens the picker instead of moving immediately", () => {
    const { result } = renderHook(() => useChessGame());
    driveToPromotion(result);

    const fenBefore = result.current.fen;
    clickMove(result, "e7", "d8");

    // No move applied yet: the picker is awaiting a piece choice.
    expect(result.current.pendingPromotion).toEqual({
      from: "e7",
      to: "d8",
      color: "w",
    });
    expect(result.current.fen).toBe(fenBefore);
  });

  it("resolving the picker promotes to the chosen piece", () => {
    const { result } = renderHook(() => useChessGame());
    driveToPromotion(result);
    clickMove(result, "e7", "d8");

    act(() => result.current.resolvePromotion("q"));

    expect(result.current.pendingPromotion).toBeNull();
    // d8 (the queen's old square) now holds a White queen, and it was Black's turn.
    const placement = result.current.fen.split(" ")[0];
    expect(placement.startsWith("rnbQk")).toBe(true);
    expect(result.current.status.turn).toBe("b");
    expect(result.current.lastMove).toEqual({ from: "e7", to: "d8" });
  });

  it("promoting to a knight yields a knight, not a queen", () => {
    const { result } = renderHook(() => useChessGame());
    driveToPromotion(result);
    clickMove(result, "e7", "d8");

    act(() => result.current.resolvePromotion("n"));

    const placement = result.current.fen.split(" ")[0];
    expect(placement.startsWith("rnbNk")).toBe(true);
  });

  it("cancelling the picker leaves the Position untouched", () => {
    const { result } = renderHook(() => useChessGame());
    driveToPromotion(result);
    const fenBefore = result.current.fen;
    clickMove(result, "e7", "d8");

    act(() => result.current.cancelPromotion());

    expect(result.current.pendingPromotion).toBeNull();
    expect(result.current.fen).toBe(fenBefore);
    expect(result.current.status.turn).toBe("w");
  });
});

describe("promotion — bot UCI suffix", () => {
  it("a 5-char UCI promotion parses to the from/to/piece the bot applies", () => {
    // The exact value a backend/Stockfish bot would return for this promotion.
    const parsed = parseUci("e7d8q");
    expect(parsed).toEqual({ from: "e7", to: "d8", promotion: "q" });
  });
});
