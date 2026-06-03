"""The Searchless engine wrapper — Position (FEN) in, Move (UCI) out.

This is the play-path boundary. It owns input validation (FEN parsing, terminal
detection) and the FEN -> board -> best-Move -> UCI translation, delegating the
actual scoring to a ``PlayFn``. The PlayFn is DeepMind's ``ActionValueEngine.play``
in production and a fake in tests, so this module needs neither JAX nor weights to
be exercised.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Protocol

import chess

# A PlayFn scores all legal moves for a board and returns the best one. DeepMind's
# ActionValueEngine.play matches this exactly (one batched forward pass -> argmax).
PlayFn = Callable[[chess.Board], chess.Move]


class EngineError(Exception):
    """Base class for play-path failures surfaced to the caller."""


class InvalidFenError(EngineError):
    """The supplied Position string is not a parseable FEN."""


class NoLegalMoveError(EngineError):
    """The Position is terminal (checkmate/stalemate) — no Move to return."""


class _DeepMindEngine(Protocol):
    """The subset of DeepMind's NeuralEngine we depend on."""

    def play(self, board: chess.Board) -> chess.Move: ...


class SearchlessEngine:
    """Serves one legal best Move per Position via an injected PlayFn."""

    def __init__(self, play_fn: PlayFn, model_size: str) -> None:
        self._play = play_fn
        self.model_size = model_size

    @classmethod
    def from_deepmind(cls, engine: _DeepMindEngine, model_size: str) -> SearchlessEngine:
        """Wrap a built DeepMind NeuralEngine."""
        return cls(play_fn=engine.play, model_size=model_size)

    def get_best_move(self, fen: str) -> str:
        """Return the best legal Move (UCI) for the Position (FEN).

        Raises:
            InvalidFenError: the FEN does not parse.
            NoLegalMoveError: the Position has no legal moves (terminal).
        """
        board = self._board_from_fen(fen)
        if not any(board.legal_moves):
            raise NoLegalMoveError(f"Position is terminal, no legal move to play: {fen}")
        move = self._play(board)
        return move.uci()

    @staticmethod
    def _board_from_fen(fen: str) -> chess.Board:
        try:
            # chess.Board validates FEN structure and raises ValueError on
            # malformed input — fail fast at the boundary.
            return chess.Board(fen)
        except ValueError as exc:
            raise InvalidFenError(f"Invalid FEN: {fen!r} ({exc})") from exc
