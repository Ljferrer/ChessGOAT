"""Shared fixtures. The fake engine lets us exercise the full play path and the
FastAPI layer without JAX or downloaded weights."""

from __future__ import annotations

import chess
import pytest
from fastapi.testclient import TestClient

from app.engine import SearchlessEngine
from app.main import app, get_engine

# A reusable Position constant: the standard starting Position.
START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def first_legal_play(board: chess.Board) -> chess.Move:
    """A deterministic PlayFn standing in for DeepMind's argmax: first legal move.

    Crucially it picks from ``board.legal_moves``, so whatever it returns is
    guaranteed legal for the Position — exactly the property /move must hold.
    """
    return next(iter(board.legal_moves))


@pytest.fixture
def fake_engine() -> SearchlessEngine:
    return SearchlessEngine(play_fn=first_legal_play, model_size="fake")


@pytest.fixture
def client(fake_engine: SearchlessEngine) -> TestClient:
    """A TestClient whose /move uses the fake engine instead of the real one."""
    app.dependency_overrides[get_engine] = lambda: fake_engine
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
