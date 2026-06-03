import type { Engine } from "./types.ts";
import { randomEngine } from "./random.ts";
import { greedyEngine } from "./greedy.ts";

/**
 * The client-side Engine roster, in selector order. Later build steps add
 * Classical alpha-beta and Roster Stockfish here; the Searchless net arrives as a
 * backend-backed Engine implementing the same interface.
 */
export const ENGINES: readonly Engine[] = [randomEngine, greedyEngine];

const BY_ID: ReadonlyMap<string, Engine> = new Map(
  ENGINES.map((engine) => [engine.id, engine]),
);

/** Look up an Engine by id, or undefined if none matches. */
export function getEngine(id: string): Engine | undefined {
  return BY_ID.get(id);
}

/** Reserved controller id meaning "a human moves this side", not an Engine. */
export const HUMAN = "human";

/** A choice in a per-side selector: Human, or one of the roster Engines. */
export interface SideOption {
  id: string;
  label: string;
  description: string;
}

/** Options for a side's selector — Human first, then every roster Engine. */
export const SIDE_OPTIONS: readonly SideOption[] = [
  { id: HUMAN, label: "Human", description: "You make the moves for this side." },
  ...ENGINES.map((e) => ({ id: e.id, label: e.label, description: e.description })),
];
