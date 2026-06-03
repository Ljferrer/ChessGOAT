/// <reference lib="webworker" />
import { selectClassicalMove, DEFAULT_TIME_BUDGET_MS } from "./search.ts";

/**
 * Web Worker entry point for the Classical alpha-beta Engine. Running the search
 * off the main thread is what lets the UI stay responsive while the Engine thinks
 * (PLAN.md: "runs in a Web Worker, UI never freezes"). Each message carries a
 * request id so the main thread can match replies to in-flight requests.
 */
export interface SearchRequest {
  id: number;
  fen: string;
  depth: number;
}

export type SearchResponse =
  | { id: number; uci: string }
  | { id: number; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<SearchRequest>) => {
  const { id, fen, depth } = event.data;
  try {
    const uci = selectClassicalMove(fen, depth, DEFAULT_TIME_BUDGET_MS);
    ctx.postMessage({ id, uci } satisfies SearchResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.postMessage({ id, error: message } satisfies SearchResponse);
  }
};
