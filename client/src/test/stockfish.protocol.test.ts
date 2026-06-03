import { describe, it, expect } from "vitest";
import {
  parseBestMove,
  isUciOk,
  isReadyOk,
  positionCommand,
  goCommand,
  skillOption,
} from "../engines/stockfish/protocol.ts";

describe("parseBestMove", () => {
  it("extracts the move from a bestmove line with a ponder", () => {
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toBe("e2e4");
  });

  it("extracts the move from a bestmove line without a ponder", () => {
    expect(parseBestMove("bestmove g1f3")).toBe("g1f3");
  });

  it("preserves a promotion suffix", () => {
    expect(parseBestMove("bestmove e7e8q")).toBe("e7e8q");
  });

  it("returns null when there is no legal move", () => {
    expect(parseBestMove("bestmove (none)")).toBeNull();
  });

  it("returns null for non-bestmove lines", () => {
    expect(parseBestMove("info depth 12 score cp 31 pv e2e4 e7e5")).toBeNull();
    expect(parseBestMove("readyok")).toBeNull();
  });
});

describe("handshake line predicates", () => {
  it("recognises uciok and readyok exactly", () => {
    expect(isUciOk("uciok")).toBe(true);
    expect(isReadyOk("readyok")).toBe(true);
    expect(isUciOk("uciok ")).toBe(true); // trailing whitespace tolerated
    expect(isReadyOk("info string readyok-ish")).toBe(false);
    expect(isUciOk("id name Stockfish")).toBe(false);
  });
});

describe("command builders", () => {
  it("builds a position command from a FEN", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(positionCommand(fen)).toBe(`position fen ${fen}`);
  });

  it("builds a depth-limited go command", () => {
    expect(goCommand(12)).toBe("go depth 12");
  });

  it("builds the Skill Level option", () => {
    expect(skillOption(7)).toBe("setoption name Skill Level value 7");
  });
});
