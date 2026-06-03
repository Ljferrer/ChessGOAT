import type { PieceSymbol } from "chess.js";

/**
 * Filled Unicode chess glyphs (U+265A–F) used for every piece; colour and a
 * contrasting stroke are applied in CSS so White and Black read clearly on both
 * square tones rather than relying on the hollow/filled glyph pair.
 */
export const PIECE_GLYPH: Record<PieceSymbol, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

export const PIECE_NAME: Record<PieceSymbol, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};
