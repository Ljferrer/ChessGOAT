import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StrengthControls } from "../components/StrengthControls.tsx";
import { getSettings, setSettings, SETTING_RANGE } from "../engines/settings.ts";

afterEach(() => {
  setSettings({
    classicalDepth: SETTING_RANGE.classicalDepth.default,
    stockfishSkill: SETTING_RANGE.stockfishSkill.default,
    stockfishDepth: SETTING_RANGE.stockfishDepth.default,
  });
});

describe("StrengthControls", () => {
  it("renders nothing when no tunable Engine is in play", () => {
    const { container } = render(
      <StrengthControls activeEngineIds={new Set(["human", "random"])} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows only the Classical depth slider when Classical is active", () => {
    render(<StrengthControls activeEngineIds={new Set(["classical"])} />);
    expect(screen.getByLabelText(/classical depth/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/stockfish/i)).not.toBeInTheDocument();
  });

  it("shows both Stockfish sliders when Stockfish is active", () => {
    render(<StrengthControls activeEngineIds={new Set(["stockfish"])} />);
    expect(screen.getByLabelText(/stockfish skill/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stockfish depth/i)).toBeInTheDocument();
  });

  it("writes slider changes back to the settings store", () => {
    render(<StrengthControls activeEngineIds={new Set(["classical"])} />);
    const slider = screen.getByLabelText(/classical depth/i);
    fireEvent.change(slider, { target: { value: "5" } });
    expect(getSettings().classicalDepth).toBe(5);
  });
});
