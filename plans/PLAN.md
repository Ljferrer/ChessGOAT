# ChessGOAT — Build Plan

A minimal web app that simulates chess games and runs swappable chess bots. Pick a
"brain" for each side from several algorithm families, and switch between them at any
point during a game.

## Background: the families of chess algorithms

1. **Search + handcrafted evaluation (the Deep Blue family).** Brute-force lookahead —
   minimax with alpha-beta pruning, quiescence search, transposition tables, opening
   books, endgame tablebases — scored by a human-designed evaluation function. This is
   what beat Kasparov in 1997.
2. **Search + neural evaluation / NNUE (today's #1).** Same alpha-beta search, but the
   hand-tuned scoring is replaced by a small "efficiently updatable" neural net trained
   on millions of positions. This is **Stockfish**, the strongest engine in the world
   (~3653 Elo; Stockfish 18 shipped January 2026).
3. **Reinforcement learning + Monte Carlo Tree Search (the AlphaZero family).** A deep
   policy+value network trained purely by self-play, guided by MCTS instead of
   alpha-beta. **AlphaZero** (2017) proved it out; open-source **Leela Chess Zero** is
   the current #2 engine.
4. **Pure neural network, no search at all.** DeepMind's *Grandmaster-Level Chess
   Without Search* (2024) — a 270M-parameter transformer distilled from Stockfish that
   plays at grandmaster level (~2895 Lichess blitz) from a single forward pass.
5. **Heuristic baselines.** Random moves, greedy material-grabbing, simple piece-square
   tables. Weak, but useful as a low tier and to demonstrate the swap.

## Scope (decided)

- **Engines:** all four tiers below.
- **Game modes:** Human vs Bot *and* Bot vs Bot.
- **Stack:** pure browser — single self-contained `index.html`, no backend, no build step.

## Architecture

A single self-contained `index.html`. Three layers:

- **Rules/state:** `chess.js` handles legal moves, check/checkmate, and FEN. Game state
  is just the position history — completely independent of which engine is thinking.
- **Board UI:** a lightweight click-to-move board (HTML/CSS grid, Unicode pieces),
  dependency-free. Click a piece, click a destination; legal moves highlighted.
- **Engines:** every bot implements one interface — `getMove(fen) -> Promise<move>`.
  Async so Stockfish's background worker fits the same shape as the simple engines.

Because each engine derives everything from the current FEN and holds no game history,
**mid-game swapping is free**: change the dropdown and the next move for that side
routes to the new brain.

## Engine roster (mapped to the families)

| Engine | Family | Notes |
|---|---|---|
| Random | Baseline | Picks any legal move. |
| Greedy | Baseline | Takes the highest-value capture, else random. |
| Classical alpha-beta | Deep Blue family | Minimax + alpha-beta pruning, depth-limited, handcrafted piece-square eval. From scratch. |
| Searchless eval | "No search" neural paradigm | Scores each immediate move with a static evaluation, no lookahead. Stand-in for the transformer approach. |
| Stockfish (NNUE) | Modern SOTA | Real engine via `stockfish.js` (WASM), with a strength/depth slider. |

## UI layout

Board in the center. Side panel:

- **White brain** and **Black brain** selectors (any of the 5, changeable anytime).
- Mode toggle (Human plays a side / Bot-vs-Bot autoplay).
- Controls: New game, Undo, Flip board, Step / Auto-play, speed.
- Live move list and a status line.
- Stockfish depth slider, shown when Stockfish is selected.

## Build order

1. Scaffold board + `chess.js`, click-to-move with legal-move enforcement.
2. Engine interface + Random and Greedy.
3. Classical alpha-beta + Searchless eval.
4. Stockfish WASM integration + strength control.
5. Mode logic (Human-vs-Bot, Bot-vs-Bot autoplay) + wire up mid-game swapping.
6. Verify: every engine returns only legal moves, games reach a real end state, and
   swapping brains mid-game works on both sides.

## Notes

- Stockfish loads from CDN by default; can be vendored locally to run fully offline.
- Everything lands in the `ChessGOAT` repo.

## Sources

- [Stockfish (Wikipedia)](https://en.wikipedia.org/wiki/Stockfish_(chess))
- [Stockfish 18 — Chess Calculator](https://chesscalculator.net/blog/stockfish-18-chess-engine)
- [Grandmaster-Level Chess Without Search (arXiv)](https://arxiv.org/html/2402.04494v1)
- [DeepMind searchless_chess (GitHub)](https://github.com/google-deepmind/searchless_chess)
