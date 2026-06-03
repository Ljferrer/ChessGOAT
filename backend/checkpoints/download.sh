#!/usr/bin/env bash
# Download a DeepMind action-value Checkpoint into backend/checkpoints/<model>/.
#
# Weights live in the public GCS bucket gs://searchless_chess/ (see ADR-0002).
# Default is the 270M "GOAT" Checkpoint; pass 9M or 136M for lower latency.
#
#   ./download.sh           # downloads 270M
#   ./download.sh 9M        # downloads 9M
#
# Source: https://github.com/google-deepmind/searchless_chess (Apache-2.0)
set -euo pipefail

MODEL="${1:-270M}"
BASE_URL="https://storage.googleapis.com/searchless_chess/checkpoints"

case "$MODEL" in
  9M|136M|270M) ;;
  *)
    echo "error: unsupported model '$MODEL' (expected 9M, 136M, or 270M)" >&2
    exit 1
    ;;
esac

cd "$(dirname "$0")"  # backend/checkpoints

if [ -d "$MODEL" ]; then
  echo "Checkpoint '$MODEL' already present at $(pwd)/$MODEL — skipping."
  exit 0
fi

ZIP="${MODEL}.zip"
URL="${BASE_URL}/${ZIP}"
echo "Downloading $URL …"

if command -v curl >/dev/null 2>&1; then
  curl -fL --retry 3 -o "$ZIP" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$ZIP" "$URL"
else
  echo "error: need curl or wget to download checkpoints" >&2
  exit 1
fi

echo "Extracting $ZIP …"
unzip -q "$ZIP"
rm -f "$ZIP"

echo "Done. Checkpoint at $(pwd)/$MODEL"
