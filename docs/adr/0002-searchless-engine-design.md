# Searchless engine: serve DeepMind's released checkpoint (JAX, CPU)

The Searchless engine **serves DeepMind's pretrained `searchless_chess` checkpoint** via
their own JAX/Haiku inference code, running on CPU locally. We do **not** train the played
engine ourselves. The Mac/no-GPU constraint only ever blocked *training*, not *inference* —
CPU JAX runs the model fine for turn-based play — so paying the full cost of a from-scratch
toy net bought the weakest possible result for the most work. Downloading their real model
is one `checkpoints/download.sh` away and gives a strong, faithful engine with near-zero
reimplementation risk.

## Decisions

- **Model:** DeepMind's **action-value** transformer (their strongest variant), default
  **270M** ("GOAT"-level, ~2895 Lichess blitz). Size is a config choice — drop to 9M/136M
  for lower latency. Loaded and run with their `src/` engine in **JAX/Haiku on CPU**
  (no `jax-metal`).
- **Serving:** `POST /move {fen}` → their engine evaluates all legal moves in one batched
  forward pass → returns the best **Move (UCI)**.
- **Optional training lab (off the play path):** reuse DeepMind's *own* pipeline —
  `data/download.sh` (a small ChessBench shard) + `train.py` on a tiny config, in JAX. On
  Mac CPU it's a slow toy run, but it exercises the real pipeline and produces a checkpoint
  the same server can load. One framework throughout.

## Consequences

- **PyTorch is dropped.** Serving and the optional lab are both JAX. (User accepted this in
  exchange for using DeepMind's real model.)
- With 270M on CPU, **Bot-vs-Bot autoplay is slow** (several seconds/ply); the ply cap and
  speed control mitigate, and the size config can drop to 9M for autoplay sessions.
- Build-time check: confirm `jaxlib` (CPU) installs on macOS arm64.

## Considered & rejected

- **Train a from-scratch tiny SV transformer in PyTorch** (the prior version of this ADR):
  rejected — maximum code + reimplementation risk (own tokenizer, SV head, Stockfish
  labeling, training loop) for the *weakest* engine. Demoted to the optional JAX lab above.
- **State-value target** — superseded by action-value, which is DeepMind's strongest and is
  fully implemented in their repo.
