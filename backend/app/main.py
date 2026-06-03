"""FastAPI app serving the Searchless engine over POST /move (ADR-0002).

Local-only: CORS allows the Vite dev origin only. The heavy engine is built once
(at startup, or on first request when ``lazy_load``) and reused across requests.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .deepmind import EngineLoadError, build_deepmind_engine
from .engine import (
    EngineError,
    InvalidFenError,
    NoLegalMoveError,
    SearchlessEngine,
)
from .schemas import HealthResponse, MoveRequest, MoveResponse

logger = logging.getLogger("chessgoat.backend")

# Single shared engine instance. Built lazily via ``_load_engine`` and reused.
_engine: SearchlessEngine | None = None


def _load_engine() -> SearchlessEngine:
    """Build the DeepMind-backed engine once and cache it."""
    global _engine
    if _engine is None:
        logger.info("Loading %s action-value engine…", settings.model_size)
        deepmind_engine = build_deepmind_engine()
        _engine = SearchlessEngine.from_deepmind(deepmind_engine, settings.model_size)
        logger.info("Engine ready.")
    return _engine


def get_engine() -> SearchlessEngine:
    """FastAPI dependency yielding the loaded engine (overridden in tests)."""
    try:
        return _load_engine()
    except EngineLoadError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eagerly load the engine at startup unless configured to defer it.

    The load runs in a worker thread, not on the event loop: importing the JAX
    stack triggers ``nest_asyncio`` patching that fails against uvicorn's uvloop,
    and the heavy build shouldn't block the loop anyway.
    """
    if not settings.lazy_load:
        try:
            await anyio.to_thread.run_sync(_load_engine)
        except EngineLoadError as exc:
            # Don't crash the server: /health reports not-ready and /move 503s,
            # which is friendlier than a boot loop while weights are downloading.
            logger.warning("Engine not loaded at startup: %s", exc)
    yield


app = FastAPI(
    title="ChessGOAT Searchless Backend",
    description="Serves DeepMind's action-value net: POST /move {fen} -> best UCI Move.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness plus whether the engine weights are loaded and ready."""
    return HealthResponse(
        status="ok",
        model=settings.model_size,
        engine_loaded=_engine is not None,
    )


@app.post("/move", response_model=MoveResponse)
def move(
    request: MoveRequest,
    engine: SearchlessEngine = Depends(get_engine),
) -> MoveResponse:
    """Score every legal Move for the Position and return the best one (UCI)."""
    try:
        best = engine.get_best_move(request.fen)
    except InvalidFenError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except NoLegalMoveError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except EngineError as exc:  # pragma: no cover - defensive catch-all
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
    return MoveResponse(move=best, fen=request.fen, model=engine.model_size)
