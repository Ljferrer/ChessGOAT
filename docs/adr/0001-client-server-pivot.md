# Client–server architecture instead of a static page

The original plan was a single self-contained `index.html` with no backend and no build
step. We chose instead to run a **real, locally-trained neural net** as the Searchless
engine, which cannot be inlined into a browser page or honestly faked with a static
evaluation. So ChessGOAT is now a client–server app: a browser UI (with the light engines
and Roster Stockfish running client-side) plus a Python backend that serves the Searchless
engine over `POST /move {fen}`.

## Considered Options

- **Static page, fake searchless engine** (original plan) — rejected: a 1-ply static eval
  is indistinguishable from Greedy and misrepresents the family.
- **Real net in-browser (ONNX)** — rejected: no DeepMind ONNX port exists; converting
  JAX/Haiku + reimplementing the tokenizer is high-risk, and weights are tens to hundreds
  of MB.
- **Client–server with a Python backend** (chosen) — runs the real model in native
  PyTorch with no conversion; only the Searchless engine crosses the network.

## Consequences

- A build step and a running backend are now required; the app is **local-only**
  (uvicorn + Vite on localhost), not browser-deployable.
- The "swapping is free because every engine is stateless and derives from the Position"
  property still holds; the Searchless engine's `getMove` is simply an HTTP call.
