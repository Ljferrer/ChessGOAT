# ChessGOAT

A chess app that lets you assign a different move-producing strategy to each side and
swap it mid-game. Strategies span a spectrum from trivial heuristics to a from-scratch
neural net that plays without search.

## Language

**Engine**:
A move-producing strategy that, given a position, returns one legal move. The canonical
unit of the system. Random, Greedy, Classical alpha-beta, Stockfish, and the Searchless
net are each an Engine.
_Avoid_: Bot, algorithm

**Brain**:
The UI-facing label for the Engine currently assigned to a side ("White brain",
"Black brain"). Synonym for Engine in user-visible copy only.
_Avoid_: using "Brain" in code or design discussion — say Engine.

**Searchless engine**:
An Engine that picks a move from neural-network forward passes with no tree search —
DeepMind's "Grandmaster-Level Chess Without Search." In this project it is DeepMind's
released **action-value** transformer (default 270M), served via their JAX/Haiku code on
CPU: one batched forward pass scores all legal moves, the best wins.
_Avoid_: "no-search NN", "transformer engine"

**Classical alpha-beta**:
The from-scratch search Engine: depth-limited minimax with alpha-beta pruning and a
handcrafted evaluation. Represents the Deep Blue family.
_Avoid_: "minimax engine", "Deep Blue"

**Checkpoint**:
A saved set of Searchless-engine weights that the backend loads and serves. The default is
DeepMind's downloaded 270M action-value checkpoint; the optional training lab can also
produce one the same server loads.

**Position**:
The complete game state needed to choose a move, carried as a FEN string. Engines derive
everything from the Position and hold no game history, which is what makes mid-game
swapping free.
_Avoid_: "board state", "FEN" (FEN is the encoding; the concept is the Position)

**Move**:
The universal value every Engine's `getMove` returns: a UCI long-algebraic string
("e2e4", "e7e8q"). The single contract shared by all client Engines and the backend.
_Avoid_: SAN, move object — those are encodings/representations, not the contract.

**Roster Stockfish**:
The `stockfish.js` WASM Engine in the browser that the user plays against (single-threaded
build, depth/skill slider). Distinct from the Searchless engine; it is the modern-SOTA
entry in the roster.
