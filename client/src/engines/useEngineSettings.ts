import { useSyncExternalStore } from "react";
import {
  getSettings,
  subscribeSettings,
  type EngineSettings,
} from "./settings.ts";

/**
 * React view of the engine strength {@link EngineSettings} store. The store lives
 * outside React so an Engine can read it from `getMove` without a render; this
 * hook keeps the slider UI in sync via `useSyncExternalStore`.
 */
export function useEngineSettings(): EngineSettings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
}
