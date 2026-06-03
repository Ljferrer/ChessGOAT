# Vendored Stockfish (Roster Stockfish Engine)

These files are the **single-threaded WASM** build of Stockfish.js — the
"Roster Stockfish" Engine in ChessGOAT (see `CONTEXT.md`). The single-threaded
build runs in any browser **without** cross-origin isolation (no COOP/COEP
headers), which is why it is the one we vendor (PLAN.md).

| File | Source |
|------|--------|
| `stockfish.js` | `stockfish-18-lite-single.js` from the `stockfish` npm package |
| `stockfish.wasm` | `stockfish-18-lite-single.wasm` from the same package |
| `Copying.txt` | The GPLv3 license the engine is distributed under |

- **Package:** [`stockfish`](https://www.npmjs.com/package/stockfish) v18.0.7
  (Stockfish.js by Nathan Rugg / Chess.com), based on
  [official Stockfish](https://github.com/official-stockfish/Stockfish).
- **Why renamed:** the worker loads its WebAssembly via the default name
  `stockfish.wasm` resolved next to the worker script, so both files are renamed
  to `stockfish.js` / `stockfish.wasm` and served together from this directory.
- **Why the lite build:** ≈7 MB instead of >100 MB; still far stronger than any
  human. Strength is dialled down for play via the UCI `Skill Level` option.

## License

Stockfish.js and Stockfish are licensed under the **GNU General Public License
v3** (see `Copying.txt`). These files are redistributed unmodified.

## Updating

Re-vendor from the npm package:

```bash
npm pack stockfish            # download the tarball
tar xzf stockfish-*.tgz
cp package/bin/stockfish-18-lite-single.js  public/stockfish/stockfish.js
cp package/bin/stockfish-18-lite-single.wasm public/stockfish/stockfish.wasm
cp package/Copying.txt public/stockfish/Copying.txt
```
