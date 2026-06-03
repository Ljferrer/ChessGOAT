# ChessGOAT — Build Plan

A chess app where you assign a different **Engine** (move-producing strategy) to each side
and swap it mid-game. Engines span trivial heuristics → handcrafted search → a real
**Searchless neural net trained locally**. See [CONTEXT.md](../CONTEXT.md) for the
glossary and `docs/adr/` for the decisions behind this shape.

## Architecture (decided)

Client–server, **local-only** (ADR-0001):

- **Browser UI** — click-to-move board (chess.js for rules/legality/FEN), per-side Brain
  selectors, Human-vs-Bot and Bot-vs-Bot modes. Runs the light engines client-side.
- **Python backend** (FastAPI + uvicorn on localhost) — serves the Searchless engine over
  `POST /move {fen}`; DeepMind's action-value net scores all legal moves in one batched
  forward pass (JAX/CPU), returns the best **Move (UCI)**.
- **Engine interface:** `getMove(fen) -> Promise<UciString>`. Identical for every engine;
  for the Searchless engine it's an HTTP call. Engines hold no game history → mid-game
  swapping is free.

Run: `uvicorn` (:8000) + Vite (:5173); CORS allows localhost only.

## Engine roster

| Engine | Family | Where | Notes |
|---|---|---|---|
| Random | Baseline | Client | Any legal move. |
| Greedy | Baseline | Client | Highest-value capture, else random. |
| Classical alpha-beta | Deep Blue | Client | Depth-limited minimax + alpha-beta, handcrafted PSQT eval. From scratch. |
| Roster Stockfish (NNUE) | Modern SOTA | Client | `stockfish.js` (WASM) + strength/depth control. |
| Searchless net (AV) | "No search" NN | Backend | DeepMind's released action-value transformer (default 270M), served in JAX/CPU. |

## Searchless engine (ADR-0002)

- **Model:** DeepMind's released **action-value** checkpoint, default **270M** (~2895
  Lichess blitz). Run with their `src/` engine in **JAX/Haiku on CPU** (no `jax-metal`).
  Size is a config flag (drop to 9M/136M for latency / autoplay).
- **Serving:** `POST /move {fen}` → their engine scores all legal moves in one batched
  forward pass → best **Move (UCI)**. No training on the play path.
- **Optional training lab (off the play path):** reuse DeepMind's own `data/download.sh`
  (small ChessBench shard) + `train.py` on a tiny JAX config; produces a checkpoint the
  same server loads. Slow toy run on Mac CPU; for learning, not strength.
- **Setup:** `checkpoints/download.sh` for weights; verify `jaxlib` (CPU) installs on
  macOS arm64.

## Build order

1. Browser board + chess.js, click-to-move with legal-move enforcement.
2. Engine interface (UCI contract) + Random and Greedy (client).
3. Classical alpha-beta + Roster Stockfish (WASM) (client).
4. Backend: download DeepMind checkpoint, FastAPI `/move`, load it in JAX, score legal
   moves → best UCI.
5. Wire the Searchless engine into the client via HTTP; mode logic (Human-vs-Bot,
   Bot-vs-Bot autoplay) + mid-game swapping on both sides.
6. Verify: every engine returns only legal moves, games reach real end states, swapping
   brains mid-game works on both sides, backend round-trips correctly.
7. (Optional, later) Training lab via DeepMind's JAX pipeline on a small data shard.

## UI / UX behaviors (decided)

- **Autoplay loop:** client owns it — apply move → check chess.js terminals
  (checkmate/stalemate/threefold/insufficient/fifty-move) → stop, else request next side's
  `getMove` after a configurable delay. Hard ply cap (~400) backstop; stop reason shown in
  the status line.
- **Promotion:** human pawn to last rank → inline Q/R/B/N picker. Bots carry promotion in
  their UCI move already.
- **Roster Stockfish:** vendored **single-threaded** WASM build (no COOP/COEP). Strength via
  a depth/skill slider.
- **Classical alpha-beta:** runs in a **Web Worker** (UI never freezes); default depth 3–4,
  slider can go deeper.
- **Undo:** removes exactly one ply; pauses autoplay if running; never auto-triggers a bot
  move afterward (user steps/resumes). Orthogonal to engine assignment and mid-game swaps.

## Sources

- [Grandmaster-Level Chess Without Search (arXiv)](https://arxiv.org/html/2402.04494v1)
- [DeepMind searchless_chess (GitHub)](https://github.com/google-deepmind/searchless_chess)
- [play-lc0 — neural chess in-browser via ONNX Runtime Web](https://github.com/hunterchen7/play-lc0)
- [Stockfish (Wikipedia)](https://en.wikipedia.org/wiki/Stockfish_(chess))
