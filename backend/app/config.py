"""Backend configuration (see docs/adr/0002-searchless-engine-design.md).

All knobs are environment-driven (prefix ``CHESSGOAT_``) so the same server can
serve the default 270M action-value Checkpoint or drop to 9M/136M for latency
without code changes.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Model sizes DeepMind ships an action-value Checkpoint for. "local" is their
# tiny config for a self-trained Checkpoint (the optional lab, off the play path).
SUPPORTED_MODEL_SIZES = ("9M", "136M", "270M", "local")

# DeepMind's released Checkpoints are saved at this training step; "local" uses
# the latest (-1). Kept here so the size flag fully determines how to load.
RELEASED_CHECKPOINT_STEP = 6_400_000
LATEST_CHECKPOINT_STEP = -1

# backend/ — the directory that owns app/, checkpoints/ and vendor/.
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime configuration, resolved once at import time."""

    model_config = SettingsConfigDict(env_prefix="CHESSGOAT_", extra="ignore")

    # Searchless engine
    model_size: str = "270M"

    # Serving — local-only by decision (ADR-0001); CORS allows localhost only.
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: tuple[str, ...] = (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    )

    # Filesystem layout. Defaults keep everything under backend/.
    vendor_dir: Path = BACKEND_DIR / "vendor" / "searchless_chess"
    checkpoints_dir: Path = BACKEND_DIR / "checkpoints"

    # When true, the engine is built lazily on the first /move instead of at
    # startup. Lets the web layer boot (and tests import) without weights present.
    lazy_load: bool = False

    @field_validator("model_size")
    @classmethod
    def _validate_model_size(cls, value: str) -> str:
        if value not in SUPPORTED_MODEL_SIZES:
            raise ValueError(f"model_size {value!r} not in {SUPPORTED_MODEL_SIZES}")
        return value

    @property
    def checkpoint_step(self) -> int:
        """Training step to load for the configured size."""
        return (
            LATEST_CHECKPOINT_STEP
            if self.model_size == "local"
            else RELEASED_CHECKPOINT_STEP
        )


settings = Settings()
