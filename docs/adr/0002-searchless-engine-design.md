# Searchless engine: locally-trained tiny SV transformer in PyTorch

The Searchless engine is a **from-scratch tiny transformer trained here**, not DeepMind's
released weights. We train on Apple silicon with no GPU, so the realistic outcome is a
**weak toy net** whose value is demonstrating the full pipeline (tokenize → train →
serve → one-forward-pass move), not strength. The serving path is **dual-path**: it loads
any PyTorch checkpoint, so a stronger net trained elsewhere can be swapped in later through
the same interface.

## Decisions

- **Prediction target: State-value (SV).** At play time the engine expands each legal move
  and scores the resulting Position, picking the best (~30 forward passes/move). Still
  "searchless" in the paper's sense — no lookahead tree, no value backups.
- **Framework: PyTorch (MPS).** Chosen over DeepMind's JAX/Haiku for Apple-silicon
  ergonomics. Consequence: DeepMind's JAX checkpoints will **not** load directly, so
  "stronger checkpoint later" means a larger PyTorch net, not their exact weights.
- **Input: char-FEN tokens** (DeepMind-style fixed-length tokenization) → small transformer
  encoder → sigmoid win-probability head, BCE loss.
- **Training data:** positions sampled from a Lichess PGN dump, labeled with a **native
  Labeling Stockfish** (shallow depth) via python-chess UCI, centipawns → win-prob via a
  logistic. Distinct from the browser Roster Stockfish.

## Considered Options

- **AV / BC targets** — rejected for now: AV is strongest but needs per-move SF labels and
  heavier data; BC is simplest but the user chose SV as the middle ground.
- **Download DeepMind / ChessBench** — rejected: defeats "train it here" and ties us to
  their JAX weights and bag format.
