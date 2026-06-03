import type { Fen, UciString } from "../types.ts";
import type { SearchRequest, SearchResponse } from "./worker.ts";

/**
 * Bridges the Classical Engine on the main thread to its search {@link Worker}.
 * The worker is created lazily on the first request — so importing this module
 * (e.g. in a test runner without `Worker`) never spawns one — and requests are
 * matched to replies by id.
 */
interface Pending {
  resolve: (uci: UciString) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (event: MessageEvent<SearchResponse>) => {
    const data = event.data;
    const waiter = pending.get(data.id);
    if (!waiter) return;
    pending.delete(data.id);
    if ("error" in data) {
      waiter.reject(new Error(`Classical Engine worker: ${data.error}`));
    } else {
      waiter.resolve(data.uci);
    }
  };
  worker.onerror = (event) => {
    const error = new Error(`Classical Engine worker crashed: ${event.message}`);
    for (const waiter of pending.values()) waiter.reject(error);
    pending.clear();
  };
  return worker;
}

/** Run the Classical search for a Position at the given depth, off the main thread. */
export function runClassicalSearch(fen: Fen, depth: number): Promise<UciString> {
  const instance = getWorker();
  const id = nextId++;
  return new Promise<UciString>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    instance.postMessage({ id, fen, depth } satisfies SearchRequest);
  });
}
