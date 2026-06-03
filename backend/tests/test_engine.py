"""Unit tests for the SearchlessEngine play-path boundary."""

from __future__ import annotations

import chess
import pytest

from app.engine import (
    InvalidFenError,
    NoLegalMoveError,
    SearchlessEngine,
)

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def _fixed_move(uci: str):
    def play(board: chess.Board) -> chess.Move:
        return chess.Move.from_uci(uci)

    return play


def test_returns_move_as_uci_string() -> None:
    engine = SearchlessEngine(play_fn=_fixed_move("e2e4"), model_size="270M")

    assert engine.get_best_move(START_FEN) == "e2e4"


def test_returned_move_is_legal_for_position() -> None:
    # The fake plays the first legal move; the result must be legal for the FEN.
    engine = SearchlessEngine(
        play_fn=lambda b: next(iter(b.legal_moves)), model_size="270M"
    )

    uci = engine.get_best_move(START_FEN)

    board = chess.Board(START_FEN)
    assert chess.Move.from_uci(uci) in board.legal_moves


def test_promotion_move_round_trips_with_suffix() -> None:
    # White pawn on a7, promote by capturing/pushing to a8=Q -> 5-char UCI.
    fen = "8/P7/8/8/8/8/8/k6K w - - 0 1"
    engine = SearchlessEngine(play_fn=_fixed_move("a7a8q"), model_size="270M")

    assert engine.get_best_move(fen) == "a7a8q"


def test_invalid_fen_raises_invalid_fen_error() -> None:
    engine = SearchlessEngine(play_fn=_fixed_move("e2e4"), model_size="270M")

    with pytest.raises(InvalidFenError):
        engine.get_best_move("not a fen at all")


def test_terminal_position_raises_no_legal_move_error() -> None:
    # Fool's mate: black has delivered checkmate, white has no legal move.
    checkmate_fen = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"
    engine = SearchlessEngine(
        play_fn=lambda b: next(iter(b.legal_moves)), model_size="270M"
    )

    with pytest.raises(NoLegalMoveError):
        engine.get_best_move(checkmate_fen)


def test_play_fn_receives_board_matching_fen() -> None:
    seen: dict[str, str] = {}

    def play(board: chess.Board) -> chess.Move:
        seen["fen"] = board.fen()
        return next(iter(board.legal_moves))

    engine = SearchlessEngine(play_fn=play, model_size="270M")
    engine.get_best_move(START_FEN)

    assert seen["fen"] == START_FEN
