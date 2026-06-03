# ChessGOAT — End-to-End Verification

Slice 5 (PLAN.md build-order step 6): verify the whole app end to end now that the
foundation and slices 2/3/4 are merged. This document records the **automated
verification suite** (the durable regression net) and a **manual UI checklist** with
results, mapped to each acceptance criterion.

## How to run the suite

```bash
# Client (engine legality, terminal logic, autoplay, swapping, promotion, undo)
cd client && npm install && npm test        # 114 tests, 17 files

# Backend (round-trip, validation, 503-when-unavailable, CORS localhost-only)
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest                   # 26 tests
```

Last run on this branch: **client 114 passed**, **backend 26 passed**, `tsc --noEmit`
clean, `vite build` clean.

---

## Acceptance criteria → evidence

### (1) Every engine returns ONLY legal moves across a battery of positions

| Engine | Where it runs | Evidence |
|---|---|---|
| Random | client | `engines.legality.test.ts` — 64-trial rng sweep over 8 positions |
| Greedy | client | `engines.legality.test.ts` — 64-trial rng sweep over 8 positions |
| Classical alpha-beta | client | `engines.legality.test.ts` (depths 1–2) + `classical.search.test.ts` (deep tactics) |
| Roster Stockfish (WASM) | client worker | legality is intrinsic to the UCI engine; `stockfish.protocol.test.ts` + `stockfish.engine.test.ts` prove the `bestmove` contract and that "no legal move" is surfaced |
| Searchless (backend) | backend | `backend/tests/test_engine.py::test_returned_move_is_legal_for_position` and `test_api.py::test_move_returns_legal_uci_for_position` pick from `board.legal_moves` |

The battery (`engines.legality.test.ts`) covers: opening, open middlegame, a 48-move
tactical position with castling both sides (Kiwipete), a king-and-pawn endgame, an
en-passant position, a promotion-available position, a side-in-check position, and a
rook endgame. Every returned move is checked against `chess.js` legal moves.

### (2) Games reach REAL end states; autoplay stops with the correct reason; ~400-ply backstop

- **All terminal reasons** classified: `terminal.test.ts` — checkmate (names winner),
  stalemate, threefold, insufficient material, fifty-move, plus in-progress/check.
- **Autoplay stops at a real terminal state**: `game.autoplay.test.ts` drives Fool's
  mate to a genuine checkmate, then hands BOTH sides to an Engine and proves no move is
  made from the finished Position (the autoplay effect bails on `isGameOver`).
- **Ply-cap backstop**: `PLY_CAP === 400` is asserted; the autoplay effect guards on
  `snap.plies >= PLY_CAP` and the UI surfaces `plyCapReached` as
  `"Autoplay stopped — ply cap (400) reached"` (`useChessGame.ts`, `App.tsx`). Reaching
  400 real plies in a unit test is impractical; the guard and the derived flag are
  verified by inspection and the constant assertion.

### (3) Mid-game Engine swapping on BOTH sides without corruption

`game.swap.test.ts`:
- Swaps the human side to an Engine **and** changes the other side mid-game; both then
  drive autoplay forward, each snapshot parsing as a valid `chess.js` Position.
- A swapped-in Engine plays a move that is legal for the **exact FEN it was handed** —
  proof engines hold no prior history (CONTEXT.md), which is what makes swapping free.
- Assigning a controller resumes autoplay even after Undo paused it.

### (4) Backend round-trips; CORS localhost-only; backend-down handled gracefully

- **Round-trip** (client → `POST /move {fen}` → UCI → applied):
  `searchless.engine.test.ts` (client poster POSTs the FEN and returns the move) +
  `backend/tests/test_api.py` (server returns a legal UCI for the Position).
- **CORS localhost-only**: `test_api.py::test_cors_allows_vite_origin` /
  `test_cors_rejects_foreign_origin` + `test_config.py::test_cors_defaults_to_localhost_only`.
- **Backend-down / not-ready**: client surfaces a clear error when `fetch` rejects
  (`searchless.engine.test.ts`); server returns **503** (not a crash) when weights
  can't load (`test_main_loading.py::test_move_returns_503_when_engine_cannot_load`).

**Live-process check (recorded):** booting `uvicorn` without downloaded weights
(`CHESSGOAT_LAZY_LOAD=true`):
- `GET /health` → `200 {"status":"ok","model":"270M","engine_loaded":false}`
- `POST /move` (Origin `http://localhost:5173`) → `503` with
  `access-control-allow-origin: http://localhost:5173` and an actionable
  `detail` ("Run backend/scripts/setup.sh to vendor it").
- `POST /move` (Origin `https://evil.example.com`) → **no** `access-control-allow-origin`
  header → a browser blocks the cross-site read.

### (5) Promotion — human inline Q/R/B/N picker + bot UCI promotion

`game.promotion.test.ts`:
- A promoting click opens the picker (`pendingPromotion` set) instead of moving.
- Resolving to **q** yields a queen; resolving to **n** yields a knight; cancel leaves
  the Position untouched.
- Bot path: a 5-char UCI (`e7d8q`) parses to `{from,to,promotion}` (`uci.test.ts`) and is
  applied through the same `applyUci` branch the autoplay loop uses.

UI: `App.tsx` renders `<PromotionPicker>` whenever `pendingPromotion` is set.

### (6) Undo — removes exactly one ply, pauses autoplay, never auto-triggers a bot move

`game.integration.test.ts` ("undo removes one ply and pauses autoplay") +
`game.swap.test.ts` (undo sets `autoplayPaused`). `useChessGame.undo` bumps a generation
counter to drop any in-flight Engine reply and sets `autoplayPaused = true`; the Undo
button is `disabled` when `!canUndo` (`App.tsx`).

---

## Manual UI checklist (requires a browser; backend checks require downloaded weights)

The behaviors below are covered by the automated suite at the logic layer; this is the
human spot-check against the running app. Status legend: ✅ verified via suite/live
probe, 🔲 needs a human in a browser (and, where noted, downloaded weights).

```bash
cd client && npm run dev          # http://localhost:5173
cd backend && ./scripts/setup.sh && ./checkpoints/download.sh 270M
CHESSGOAT_MODEL_SIZE=9M .venv/bin/python -m uvicorn app.main:app --port 8000
```

- [✅] Click-to-move highlights legal targets and rejects illegal targets (suite).
- [🔲] Human vs Random: play a full game in the browser; only legal moves accepted.
- [🔲] Bot vs Bot (Random/Greedy) autoplay runs and stops at a real end state with the
      correct status line; let a long game approach the 400-ply notice.
- [🔲] Swap White and Black brains mid-game from the selectors; play continues cleanly.
- [✅] Promotion picker appears for a human promoting pawn; chosen piece is placed (suite).
- [🔲] Bot promotion: let an engine promote (e.g. Stockfish in an endgame) — correct piece.
- [✅] Undo removes one ply, pauses autoplay, and never triggers a bot reply (suite).
- [🔲] Select **Searchless (DeepMind)** for a side with the backend running — moves arrive
      over HTTP (needs weights).
- [✅] With the backend **down**, the Searchless side surfaces a clear error and the app
      does not crash (live probe: 503 + client error message).
- [🔲] Stockfish/Classical strength sliders change play strength (suite covers wiring).

---

## Findings & follow-ups

- **Fixed (this slice):** the masthead lede omitted the Searchless net from the roster
  it advertises; updated `App.tsx` to name it.
- **No engine-legality, terminal, swap, promotion, or undo defects found.** The slices
  2/3/4 implementations satisfy the acceptance criteria at the logic layer.
- The 🔲 items above are genuine browser/weights checks left for a human; the optional
  training lab (PLAN.md step 7) is explicitly out of scope for this slice.
