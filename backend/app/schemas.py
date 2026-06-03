"""Request/response contracts for the /move endpoint.

The wire contract mirrors the client's Engine contract (see CONTEXT.md): the
input is a Position (FEN) and the output is a Move (UCI long-algebraic string).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class MoveRequest(BaseModel):
    """A Position to choose a Move for."""

    fen: str = Field(
        ...,
        min_length=1,
        description="The Position, encoded as a FEN string.",
        examples=["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"],
    )


class MoveResponse(BaseModel):
    """The best Move the Searchless engine found for the Position."""

    move: str = Field(
        ...,
        description="The chosen Move in UCI long-algebraic notation (e.g. e2e4).",
        examples=["e2e4"],
    )
    fen: str = Field(..., description="The Position the Move was chosen for.")
    model: str = Field(
        ..., description="The action-value model size that produced the Move."
    )


class HealthResponse(BaseModel):
    """Liveness/readiness of the server and the loaded engine."""

    status: str
    model: str
    engine_loaded: bool


class ErrorResponse(BaseModel):
    """A user-facing error message."""

    detail: str
