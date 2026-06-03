import { describe, it, expect, afterEach } from "vitest";
import {
  getSettings,
  setSettings,
  subscribeSettings,
  SETTING_RANGE,
} from "../engines/settings.ts";

// Restore defaults so one test never leaks strength into another.
afterEach(() => {
  setSettings({
    classicalDepth: SETTING_RANGE.classicalDepth.default,
    stockfishSkill: SETTING_RANGE.stockfishSkill.default,
    stockfishDepth: SETTING_RANGE.stockfishDepth.default,
  });
});

describe("engine settings store", () => {
  it("starts at the documented defaults", () => {
    expect(getSettings().classicalDepth).toBe(SETTING_RANGE.classicalDepth.default);
    expect(getSettings().stockfishSkill).toBe(SETTING_RANGE.stockfishSkill.default);
  });

  it("replaces the value immutably rather than mutating in place", () => {
    const before = getSettings();
    setSettings({ classicalDepth: 4 });
    const after = getSettings();
    expect(after).not.toBe(before); // new object reference
    expect(before.classicalDepth).toBe(SETTING_RANGE.classicalDepth.default); // old snapshot intact
    expect(after.classicalDepth).toBe(4);
  });

  it("merges a partial patch without clobbering other settings", () => {
    setSettings({ stockfishSkill: 20 });
    expect(getSettings().stockfishSkill).toBe(20);
    expect(getSettings().classicalDepth).toBe(SETTING_RANGE.classicalDepth.default);
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    let calls = 0;
    const unsubscribe = subscribeSettings(() => {
      calls++;
    });
    setSettings({ classicalDepth: 2 });
    expect(calls).toBe(1);
    unsubscribe();
    setSettings({ classicalDepth: 3 });
    expect(calls).toBe(1);
  });
});
