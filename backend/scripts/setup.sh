#!/usr/bin/env bash
# One-time setup for the Searchless backend.
#
#   1. Vendor DeepMind's searchless_chess source (their JAX/Haiku engine) into
#      backend/vendor/searchless_chess — we serve their released Checkpoint with
#      their own code, no reimplementation (ADR-0002).
#   2. Create a virtualenv and install the web layer + the JAX (CPU) inference
#      stack, then verify jaxlib imports on CPU (build-time check from ADR-0002).
#
# After this, fetch weights:  ./checkpoints/download.sh 270M
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR_DIR="${BACKEND_DIR}/vendor"
REPO_DIR="${VENDOR_DIR}/searchless_chess"
REPO_URL="https://github.com/google-deepmind/searchless_chess.git"
VENV_DIR="${BACKEND_DIR}/.venv"

echo "==> Vendoring DeepMind searchless_chess"
mkdir -p "$VENDOR_DIR"
if [ -d "$REPO_DIR/.git" ]; then
  echo "    already cloned at $REPO_DIR"
else
  git clone --depth 1 "$REPO_URL" "$REPO_DIR"
fi

echo "==> Creating virtualenv at $VENV_DIR"
python3 -m venv "$VENV_DIR"
# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"
python -m pip install --upgrade pip

echo "==> Installing web layer"
pip install -r "${BACKEND_DIR}/requirements.txt"

echo "==> Installing JAX (CPU) inference stack"
# On macOS arm64, jax/jaxlib resolve to the CPU build. Never install jax-metal.
pip install -r "${BACKEND_DIR}/requirements-engine.txt"

echo "==> Verifying jaxlib (CPU) on this machine"
python - <<'PY'
import jax, jaxlib
print(f"jax {jax.__version__}, jaxlib {jaxlib.__version__}")
print("devices:", jax.devices())
assert all(d.platform == "cpu" for d in jax.devices()), "expected CPU-only JAX"
print("OK: JAX is CPU-only")
PY

echo
echo "Setup complete. Next:"
echo "  ./checkpoints/download.sh 270M       # fetch weights (or 9M / 136M)"
echo "  source .venv/bin/activate && uvicorn app.main:app --port 8000"
