"""Tests for the DeepMind loader's failure handling (no JAX/weights required)."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from app import deepmind
from app.deepmind import EngineLoadError


def test_missing_vendor_raises_clear_error(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(deepmind.settings, "vendor_dir", tmp_path / "absent")

    with pytest.raises(EngineLoadError, match="setup.sh"):
        deepmind.build_deepmind_engine()


def test_missing_checkpoint_raises_clear_error(monkeypatch, tmp_path: Path) -> None:
    # Pretend the vendored source exists so we get past the source check.
    vendor = tmp_path / "searchless_chess"
    (vendor / "src" / "engines").mkdir(parents=True)
    (vendor / "src" / "engines" / "constants.py").write_text("# stub\n")
    monkeypatch.setattr(deepmind.settings, "vendor_dir", vendor)
    monkeypatch.setattr(deepmind.settings, "checkpoints_dir", tmp_path / "checkpoints")
    monkeypatch.setattr(deepmind.settings, "model_size", "270M")

    with pytest.raises(EngineLoadError, match="download.sh"):
        deepmind.build_deepmind_engine()


def test_checkpoint_cwd_points_at_our_checkpoints_and_restores(
    monkeypatch, tmp_path: Path
) -> None:
    # ../checkpoints relative to the anchor must resolve to our checkpoints dir.
    checkpoints = tmp_path / "checkpoints"
    monkeypatch.setattr(deepmind.settings, "checkpoints_dir", checkpoints)
    before = os.getcwd()

    with deepmind._checkpoint_cwd():
        resolved = (Path.cwd() / ".." / "checkpoints").resolve()
        assert resolved == checkpoints.resolve()

    assert os.getcwd() == before  # cwd restored afterwards


def test_checkpoint_cwd_restores_cwd_on_error(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(deepmind.settings, "checkpoints_dir", tmp_path / "checkpoints")
    before = os.getcwd()

    with pytest.raises(RuntimeError):
        with deepmind._checkpoint_cwd():
            raise RuntimeError("boom")

    assert os.getcwd() == before
