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
  `POST /move {fen}`; expands legal children with python-chess, scores each child Position
  with the SV net, returns the best **Move (UCI)**.
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
| Searchless net (SV) | "No search" NN | Backend | Tiny transformer, 1-ply value-greedy. Trained here. |

## Searchless engine + training pipeline (ADR-0002)

- **Target:** State-value. Play time expands each legal move, scores the child Position,
  picks the best (~30 forward passes/move).
- **Model:** char-FEN tokens → small transformer encoder → sigmoid win-prob head (PyTorch,
  MPS). Shared `model.py` for train + serve. Checkpoint = `.pt` (dual-path: toy by
  default, stronger checkpoint swappable later).
- **Data:** Lichess PGN positions, labeled by a native **Labeling Stockfish** (shallow
  depth, python-chess UCI), centipawns → win-prob via logistic.
- **Reality:** Mac/no-GPU → a weak toy net. The point is the end-to-end pipeline, not
  strength.

## Build order

1. Browser board + chess.js, click-to-move with legal-move enforcement.
2. Engine interface (UCI contract) + Random and Greedy (client).
3. Classical alpha-beta + Roster Stockfish (WASM) (client).
4. Training pipeline: PGN sampling → Stockfish labeling → train tiny SV transformer → `.pt`.
5. Backend: FastAPI `/move`, load checkpoint, child-expansion + SV scoring → UCI.
6. Wire the Searchless engine into the client via HTTP; mode logic (Human-vs-Bot,
   Bot-vs-Bot autoplay) + mid-game swapping on both sides.
7. Verify: every engine returns only legal moves, games reach real end states, swapping
   brains mid-game works on both sides, backend round-trips correctly.

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
