# ChessGOAT Searchless Backend

The Python backend that serves the **Searchless engine** over `POST /move {fen}` — one
batched forward pass scores every legal Move, the best wins (see
[CONTEXT.md](../CONTEXT.md), [PLAN.md](../plans/PLAN.md),
[ADR-0002](../docs/adr/0002-searchless-engine-design.md)).

It runs **DeepMind's released action-value Checkpoint** (default 270M, ~2895 Lichess
blitz) with their own JAX/Haiku code on **CPU** — no training on the play path, no
reimplementation. We vendor [`google-deepmind/searchless_chess`](https://github.com/google-deepmind/searchless_chess)
(Apache-2.0) and call its engine directly.

## Layout

```
backend/
├── app/
│   ├── config.py      # env-driven settings (model size, host/port, CORS)
│   ├── schemas.py     # MoveRequest{fen} / MoveResponse{move,fen,model}
│   ├── engine.py      # SearchlessEngine: FEN -> validate -> best Move (UCI)
│   ├── deepmind.py    # loads DeepMind's NeuralEngine (vendor + checkpoint wiring)
│   └── main.py        # FastAPI app, CORS (localhost only), /move + /health
├── checkpoints/
│   └── download.sh    # fetch weights from the public GCS bucket
├── scripts/
│   └── setup.sh       # vendor DeepMind src + venv + JAX(CPU) + jaxlib check
├── requirements.txt          # web layer (FastAPI, pydantic, python-chess, pytest)
├── requirements-engine.txt   # JAX/Haiku inference stack (CPU)
└── tests/                    # run with the web layer alone — no JAX/weights needed
```

## Setup

```bash
cd backend
./scripts/setup.sh                # vendor DeepMind src, venv, install, verify jaxlib(CPU)
./checkpoints/download.sh 270M    # weights (use 9M or 136M for lower latency)
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Pick a smaller model for snappier Bot-vs-Bot autoplay:

```bash
CHESSGOAT_MODEL_SIZE=9M uvicorn app.main:app --port 8000
```

## API

### `POST /move`

```jsonc
// request
{ "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" }
// response
{ "move": "e2e4", "fen": "…", "model": "270M" }
```

`move` is a **UCI** long-algebraic string (`e2e4`, `e7e8q`) — the same Move contract
every client Engine returns. `422` for an unparseable FEN or a terminal Position; `503`
while the engine weights are still loading/missing.

### `GET /health`

`{ "status": "ok", "model": "270M", "engine_loaded": true }`

## Configuration (env, prefix `CHESSGOAT_`)

| Variable | Default | Notes |
|---|---|---|
| `CHESSGOAT_MODEL_SIZE` | `270M` | `9M` / `136M` / `270M` / `local` |
| `CHESSGOAT_HOST` | `127.0.0.1` | local-only |
| `CHESSGOAT_PORT` | `8000` | |
| `CHESSGOAT_LAZY_LOAD` | `false` | build the engine on first `/move` instead of at startup |

## Tests

The test suite uses a fake PlayFn, so it needs only the web layer — **no JAX, no
weights**:

```bash
pip install -r requirements.txt
pytest
```

## Notes

- **CPU only.** `JAX_PLATFORMS=cpu` is set before JAX imports; do **not** install
  `jax-metal`.
- **Latency.** 270M on CPU is several seconds/ply; drop to 9M for autoplay (ADR-0002).
- This slice is independent of the client engines (slice 2); wiring the client to this
  endpoint is slice 5.
