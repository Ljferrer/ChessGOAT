import { describe, it, expect } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Square } from "chess.js";
import { useChessGame, type ChessGame, PLY_CAP } from "../game/useChessGame.ts";

/**
 * Acceptance criterion (2): games reach REAL end states and the autoplay loop
 * STOPS with the correct stop reason — plus the ~400-ply backstop exists.
 *
 * We drive Fool's mate with both sides human (deterministic), reaching a genuine
 * checkmate, then hand BOTH sides to an Engine and prove autoplay refuses to move
 * from the terminal Position. terminal.test.ts separately proves every terminal
 * reason (stalemate/threefold/insufficient/fifty-move) is classified correctly.
 */

/**
 * Play a from→to move through the click-to-move interface. Re-reads
 * `onSquareClick` for each click: selecting a piece changes `selected`, so the hook
 * hands back a fresh callback — a captured reference would be stale by the 2nd click.
 */
function clickMove(
  result: { current: ChessGame },
  from: Square,
  to: Square,
): void {
  act(() => result.current.onSquareClick(from));
  act(() => result.current.onSquareClick(to));
}

describe("autoplay stop conditions", () => {
  it("reaches a real checkmate and the status line names the winner", () => {
    const { result } = renderHook(() => useChessGame());
    // Both sides human so the mate is deterministic, not engine-dependent.
    act(() => result.current.setController("b", "human"));

    // Fool's mate: 1. f3 e5 2. g4 Qh4#
    clickMove(result, "f2", "f3");
    clickMove(result, "e7", "e5");
    clickMove(result, "g2", "g4");
    clickMove(result, "d8", "h4");

    expect(result.current.status.isGameOver).toBe(true);
    expect(result.current.status.outcome).toBe("checkmate");
    expect(result.current.status.winner).toBe("b");
    expect(result.current.status.text).toMatch(/Checkmate — Black wins/);
  });

  it("autoplay does not move once a terminal Position is reached", async () => {
    const { result } = renderHook(() => useChessGame());
    act(() => result.current.setController("b", "human"));

    clickMove(result, "f2", "f3");
    clickMove(result, "e7", "e5");
    clickMove(result, "g2", "g4");
    clickMove(result, "d8", "h4");

    const matedFen = result.current.fen;
    expect(result.current.status.outcome).toBe("checkmate");

    // Hand BOTH sides to an Engine. A live game would now autoplay; a finished
    // one must not — the autoplay effect bails on isGameOver.
    act(() => result.current.setController("w", "random"));
    act(() => result.current.setController("b", "random"));

    // Give the move-delay timer ample time to fire if it were ever scheduled.
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(result.current.fen).toBe(matedFen);
    expect(result.current.status.outcome).toBe("checkmate");
    expect(result.current.isThinking).toBe(false);
  });

  it("exposes the ~400-ply backstop so Engine-vs-Engine can never loop forever", () => {
    // The autoplay effect guards on `snap.plies >= PLY_CAP` and surfaces
    // `plyCapReached` (useChessGame.ts) — verified here as the documented constant.
    expect(PLY_CAP).toBe(400);
  });

  it("does not flag the ply cap at the start of a game", async () => {
    const { result } = renderHook(() => useChessGame());
    // White human, Black Random: a fresh game is nowhere near the cap.
    clickMove(result, "e2", "e4");
    await waitFor(() => expect(result.current.status.turn).toBe("w"));
    expect(result.current.plyCapReached).toBe(false);
  });
});
