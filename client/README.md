# ChessGOAT — client

Browser UI for ChessGOAT. Assign a move-producing **Engine** to each side and play.
The roster spans Random, Greedy, a from-scratch Classical alpha-beta search, Roster
Stockfish (WASM), and the **Searchless** engine — DeepMind's action-value net served
by the local backend over `POST /move`. Human-vs-Bot and Bot-vs-Bot autoplay, mid-game
brain swapping on both sides, pawn promotion, and undo all run client-side.

## Run

```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173
```

The **Searchless** engine calls the backend at `http://localhost:8000` by default
(see `../backend`). Point it elsewhere with a build-time env var:

```bash
VITE_SEARCHLESS_URL=http://localhost:9000 npm run dev
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
  - `classical/`, `stockfish/` — the alpha-beta and WASM Stockfish engines.
  - `searchless/` — the backend-backed engine; `getMove` is an HTTP `POST /move`.
  - `registry.ts` — the roster + the per-side selector options (Human + engines).
- `src/game/` — `useChessGame` (chess.js-backed game state, click-to-move, engine
  autoplay with a ply-cap backstop) and `terminal.ts` (checkmate / stalemate /
  threefold / insufficient / fifty-move classification).
- `src/components/` — `board/` (board + squares), `EngineSelector`, `StatusBar`,
  `PromotionPicker`.

## Language

Code says **Engine**, **Position** (FEN), **Move** (UCI). The word **Brain** appears
only in user-facing copy ("White brain"). See `../CONTEXT.md` for the full glossary.
