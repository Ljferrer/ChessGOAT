import type { UciString } from "./types.ts";

/**
 * Tunable strength for the search Engines. The slider UI writes here and each
 * Engine reads the current value when asked for a Move — keeping the
 * `getMove(fen)` contract unchanged while still letting the user dial difficulty.
 * Settings are global (shared by both sides) for simplicity; the store replaces
 * its value immutably and notifies subscribers so React can mirror it.
 */
export interface EngineSettings {
  /** Classical alpha-beta search depth (plies). */
  classicalDepth: number;
  /** Stockfish "Skill Level" UCI option (0 = weakest, 20 = full strength). */
  stockfishSkill: number;
  /** Stockfish search depth (plies). */
  stockfishDepth: number;
}

/** Allowed range and default for each tunable setting (used by the sliders). */
export const SETTING_RANGE = {
  classicalDepth: { min: 1, max: 5, default: 3 },
  stockfishSkill: { min: 0, max: 20, default: 5 },
  stockfishDepth: { min: 1, max: 20, default: 12 },
} as const;

const DEFAULTS: EngineSettings = {
  classicalDepth: SETTING_RANGE.classicalDepth.default,
  stockfishSkill: SETTING_RANGE.stockfishSkill.default,
  stockfishDepth: SETTING_RANGE.stockfishDepth.default,
};

let settings: EngineSettings = DEFAULTS;
const listeners = new Set<() => void>();

/** Current settings snapshot (stable reference until {@link setSettings}). */
export function getSettings(): EngineSettings {
  return settings;
}

/** Replace settings with an immutable copy and notify subscribers. */
export function setSettings(patch: Partial<EngineSettings>): void {
  settings = { ...settings, ...patch };
  for (const listener of listeners) listener();
}

/** Subscribe to settings changes; returns an unsubscribe function. */
export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A search function shared by an Engine and its Web Worker / fake in tests. */
export type SearchRunner = (fen: string, depth: number) => Promise<UciString>;
