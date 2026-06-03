"""Integration tests for the FastAPI layer using a fake engine (no JAX/weights)."""

from __future__ import annotations

import chess

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def test_health_reports_ok(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_move_returns_legal_uci_for_position(client) -> None:
    response = client.post("/move", json={"fen": START_FEN})

    assert response.status_code == 200
    body = response.json()
    # The returned Move must be legal for the requested Position.
    board = chess.Board(START_FEN)
    assert chess.Move.from_uci(body["move"]) in board.legal_moves
    assert body["fen"] == START_FEN


def test_move_echoes_model_size(client) -> None:
    response = client.post("/move", json={"fen": START_FEN})

    assert response.json()["model"] == "fake"


def test_move_rejects_invalid_fen(client) -> None:
    response = client.post("/move", json={"fen": "totally-bogus"})

    assert response.status_code == 422


def test_move_rejects_terminal_position(client) -> None:
    checkmate_fen = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"

    response = client.post("/move", json={"fen": checkmate_fen})

    assert response.status_code == 422


def test_move_requires_fen_field(client) -> None:
    response = client.post("/move", json={})

    assert response.status_code == 422


def test_cors_allows_vite_origin(client) -> None:
    response = client.post(
        "/move",
        json={"fen": START_FEN},
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
