import { Board } from "./components/board/Board.tsx";
import { EngineSelector } from "./components/EngineSelector.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { PromotionPicker } from "./components/PromotionPicker.tsx";
import { useChessGame } from "./game/useChessGame.ts";
import { HUMAN } from "./engines/registry.ts";
import "./App.css";

export function App() {
  const game = useChessGame();
  const sideToMoveIsEngine =
    !game.status.isGameOver && game.controllers[game.status.turn] !== HUMAN;
  const showResume = game.autoplayPaused && sideToMoveIsEngine;

  return (
    <div className="app">
      <header className="masthead">
        <p className="masthead__eyebrow">ChessGOAT</p>
        <h1 className="masthead__title">Two brains, one board.</h1>
        <p className="masthead__lede">
          Assign a brain to each side and watch them play. This slice ships the board,
          legal-move enforcement, and the Random &amp; Greedy engines.
        </p>
      </header>

      <main className="stage">
        <section className="board-wrap" aria-label="Game board">
          <Board game={game} />
          {game.pendingPromotion && (
            <PromotionPicker
              color={game.pendingPromotion.color}
              onPick={game.resolvePromotion}
              onCancel={game.cancelPromotion}
            />
          )}
        </section>

        <aside className="panel">
          <StatusBar
            status={game.status}
            isThinking={game.isThinking}
            showResume={showResume}
            onResume={game.resume}
          />

          <div className="panel__brains">
            <EngineSelector
              side="w"
              value={game.controllers.w}
              isActive={!game.status.isGameOver && game.status.turn === "w"}
              onChange={game.setController}
            />
            <EngineSelector
              side="b"
              value={game.controllers.b}
              isActive={!game.status.isGameOver && game.status.turn === "b"}
              onChange={game.setController}
            />
          </div>

          <div className="panel__controls">
            <button type="button" className="btn btn--primary" onClick={game.reset}>
              New game
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={game.undo}
              disabled={!game.canUndo}
            >
              Undo
            </button>
          </div>

          <p className="panel__fen" title="Current Position (FEN)">
            <span className="panel__fen-label">Position</span>
            <code>{game.fen}</code>
          </p>
        </aside>
      </main>
    </div>
  );
}
