import type { Color, PieceSymbol, Square as SquareName } from "chess.js";
import { PIECE_GLYPH, PIECE_NAME } from "./pieces.ts";

interface SquarePiece {
  type: PieceSymbol;
  color: Color;
}

interface SquareProps {
  square: SquareName;
  piece: SquarePiece | null;
  isLight: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isLastMove: boolean;
  isCheckedKing: boolean;
  interactive: boolean;
  fileLabel: string | null;
  rankLabel: string | null;
  onSelect: (square: SquareName) => void;
}

export function Square({
  square,
  piece,
  isLight,
  isSelected,
  isLegalTarget,
  isLastMove,
  isCheckedKing,
  interactive,
  fileLabel,
  rankLabel,
  onSelect,
}: SquareProps) {
  const isCaptureTarget = isLegalTarget && piece !== null;
  const classes = [
    "square",
    isLight ? "square--light" : "square--dark",
    isSelected && "square--selected",
    isLastMove && "square--last-move",
    isCheckedKing && "square--check",
  ]
    .filter(Boolean)
    .join(" ");

  const label = piece
    ? `${square}, ${piece.color === "w" ? "White" : "Black"} ${PIECE_NAME[piece.type]}`
    : `${square}, empty`;

  return (
    <button
      type="button"
      className={classes}
      data-square={square}
      aria-label={label}
      tabIndex={interactive ? 0 : -1}
      onClick={() => onSelect(square)}
    >
      {rankLabel && <span className="square__rank">{rankLabel}</span>}
      {fileLabel && <span className="square__file">{fileLabel}</span>}
      {piece && (
        <span
          className={`piece piece--${piece.color === "w" ? "white" : "black"}`}
          aria-hidden="true"
        >
          {PIECE_GLYPH[piece.type]}
        </span>
      )}
      {isLegalTarget && (
        <span
          className={isCaptureTarget ? "hint hint--capture" : "hint hint--move"}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
