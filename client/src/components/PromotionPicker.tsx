import type { Color, PieceSymbol } from "chess.js";
import { PIECE_GLYPH, PIECE_NAME } from "./board/pieces.ts";

type PromotionPiece = "q" | "r" | "b" | "n";

const CHOICES: PromotionPiece[] = ["q", "r", "b", "n"];

interface PromotionPickerProps {
  color: Color;
  onPick: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

/** Inline Q/R/B/N picker shown when a human pawn reaches the last rank. */
export function PromotionPicker({ color, onPick, onCancel }: PromotionPickerProps) {
  return (
    <div className="promo" role="dialog" aria-label="Choose promotion piece">
      <div className="promo__sheet">
        <p className="promo__title">Promote to</p>
        <div className="promo__row">
          {CHOICES.map((piece) => (
            <button
              key={piece}
              type="button"
              className="promo__choice"
              aria-label={PIECE_NAME[piece as PieceSymbol]}
              onClick={() => onPick(piece)}
            >
              <span className={`piece piece--${color === "w" ? "white" : "black"}`}>
                {PIECE_GLYPH[piece as PieceSymbol]}
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
