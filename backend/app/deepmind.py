"""Loads DeepMind's released action-value Checkpoint via their own JAX/Haiku code.

We vendor ``google-deepmind/searchless_chess`` (Apache-2.0) under
``backend/vendor/searchless_chess`` (cloned by ``scripts/setup.sh``) and call their
``ENGINE_BUILDERS`` directly — no reimplementation. This module is the only place
that imports JAX, so it is imported lazily (inside functions) to keep the web layer
and the test suite free of the heavy stack.

Two quirks of their code we adapt to:

1. Imports are rooted at ``searchless_chess.src...`` — the *parent* of the vendored
   repo must be on ``sys.path``.
2. The Checkpoint path is built as ``os.getcwd() + '/../checkpoints/<model>'`` — so
   we run the build with cwd set to a child of ``backend/`` (where ``../checkpoints``
   resolves to ``backend/checkpoints/<model>``), then restore cwd.
"""

from __future__ import annotations

import contextlib
import os
import sys
from collections.abc import Iterator
from pathlib import Path

from .config import settings


class EngineLoadError(RuntimeError):
    """The DeepMind engine could not be built (missing vendor code or weights)."""


def _ensure_vendor_on_path() -> None:
    """Put the vendored repo's parent on sys.path for ``searchless_chess.*`` imports."""
    vendor_repo: Path = settings.vendor_dir
    if not (vendor_repo / "src" / "engines" / "constants.py").exists():
        raise EngineLoadError(
            f"DeepMind source not found at {vendor_repo}. "
            "Run backend/scripts/setup.sh to vendor it."
        )
    parent = str(vendor_repo.parent)
    if parent not in sys.path:
        sys.path.insert(0, parent)


@contextlib.contextmanager
def _checkpoint_cwd() -> Iterator[None]:
    """Run with cwd such that ``../checkpoints/<model>`` resolves to ours.

    DeepMind resolves the Checkpoint relative to ``os.getcwd()``; we point it at
    ``backend/checkpoints`` by chdir-ing into a child of ``backend/`` and restore
    the previous cwd afterwards so the server's cwd is left untouched.
    """
    checkpoints_dir: Path = settings.checkpoints_dir
    cwd_anchor = checkpoints_dir.parent / "app"  # backend/app -> ../checkpoints
    cwd_anchor.mkdir(parents=True, exist_ok=True)
    previous = os.getcwd()
    os.chdir(cwd_anchor)
    try:
        yield
    finally:
        os.chdir(previous)


def _verify_checkpoint_present() -> None:
    model_dir = settings.checkpoints_dir / settings.model_size
    if not model_dir.is_dir():
        raise EngineLoadError(
            f"Checkpoint for {settings.model_size!r} not found at {model_dir}. "
            "Run backend/checkpoints/download.sh "
            f"{settings.model_size} to fetch it."
        )


def build_deepmind_engine():
    """Build and return DeepMind's NeuralEngine for the configured size.

    The Checkpoint is loaded eagerly here (inside ``load_parameters``), so this is
    the slow, memory-heavy call — do it once and reuse the engine.
    """
    _ensure_vendor_on_path()
    if settings.model_size != "local":
        _verify_checkpoint_present()

    # JAX on CPU only — never jax-metal (ADR-0002). Set before importing jax.
    os.environ.setdefault("JAX_PLATFORMS", "cpu")

    try:
        from searchless_chess.src.engines import constants  # type: ignore
    except Exception as exc:  # pragma: no cover - depends on vendored deps
        raise EngineLoadError(
            f"Failed to import DeepMind engine code: {exc}. "
            "Did backend/scripts/setup.sh install the JAX requirements?"
        ) from exc

    builder = constants.ENGINE_BUILDERS.get(settings.model_size)
    if builder is None:  # pragma: no cover - guarded by config validation
        raise EngineLoadError(f"No engine builder for {settings.model_size!r}")

    try:
        with _checkpoint_cwd():
            return builder()
    except EngineLoadError:
        raise
    except Exception as exc:  # pragma: no cover - runtime weight/JAX failures
        raise EngineLoadError(
            f"Failed to build {settings.model_size} engine: {exc}"
        ) from exc
