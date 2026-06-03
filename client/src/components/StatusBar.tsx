import type { GameStatus } from "../game/terminal.ts";

interface StatusBarProps {
  status: GameStatus;
  isThinking: boolean;
  showResume: boolean;
  onResume: () => void;
  /** Why autoplay stopped short of a terminal Position (e.g. the ply cap). */
  notice?: string | null;
}

/** The live status line: whose move / check / how the game ended, plus the
 *  thinking indicator, an optional autoplay stop-reason notice, and a resume
 *  affordance after an undo paused autoplay. */
export function StatusBar({
  status,
  isThinking,
  showResume,
  onResume,
  notice,
}: StatusBarProps) {
  const tone = status.isGameOver
    ? status.winner
      ? "win"
      : "draw"
    : status.inCheck
      ? "check"
      : "live";

  return (
    <div className={`status status--${tone}`} role="status" aria-live="polite">
      <span className="status__text">{status.text}</span>
      {isThinking && (
        <span className="status__thinking">
          <span className="status__pulse" aria-hidden="true" />
          thinking…
        </span>
      )}
      {notice && <span className="status__notice">{notice}</span>}
      {showResume && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onResume}>
          Resume
        </button>
      )}
    </div>
  );
}
