import type { Engine, Fen, UciString } from "../types.ts";
import { getSettings } from "../settings.ts";
import {
  createWorkerTransport,
  type UciTransport,
} from "./transport.ts";
import {
  goCommand,
  isReadyOk,
  parseBestMove,
  positionCommand,
  skillOption,
} from "./protocol.ts";

/**
 * Roster Stockfish Engine (CONTEXT.md) — the modern-SOTA entry, the vendored
 * single-threaded WASM build playing in the browser. It implements the same
 * `getMove(fen)` contract as every other Engine; under the hood it drives the
 * engine over UCI: handshake once, then for each Move set the configured strength,
 * load the Position, search to the configured depth, and resolve with `bestmove`.
 * The transport is injected so the logic is testable without the real worker.
 */

/** Where the vendored worker script is served from (see public/stockfish). */
export const STOCKFISH_WORKER_URL = "/stockfish/stockfish.js";

export function createStockfishEngine(transport: UciTransport): Engine {
  let ready: Promise<void> | null = null;

  /** Run the `uci` → `isready` → `readyok` handshake exactly once. */
  function init(): Promise<void> {
    if (ready) return ready;
    ready = new Promise<void>((resolve) => {
      const unsubscribe = transport.subscribe((line) => {
        if (isReadyOk(line)) {
          unsubscribe();
          resolve();
        }
      });
      transport.send("uci");
      transport.send("isready");
    });
    return ready;
  }

  async function getMove(fen: Fen): Promise<UciString> {
    await init();
    const { stockfishSkill, stockfishDepth } = getSettings();

    return new Promise<UciString>((resolve, reject) => {
      const unsubscribe = transport.subscribe((line) => {
        if (!line.startsWith("bestmove")) return;
        unsubscribe();
        const move = parseBestMove(line);
        if (move) {
          resolve(move);
        } else {
          reject(new Error("Roster Stockfish: no legal move for this Position"));
        }
      });

      transport.send(skillOption(stockfishSkill));
      transport.send(positionCommand(fen));
      transport.send(goCommand(stockfishDepth));
    });
  }

  return {
    id: "stockfish",
    label: "Roster Stockfish (WASM)",
    description:
      "Single-threaded Stockfish compiled to WebAssembly; strength via a skill/depth slider.",
    getMove,
  };
}

/** The default Roster Stockfish Engine, backed by the vendored WASM worker. */
export const stockfishEngine: Engine = createStockfishEngine(
  createWorkerTransport(STOCKFISH_WORKER_URL),
);
