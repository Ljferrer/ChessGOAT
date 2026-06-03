import type { Square as SquareName } from "chess.js";
import { Square } from "./Square.tsx";
import type { ChessGame } from "../../game/useChessGame.ts";
import "./board.css";

const FILES = "abcdefgh";

/** Algebraic name for the piece at board row `r`, column `f` (rank 8 is row 0). */
function squareName(r: number, f: number): SquareName {
  return `${FILES[f]}${8 - r}` as SquareName;
}

interface BoardProps {
  game: ChessGame;
}

export function Board({ game }: BoardProps) {
  const { board, selected, legalTargets, lastMove, status, awaitingHuman, onSquareClick } =
    game;

  // The king under attack (side to move, when in check) gets a danger highlight.
  let checkedKing: SquareName | null = null;
  if (status.inCheck && !status.isGameOver) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (cell && cell.type === "k" && cell.color === status.turn) {
          checkedKing = squareName(r, f);
        }
      }
    }
  }

  return (
    <div className="board" role="grid" aria-label="Chess board">
      {board.map((row, r) =>
        row.map((cell, f) => {
          const square = squareName(r, f);
          return (
            <Square
              key={square}
              square={square}
              piece={cell ? { type: cell.type, color: cell.color } : null}
              isLight={(r + f) % 2 === 0}
              isSelected={selected === square}
              isLegalTarget={legalTargets.has(square)}
              isLastMove={lastMove?.from === square || lastMove?.to === square}
              isCheckedKing={checkedKing === square}
              interactive={awaitingHuman}
              fileLabel={r === 7 ? FILES[f] : null}
              rankLabel={f === 0 ? String(8 - r) : null}
              onSelect={onSquareClick}
            />
          );
        }),
      )}
    </div>
  );
}
