import { describe, it, expect } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useChessGame } from "../game/useChessGame.ts";

describe("useChessGame — human + engine play", () => {
  it("starts with White to move and White human-controlled", () => {
    const { result } = renderHook(() => useChessGame());
    expect(result.current.status.turn).toBe("w");
    expect(result.current.controllers.w).toBe("human");
    expect(result.current.awaitingHuman).toBe(true);
  });

  it("selects a piece and surfaces its legal targets", () => {
    const { result } = renderHook(() => useChessGame());
    act(() => result.current.onSquareClick("e2"));
    expect(result.current.selected).toBe("e2");
    expect(result.current.legalTargets.has("e3")).toBe(true);
    expect(result.current.legalTargets.has("e4")).toBe(true);
  });

  it("applies a legal human move via click-to-move", () => {
    const { result } = renderHook(() => useChessGame());
    // Make both sides human so no engine reply interferes with the assertion.
    act(() => result.current.setController("b", "human"));
    act(() => result.current.onSquareClick("e2"));
    act(() => result.current.onSquareClick("e4"));
    expect(result.current.fen.startsWith("rnbqkbnr/pppppppp/8/8/4P3")).toBe(true);
    expect(result.current.status.turn).toBe("b");
    expect(result.current.lastMove).toEqual({ from: "e2", to: "e4" });
  });

  it("ignores an illegal target by clearing the selection", () => {
    const { result } = renderHook(() => useChessGame());
    act(() => result.current.setController("b", "human"));
    act(() => result.current.onSquareClick("e2"));
    act(() => result.current.onSquareClick("e5")); // not legal for a first pawn move
    expect(result.current.selected).toBeNull();
    expect(result.current.status.turn).toBe("w"); // no move was made
  });

  it("auto-plays the Engine side after a human move", async () => {
    const { result } = renderHook(() => useChessGame()); // Black defaults to Random
    act(() => result.current.onSquareClick("e2"));
    act(() => result.current.onSquareClick("e4"));
    expect(result.current.status.turn).toBe("b");
    // The Random engine should reply and hand the move back to White.
    await waitFor(() => expect(result.current.status.turn).toBe("w"));
    expect(result.current.canUndo).toBe(true);
  });

  it("undo removes one ply and pauses autoplay", async () => {
    const { result } = renderHook(() => useChessGame());
    act(() => result.current.onSquareClick("e2"));
    act(() => result.current.onSquareClick("e4"));
    await waitFor(() => expect(result.current.status.turn).toBe("w"));
    const pliesBefore = result.current.fen; // capture position after engine reply

    act(() => result.current.undo());
    expect(result.current.autoplayPaused).toBe(true);
    expect(result.current.fen).not.toBe(pliesBefore);
  });

  it("reset returns to the starting Position", () => {
    const { result } = renderHook(() => useChessGame());
    act(() => result.current.setController("b", "human"));
    act(() => result.current.onSquareClick("e2"));
    act(() => result.current.onSquareClick("e4"));
    act(() => result.current.reset());
    expect(result.current.fen).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(result.current.canUndo).toBe(false);
  });
});
