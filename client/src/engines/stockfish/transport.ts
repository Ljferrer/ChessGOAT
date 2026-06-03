/**
 * The thin message channel the Stockfish Engine talks over. Abstracting it lets
 * the Engine logic (handshake, search request) be tested against a fake while the
 * real implementation wraps the vendored WASM {@link Worker}.
 */
export interface UciTransport {
  /** Send one UCI command line to the engine. */
  send(command: string): void;
  /** Subscribe to engine output lines; returns an unsubscribe function. */
  subscribe(handler: (line: string) => void): () => void;
}

/**
 * Real transport backed by the vendored Stockfish WASM worker. The worker is
 * created lazily on first use, so importing this module never spawns one (e.g. in
 * a test runner). The worker emits each UCI line as a string `message` event.
 */
export function createWorkerTransport(scriptUrl: string): UciTransport {
  let worker: Worker | null = null;
  const handlers = new Set<(line: string) => void>();

  function ensureWorker(): Worker {
    if (worker) return worker;
    worker = new Worker(scriptUrl);
    worker.onmessage = (event: MessageEvent) => {
      const line = typeof event.data === "string" ? event.data : String(event.data);
      for (const handler of handlers) handler(line);
    };
    return worker;
  }

  return {
    send(command: string): void {
      ensureWorker().postMessage(command);
    },
    subscribe(handler: (line: string) => void): () => void {
      ensureWorker();
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
  };
}
