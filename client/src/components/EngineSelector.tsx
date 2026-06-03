import type { Color } from "chess.js";
import { SIDE_OPTIONS } from "../engines/registry.ts";
import type { ControllerId } from "../game/useChessGame.ts";

interface EngineSelectorProps {
  side: Color;
  value: ControllerId;
  isActive: boolean;
  onChange: (side: Color, id: ControllerId) => void;
}

/**
 * Per-side controller picker. Uses the UI-facing word "Brain" (per CONTEXT.md) —
 * "White brain" / "Black brain" — while the underlying value is an Engine id (or
 * Human). Choosing here is exactly the mid-game swap the design is built around.
 */
export function EngineSelector({ side, value, isActive, onChange }: EngineSelectorProps) {
  const sideName = side === "w" ? "White" : "Black";
  const selected = SIDE_OPTIONS.find((o) => o.id === value);
  const selectId = `brain-${side}`;

  return (
    <div className={`selector${isActive ? " selector--active" : ""}`}>
      <div className="selector__head">
        <span className={`selector__dot selector__dot--${side === "w" ? "white" : "black"}`} />
        <label className="selector__label" htmlFor={selectId}>
          {sideName} brain
        </label>
      </div>
      <select
        id={selectId}
        className="selector__select"
        value={value}
        onChange={(e) => onChange(side, e.target.value)}
      >
        {SIDE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {selected && <p className="selector__desc">{selected.description}</p>}
    </div>
  );
}
