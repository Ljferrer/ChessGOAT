import type { Engine, Fen, UciString } from "../types.ts";

/**
 * Searchless Engine (CONTEXT.md / ADR-0002) — the "GOAT" entry. Unlike the other
 * roster Engines it does no work in the browser: `getMove` is a single HTTP call
 * to the local backend, which scores every legal Move with DeepMind's action-value
 * transformer in one forward pass and returns the best one. It implements the exact
 * same `getMove(fen) -> Promise<UciString>` contract, so it is selectable per side
 * and swappable mid-game like any other brain — the network round-trip is invisible
 * to the game loop.
 */

/**
 * Backend origin. Defaults to the local FastAPI server (ADR-0001: local-only),
 * overridable via the `VITE_SEARCHLESS_URL` build-time env for non-default hosts.
 */
export const DEFAULT_BACKEND_URL: string =
  import.meta.env.VITE_SEARCHLESS_URL ?? "http://localhost:8000";

/** The /move response body (mirrors backend `schemas.MoveResponse`). */
interface MoveResponseBody {
  move: string;
  fen: string;
  model: string;
}

/**
 * Posts a Position to the backend and resolves the chosen Move (UCI). Injected
 * into the Engine so the network round-trip can be faked in tests.
 */
export type MovePoster = (fen: Fen) => Promise<UciString>;

/** A UCI move is 4 chars ("e2e4") or 5 with a promotion suffix ("e7e8q"). */
const MIN_UCI_LENGTH = 4;

/** Try to read FastAPI's `{ "detail": "..." }` error body; null if absent. */
async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body?.detail === "string" ? body.detail : null;
  } catch {
    return null;
  }
}

/**
 * Build a {@link MovePoster} backed by `fetch`. Validates every boundary: a
 * network failure, a non-2xx status, and a malformed body each throw a clear,
 * user-facing error instead of feeding garbage into the game loop.
 *
 * @param baseUrl backend origin (default {@link DEFAULT_BACKEND_URL}).
 * @param fetchImpl injectable fetch (defaults to the global) for testability.
 */
export function createFetchPoster(
  baseUrl: string = DEFAULT_BACKEND_URL,
  fetchImpl: typeof fetch = fetch,
): MovePoster {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/move`;

  return async (fen) => {
    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen }),
      });
    } catch (cause) {
      throw new Error(
        `Searchless backend unreachable at ${endpoint} — is the server running?`,
        { cause },
      );
    }

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new Error(
        `Searchless backend error ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }

    const body = (await response.json()) as Partial<MoveResponseBody>;
    if (typeof body.move !== "string" || body.move.length < MIN_UCI_LENGTH) {
      throw new Error(
        `Searchless backend returned no usable move: ${JSON.stringify(body)}`,
      );
    }
    return body.move;
  };
}

/** Build a Searchless Engine over an injected {@link MovePoster}. */
export function createSearchlessEngine(postMove: MovePoster): Engine {
  return {
    id: "searchless",
    label: "Searchless (DeepMind)",
    description:
      "DeepMind's action-value transformer, served from the local backend — no search, one forward pass.",
    getMove: (fen) => postMove(fen),
  };
}

/** The default Searchless Engine, backed by an HTTP call to the local backend. */
export const searchlessEngine: Engine = createSearchlessEngine(createFetchPoster());
