import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Color, Square } from "chess.js";
import { describeStatus, type GameStatus } from "./terminal.ts";
import { getEngine, HUMAN } from "../engines/registry.ts";
import { parseUci, toUci } from "../engines/uci.ts";

/** A controller id per side: HUMAN, or a roster Engine id. */
export type ControllerId = string;

export interface Controllers {
  w: ControllerId;
  b: ControllerId;
}

export interface PendingPromotion {
  from: Square;
  to: Square;
  color: Color;
}

/** Delay before an Engine's move is applied, so play is watchable. */
const MOVE_DELAY_MS = 350;
/** Backstop so Engine-vs-Engine autoplay can never loop forever (PLAN ply cap). */
export const PLY_CAP = 400;

interface Snapshot {
  fen: string;
  board: ReturnType<Chess["board"]>;
  status: GameStatus;
  plies: number;
}

function snapshot(chess: Chess): Snapshot {
  return {
    fen: chess.fen(),
    board: chess.board(),
    status: describeStatus(chess),
    plies: chess.history().length,
  };
}

export interface ChessGame {
  fen: string;
  board: Snapshot["board"];
  status: GameStatus;
  selected: Square | null;
  legalTargets: ReadonlySet<string>;
  lastMove: { from: Square; to: Square } | null;
  controllers: Controllers;
  pendingPromotion: PendingPromotion | null;
  isThinking: boolean;
  autoplayPaused: boolean;
  canUndo: boolean;
  /** True when the side to move is human-controlled and may interact. */
  awaitingHuman: boolean;
  /**
   * True when autoplay has stopped because the {@link PLY_CAP} backstop was hit
   * with an Engine still to move — the UI surfaces this as the stop reason.
   */
  plyCapReached: boolean;
  onSquareClick: (square: Square) => void;
  setController: (color: Color, id: ControllerId) => void;
  resolvePromotion: (piece: "q" | "r" | "b" | "n") => void;
  cancelPromotion: () => void;
  resume: () => void;
  undo: () => void;
  reset: () => void;
}

/**
 * Owns the game: a chess.js instance (rules, legality, FEN, terminal detection)
 * plus per-side controllers and the click-to-move interaction. Engines are driven
 * purely by the current Position — when a side is Engine-controlled it is asked for
 * a Move and the result is applied, which makes Human-vs-Engine play work end to end.
 */
export function useChessGame(): ChessGame {
  const chessRef = useRef<Chess>(new Chess());
  const [snap, setSnap] = useState<Snapshot>(() => snapshot(chessRef.current));
  const [selected, setSelected] = useState<Square | null>(null);
  const [controllers, setControllers] = useState<Controllers>({ w: HUMAN, b: "random" });
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [autoplayPaused, setAutoplayPaused] = useState(false);

  // Bumped on every reset/undo so a slow Engine reply from a stale Position is dropped.
  const generationRef = useRef(0);

  const commit = useCallback(() => {
    setSnap(snapshot(chessRef.current));
  }, []);

  const legalTargets = useMemo<ReadonlySet<string>>(() => {
    if (!selected) return new Set();
    const moves = chessRef.current.moves({ square: selected, verbose: true });
    return new Set(moves.map((m) => m.to));
  }, [selected, snap.fen]);

  const lastMove = useMemo(() => {
    const history = chessRef.current.history({ verbose: true });
    const last = history[history.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  }, [snap.fen]);

  const applyUci = useCallback(
    (uci: string) => {
      const { from, to, promotion } = parseUci(uci);
      chessRef.current.move({ from, to, promotion });
      setSelected(null);
      commit();
    },
    [commit],
  );

  const awaitingHuman =
    !snap.status.isGameOver && controllers[snap.status.turn] === HUMAN;

  // The ply-cap backstop only matters while an Engine is owed a move: that's the
  // autoplay that got halted. A human to move can always continue clicking.
  const plyCapReached =
    !snap.status.isGameOver &&
    snap.plies >= PLY_CAP &&
    controllers[snap.status.turn] !== HUMAN;

  // --- Engine autoplay: ask the controlling Engine for the side to move. -------
  useEffect(() => {
    if (snap.status.isGameOver || pendingPromotion || autoplayPaused) return;
    if (snap.plies >= PLY_CAP) return;
    const controllerId = controllers[snap.status.turn];
    if (controllerId === HUMAN) return;
    const engine = getEngine(controllerId);
    if (!engine) return;

    const generation = generationRef.current;
    const fenAtRequest = snap.fen;
    let cancelled = false;
    setIsThinking(true);

    const timer = window.setTimeout(async () => {
      try {
        const uci = await engine.getMove(fenAtRequest);
        const stale =
          cancelled ||
          generation !== generationRef.current ||
          chessRef.current.fen() !== fenAtRequest;
        if (!stale) applyUci(uci);
      } catch (error) {
        console.error(`Engine "${controllerId}" failed to produce a move:`, error);
      } finally {
        if (!cancelled) setIsThinking(false);
      }
    }, MOVE_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setIsThinking(false);
    };
  }, [snap.fen, snap.plies, snap.status.isGameOver, controllers, pendingPromotion, autoplayPaused, applyUci]);

  // --- Human click-to-move ------------------------------------------------------
  const onSquareClick = useCallback(
    (square: Square) => {
      if (!awaitingHuman || isThinking || pendingPromotion) return;
      const chess = chessRef.current;
      const piece = chess.get(square);
      const sideToMove = chess.turn();

      // Selecting / reselecting one of your own pieces.
      if (piece && piece.color === sideToMove) {
        setSelected(square);
        return;
      }

      if (!selected) return;

      const candidate = chess
        .moves({ square: selected, verbose: true })
        .find((m) => m.to === square);
      if (!candidate) {
        setSelected(null);
        return;
      }

      if (candidate.promotion) {
        setPendingPromotion({ from: selected, to: square, color: sideToMove });
        return;
      }

      applyUci(toUci({ from: selected, to: square }));
    },
    [awaitingHuman, isThinking, pendingPromotion, selected, applyUci],
  );

  const resolvePromotion = useCallback(
    (piece: "q" | "r" | "b" | "n") => {
      if (!pendingPromotion) return;
      const { from, to } = pendingPromotion;
      setPendingPromotion(null);
      applyUci(toUci({ from, to, promotion: piece }));
    },
    [pendingPromotion, applyUci],
  );

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setSelected(null);
  }, []);

  const resume = useCallback(() => setAutoplayPaused(false), []);

  const undo = useCallback(() => {
    if (chessRef.current.history().length === 0) return;
    generationRef.current += 1; // invalidate any in-flight Engine reply
    chessRef.current.undo();
    setSelected(null);
    setPendingPromotion(null);
    setAutoplayPaused(true); // never auto-trigger an Engine move after undo
    commit();
  }, [commit]);

  const reset = useCallback(() => {
    generationRef.current += 1;
    chessRef.current = new Chess();
    setSelected(null);
    setPendingPromotion(null);
    setAutoplayPaused(false);
    setIsThinking(false);
    commit();
  }, [commit]);

  const setController = useCallback((color: Color, id: ControllerId) => {
    setAutoplayPaused(false);
    setControllers((prev) => ({ ...prev, [color]: id }));
  }, []);

  return {
    fen: snap.fen,
    board: snap.board,
    status: snap.status,
    selected,
    legalTargets,
    lastMove,
    controllers,
    pendingPromotion,
    isThinking,
    autoplayPaused,
    canUndo: snap.plies > 0,
    awaitingHuman,
    plyCapReached,
    onSquareClick,
    setController,
    resolvePromotion,
    cancelPromotion,
    resume,
    undo,
    reset,
  };
}
