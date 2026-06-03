import { describe, it, expect } from "vitest";
import {
  createFetchPoster,
  createSearchlessEngine,
} from "../engines/searchless/searchless.ts";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** A `fetch` stand-in that records its calls and returns a scripted Response. */
function fakeFetch(
  responder: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return responder(url, init);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("createSearchlessEngine", () => {
  it("implements the Engine contract", () => {
    const engine = createSearchlessEngine(() => Promise.resolve("e2e4"));
    expect(engine.id).toBe("searchless");
    expect(engine.label.length).toBeGreaterThan(0);
    expect(engine.description.length).toBeGreaterThan(0);
  });

  it("returns whatever Move the injected poster resolves", async () => {
    const engine = createSearchlessEngine(() => Promise.resolve("d2d4"));
    await expect(engine.getMove(START)).resolves.toBe("d2d4");
  });
});

describe("createFetchPoster", () => {
  it("POSTs the FEN to /move and returns the move from the response", async () => {
    const { impl, calls } = fakeFetch(() =>
      jsonResponse({ move: "e2e4", fen: START, model: "270M" }),
    );
    const post = createFetchPoster("http://localhost:8000", impl);

    const move = await post(START);

    expect(move).toBe("e2e4");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://localhost:8000/move");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ fen: START });
  });

  it("strips a trailing slash from the base URL", async () => {
    const { impl, calls } = fakeFetch(() =>
      jsonResponse({ move: "e2e4", fen: START, model: "9M" }),
    );
    const post = createFetchPoster("http://localhost:8000/", impl);
    await post(START);
    expect(calls[0].url).toBe("http://localhost:8000/move");
  });

  it("surfaces the backend's error detail on a non-OK response", async () => {
    const { impl } = fakeFetch(() =>
      jsonResponse({ detail: "invalid FEN" }, { status: 422 }),
    );
    const post = createFetchPoster("http://localhost:8000", impl);
    await expect(post("not-a-fen")).rejects.toThrow(/422: invalid FEN/);
  });

  it("reports an unreachable backend when fetch rejects", async () => {
    const { impl } = fakeFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    const post = createFetchPoster("http://localhost:8000", impl);
    await expect(post(START)).rejects.toThrow(/unreachable/i);
  });

  it("rejects a malformed body with no usable move", async () => {
    const { impl } = fakeFetch(() => jsonResponse({ fen: START, model: "270M" }));
    const post = createFetchPoster("http://localhost:8000", impl);
    await expect(post(START)).rejects.toThrow(/no usable move/i);
  });
});
