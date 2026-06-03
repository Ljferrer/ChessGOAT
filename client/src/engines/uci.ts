import type { UciString } from "./types.ts";

/** A UCI move decomposed into the fields chess.js's `move()` accepts. */
export interface UciParts {
  from: string;
  to: string;
  /** Promotion piece, lowercase ("q" | "r" | "b" | "n"), present only for promotions. */
  promotion?: string;
}

const SQUARE = /^[a-h][1-8]$/;
const PROMOTION_PIECES = new Set(["q", "r", "b", "n"]);

/**
 * Parse a UCI long-algebraic Move ("e2e4", "e7e8q") into from/to/promotion.
 * Validates shape only — legality against a Position is the caller's job.
 * Throws on malformed input so bad Engine output fails fast at the boundary.
 */
export function parseUci(uci: UciString): UciParts {
  if (typeof uci !== "string" || (uci.length !== 4 && uci.length !== 5)) {
    throw new Error(`Invalid UCI move: ${JSON.stringify(uci)}`);
  }

  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length === 5 ? uci[4].toLowerCase() : undefined;

  if (!SQUARE.test(from) || !SQUARE.test(to)) {
    throw new Error(`Invalid UCI squares: ${uci}`);
  }
  if (promotion !== undefined && !PROMOTION_PIECES.has(promotion)) {
    throw new Error(`Invalid UCI promotion piece: ${uci}`);
  }

  return promotion ? { from, to, promotion } : { from, to };
}

/** Build a UCI Move from its parts. Inverse of {@link parseUci}. */
export function toUci(parts: UciParts): UciString {
  return `${parts.from}${parts.to}${parts.promotion ?? ""}`;
}
