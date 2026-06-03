"""Tests for engine loading/dependency wiring in main (no JAX/weights)."""

from __future__ import annotations

import chess
from fastapi.testclient import TestClient

from app import main
from app.deepmind import EngineLoadError
from app.engine import SearchlessEngine

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def test_move_returns_503_when_engine_cannot_load(monkeypatch) -> None:
    # No dependency override: get_engine -> _load_engine -> build raises.
    monkeypatch.setattr(main, "_engine", None)

    def boom():
        raise EngineLoadError("weights missing")

    monkeypatch.setattr(main, "build_deepmind_engine", boom)

    with TestClient(main.app) as client:
        response = client.post("/move", json={"fen": START_FEN})

    assert response.status_code == 503
    assert "weights missing" in response.json()["detail"]


def test_load_engine_builds_once_and_caches(monkeypatch) -> None:
    monkeypatch.setattr(main, "_engine", None)
    calls = {"n": 0}

    class _Fake:
        def play(self, board: chess.Board) -> chess.Move:
            return next(iter(board.legal_moves))

    def build():
        calls["n"] += 1
        return _Fake()

    monkeypatch.setattr(main, "build_deepmind_engine", build)

    first = main._load_engine()
    second = main._load_engine()

    assert isinstance(first, SearchlessEngine)
    assert first is second
    assert calls["n"] == 1  # built once, then cached


def test_health_reports_not_loaded_when_build_fails(monkeypatch) -> None:
    # Patch BEFORE the client starts so the startup load fails and stays unloaded,
    # regardless of any ambient weights/config.
    monkeypatch.setattr(main, "_engine", None)

    def boom():
        raise EngineLoadError("no weights")

    monkeypatch.setattr(main, "build_deepmind_engine", boom)

    with TestClient(main.app) as client:
        body = client.get("/health").json()

    assert body["engine_loaded"] is False
    assert body["status"] == "ok"
