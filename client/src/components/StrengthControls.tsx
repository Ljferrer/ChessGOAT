import { useEngineSettings } from "../engines/useEngineSettings.ts";
import { setSettings, SETTING_RANGE } from "../engines/settings.ts";

/**
 * Strength sliders for the search Engines. Only the controls for Engines that are
 * actually assigned to a side are shown, so the panel stays quiet for the trivial
 * Engines. Settings are global (shared by both sides) for this slice.
 */
interface StrengthControlsProps {
  /** Engine ids currently assigned to either side. */
  activeEngineIds: ReadonlySet<string>;
}

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function Slider({ id, label, value, min, max, onChange }: SliderProps) {
  return (
    <label className="strength__row" htmlFor={id}>
      <span className="strength__label">{label}</span>
      <input
        id={id}
        className="strength__slider"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="strength__value">{value}</span>
    </label>
  );
}

export function StrengthControls({ activeEngineIds }: StrengthControlsProps) {
  const settings = useEngineSettings();
  const showClassical = activeEngineIds.has("classical");
  const showStockfish = activeEngineIds.has("stockfish");
  if (!showClassical && !showStockfish) return null;

  return (
    <section className="strength" aria-label="Engine strength">
      <h2 className="strength__heading">Engine strength</h2>
      {showClassical && (
        <Slider
          id="classical-depth"
          label="Classical depth"
          value={settings.classicalDepth}
          min={SETTING_RANGE.classicalDepth.min}
          max={SETTING_RANGE.classicalDepth.max}
          onChange={(classicalDepth) => setSettings({ classicalDepth })}
        />
      )}
      {showStockfish && (
        <>
          <Slider
            id="stockfish-skill"
            label="Stockfish skill"
            value={settings.stockfishSkill}
            min={SETTING_RANGE.stockfishSkill.min}
            max={SETTING_RANGE.stockfishSkill.max}
            onChange={(stockfishSkill) => setSettings({ stockfishSkill })}
          />
          <Slider
            id="stockfish-depth"
            label="Stockfish depth"
            value={settings.stockfishDepth}
            min={SETTING_RANGE.stockfishDepth.min}
            max={SETTING_RANGE.stockfishDepth.max}
            onChange={(stockfishDepth) => setSettings({ stockfishDepth })}
          />
        </>
      )}
    </section>
  );
}
