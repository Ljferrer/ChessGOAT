# ChessGOAT — client

Browser UI for ChessGOAT. Assign a move-producing **Engine** to each side and play.
This is the foundational vertical slice (PLAN build steps 1–2): the board, legal-move
enforcement, terminal-state detection, the Engine interface, and the Random + Greedy
engines. Later steps add Classical alpha-beta, Roster Stockfish, and the Searchless
backend.

## Run

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173
```

## Quality gates

```bash
npm run lint     # tsc --noEmit
npm test         # vitest (engines, terminal logic, game hook, App smoke)
npm run coverage # v8 coverage over src/engines + src/game
npm run build    # type-check + production bundle
```

## Shape

- `src/engines/` — the **Engine** contract (`getMove(fen) -> Promise<UciString>`),
  the UCI helpers, and the client engines. Engines are stateless: they derive a Move
  purely from the Position (FEN) and hold no game history, so swapping a side's brain
  mid-game is free.
  - `types.ts` — `Engine`, `Fen`, `UciString`.
  - `random.ts`, `greedy.ts` — the two baseline engines.
  - `registry.ts` — the roster + the per-side selector options (Human + engines).
- `src/game/` — `useChessGame` (chess.js-backed game state, click-to-move, engine
  autoplay) and `terminal.ts` (checkmate / stalemate / threefold / insufficient /
  fifty-move classification).
- `src/components/` — `board/` (board + squares), `EngineSelector`, `StatusBar`,
  `PromotionPicker`.

## Language

Code says **Engine**, **Position** (FEN), **Move** (UCI). The word **Brain** appears
only in user-facing copy ("White brain"). See `../CONTEXT.md` for the full glossary.
