"""Tests for configuration validation and checkpoint-step derivation."""

from __future__ import annotations

import pytest

from app.config import (
    LATEST_CHECKPOINT_STEP,
    RELEASED_CHECKPOINT_STEP,
    Settings,
)


def test_default_model_size_is_270m() -> None:
    assert Settings().model_size == "270M"


def test_released_sizes_use_released_checkpoint_step() -> None:
    for size in ("9M", "136M", "270M"):
        assert Settings(model_size=size).checkpoint_step == RELEASED_CHECKPOINT_STEP


def test_local_size_uses_latest_checkpoint_step() -> None:
    assert Settings(model_size="local").checkpoint_step == LATEST_CHECKPOINT_STEP


def test_unknown_model_size_is_rejected() -> None:
    with pytest.raises(ValueError):
        Settings(model_size="999M")


def test_cors_defaults_to_localhost_only() -> None:
    for origin in Settings().cors_origins:
        assert "localhost" in origin or "127.0.0.1" in origin
