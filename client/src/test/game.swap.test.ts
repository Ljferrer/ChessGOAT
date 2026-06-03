import { describe, it, expect } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Chess } from "chess.js";
import { useChessGame } from "../game/useChessGame.ts";

/**
 * Acceptance criterion (3): mid-game Engine swapping works on BOTH sides without
 * corrupting the game. Engines hold no history (CONTEXT.md) — they receive only the
 * current FEN — so reassigning either side's controller mid-game must keep play
 * legal and continuous. We use the two synchronous, worker-free Engines (Random,
 * Greedy) so the assertion is fast and deterministic in jsdom.
 */
describe("mid-game engine swapping", () => {
  it("swaps the human side to an Engine and changes the other side mid-game", async () => {
    const { result } = renderHook(() => useChessGame()); // W human, B random

    // A human opening move, then let Black's Random engine reply.
    act(() => result.current.onSquareClick("e2"));
    act(() => result.current.onSquareClick("e4"));
    await waitFor(() => expect(result.current.status.turn).toBe("w"));

    const pliesBefore = new Chess(result.current.fen).history().length;
    expect(result.current.fen).toBeTruthy();

    // Swap BOTH sides mid-game: White (was Human) → Greedy, Black → Greedy.
    act(() => result.current.setController("w", "greedy"));
    act(() => result.current.setController("b", "greedy"));

    // Both Engines should now drive autoplay forward several plies, legally.
    await waitFor(
      () => {
        const plies = new Chess(result.current.fen).history().length;
        expect(plies).toBeGreaterThan(pliesBefore + 2);
      },
      { timeout: 4000 },
    );

    // The position is never corrupted: every snapshot parses as a valid game.
    expect(() => new Chess(result.current.fen)).not.toThrow();
    expect(result.current.awaitingHuman).toBe(false);
  });

  it("swapping a controller resumes autoplay even after it was paused", async () => {
    const { result } = renderHook(() => useChessGame());

    act(() => result.current.onSquareClick("e2"));
    act(() => result.current.onSquareClick("e4"));
    await waitFor(() => expect(result.current.status.turn).toBe("w"));

    // Undo pauses autoplay (criterion 6) ...
    act(() => result.current.undo());
    expect(result.current.autoplayPaused).toBe(true);

    // ... and assigning a controller is an explicit intent to play → resumes.
    act(() => result.current.setController("b", "greedy"));
    expect(result.current.autoplayPaused).toBe(false);
  });

  it("a swapped-in Engine plays from the live FEN, holding no prior history", async () => {
    const { result } = renderHook(() => useChessGame());
    act(() => result.current.setController("b", "human"));

    // Build a specific mid-game Position with human moves on both sides.
    const line: [string, string][] = [
      ["e2", "e4"],
      ["c7", "c5"],
      ["g1", "f3"],
      ["d7", "d6"],
    ];
    for (const [from, to] of line) {
      act(() => result.current.onSquareClick(from as never));
      act(() => result.current.onSquareClick(to as never));
    }
    const fenAtSwap = result.current.fen;
    expect(result.current.status.turn).toBe("w");

    // Hand White to Greedy now. It must produce a legal move for THIS Position.
    act(() => result.current.setController("w", "greedy"));
    await waitFor(() => expect(result.current.fen).not.toBe(fenAtSwap));

    // The move it played was legal for the exact FEN it was handed — proof the
    // Engine derived everything from the Position and carried no prior history.
    const played = result.current.lastMove;
    expect(played).not.toBeNull();
    const legalFromSwap = new Chess(fenAtSwap).moves({ verbose: true });
    expect(
      legalFromSwap.some((m) => m.from === played!.from && m.to === played!.to),
    ).toBe(true);
    expect(() => new Chess(result.current.fen)).not.toThrow();
  });
});
