import { describe, it, expect, beforeEach } from "vitest";
import { createStockfishEngine } from "../engines/stockfish/stockfish.ts";
import type { UciTransport } from "../engines/stockfish/transport.ts";
import { setSettings } from "../engines/settings.ts";

/**
 * A scripted fake of the UCI worker: records every command sent and auto-replies
 * the way Stockfish would — `readyok` after `isready`, and a `bestmove` after a
 * `go`. This exercises the Engine's handshake and search flow with no real WASM.
 */
function createFakeTransport(bestmoveLine: string) {
  const sent: string[] = [];
  const handlers = new Set<(line: string) => void>();
  const emit = (line: string) => {
    for (const handler of [...handlers]) handler(line);
  };

  const transport: UciTransport = {
    send(command: string) {
      sent.push(command);
      if (command === "isready") emit("readyok");
      if (command.startsWith("go")) {
        emit("info depth 1 score cp 20 pv e2e4");
        emit(bestmoveLine);
      }
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };

  return { transport, sent };
}

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("createStockfishEngine", () => {
  beforeEach(() => {
    setSettings({ stockfishSkill: 5, stockfishDepth: 12 });
  });

  it("implements the Engine contract", () => {
    const { transport } = createFakeTransport("bestmove e2e4");
    const engine = createStockfishEngine(transport);
    expect(engine.id).toBe("stockfish");
    expect(engine.label.length).toBeGreaterThan(0);
    expect(engine.description.length).toBeGreaterThan(0);
  });

  it("handshakes, configures strength, loads the Position, and returns the move", async () => {
    const { transport, sent } = createFakeTransport("bestmove e2e4 ponder e7e5");
    const engine = createStockfishEngine(transport);

    const move = await engine.getMove(START);

    expect(move).toBe("e2e4");
    expect(sent).toContain("uci");
    expect(sent).toContain("isready");
    expect(sent).toContain("setoption name Skill Level value 5");
    expect(sent).toContain(`position fen ${START}`);
    expect(sent).toContain("go depth 12");
  });

  it("reflects updated settings on the next move", async () => {
    const { transport, sent } = createFakeTransport("bestmove d2d4");
    const engine = createStockfishEngine(transport);
    await engine.getMove(START);

    setSettings({ stockfishSkill: 20, stockfishDepth: 8 });
    await engine.getMove(START);

    expect(sent).toContain("setoption name Skill Level value 20");
    expect(sent).toContain("go depth 8");
    // The handshake runs only once, even across multiple moves.
    expect(sent.filter((c) => c === "uci")).toHaveLength(1);
  });

  it("rejects when the engine reports no legal move", async () => {
    const { transport } = createFakeTransport("bestmove (none)");
    const engine = createStockfishEngine(transport);
    await expect(engine.getMove(START)).rejects.toThrow(/no legal move/i);
  });
});
