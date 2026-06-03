import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { describeStatus } from "../game/terminal.ts";

describe("describeStatus", () => {
  it("reports an in-progress game with the side to move", () => {
    const status = describeStatus(new Chess());
    expect(status.isGameOver).toBe(false);
    expect(status.outcome).toBe("in_progress");
    expect(status.turn).toBe("w");
    expect(status.text).toBe("White to move");
  });

  it("flags check without ending the game", () => {
    const status = describeStatus(new Chess("4k3/8/8/8/7q/8/8/4K3 w - - 0 1"));
    expect(status.isGameOver).toBe(false);
    expect(status.inCheck).toBe(true);
    expect(status.text).toMatch(/in check/);
  });

  it("detects checkmate and names the winner", () => {
    const foolsMate = new Chess(
      "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3",
    );
    const status = describeStatus(foolsMate);
    expect(status.outcome).toBe("checkmate");
    expect(status.isGameOver).toBe(true);
    expect(status.winner).toBe("b");
    expect(status.text).toBe("Checkmate — Black wins");
  });

  it("detects stalemate as a draw with no winner", () => {
    const status = describeStatus(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"));
    expect(status.outcome).toBe("stalemate");
    expect(status.isGameOver).toBe(true);
    expect(status.winner).toBeNull();
  });

  it("detects insufficient material (king vs king)", () => {
    const status = describeStatus(new Chess("4k3/8/8/8/8/8/8/4K3 w - - 0 1"));
    expect(status.outcome).toBe("insufficient");
    expect(status.isGameOver).toBe(true);
  });

  it("detects the fifty-move rule via the halfmove clock", () => {
    const status = describeStatus(new Chess("4k3/8/8/8/8/8/4P3/4K3 w - - 100 80"));
    expect(status.outcome).toBe("fifty-move");
    expect(status.isGameOver).toBe(true);
  });

  it("detects threefold repetition", () => {
    const chess = new Chess();
    // Shuffle both knights out and back twice → start position seen three times.
    for (const move of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) {
      chess.move(move);
    }
    const status = describeStatus(chess);
    expect(status.outcome).toBe("threefold");
    expect(status.isGameOver).toBe(true);
  });
});
