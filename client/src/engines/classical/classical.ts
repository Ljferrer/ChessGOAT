import type { Engine, Fen } from "../types.ts";
import { getSettings, type SearchRunner } from "../settings.ts";
import { runClassicalSearch } from "./workerRunner.ts";

/**
 * Classical alpha-beta Engine (CONTEXT.md) — the Deep Blue family entry. The
 * actual search runs in a Web Worker; this object is the thin {@link Engine}
 * adapter that hands the current Position and configured depth to a runner and
 * resolves with the chosen Move (UCI). The runner is injected so the search can
 * be exercised directly in tests without a real Worker.
 */
export function createClassicalEngine(run: SearchRunner): Engine {
  return {
    id: "classical",
    label: "Classical (alpha-beta)",
    description:
      "From-scratch depth-limited minimax with alpha-beta pruning and a handcrafted evaluation.",
    getMove: (fen: Fen) => run(fen, getSettings().classicalDepth),
  };
}

/** The default Classical Engine, backed by the Web Worker search. */
export const classicalEngine: Engine = createClassicalEngine(runClassicalSearch);
