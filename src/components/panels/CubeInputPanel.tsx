import type { CSSProperties, Dispatch } from "react";
import { COLOUR_SWATCHES } from "../cubeDisplay.js";
import { Button } from "../ui/Button.js";
import { Card } from "../ui/Card.js";
import { Divider } from "../ui/Divider.js";
import { InfoTip } from "./InfoTip.js";
import type { CubeAction, CubeColor } from "../../state/cubeTypes.js";
import type { ValidationResult } from "../../validation/index.js";

const COLOUR_OPTIONS: Array<{ color: CubeColor; label: string }> = [
  { color: "white", label: "White" },
  { color: "yellow", label: "Yellow" },
  { color: "red", label: "Red" },
  { color: "orange", label: "Orange" },
  { color: "blue", label: "Blue" },
  { color: "green", label: "Green" },
];

type CubeInputPanelProps = {
  dispatch: Dispatch<CubeAction>;
  isLocked: boolean;
  selectedColor: CubeColor;
  validationResult: ValidationResult;
};

export function CubeInputPanel({
  dispatch,
  isLocked,
  selectedColor,
  validationResult,
}: CubeInputPanelProps) {
  return (
    <Card className="side-panel input-panel">
      <div className="section-kicker">1. Input Cube</div>
      <h2>Set cube colours</h2>

      <div className="color-grid" aria-label="Cube colours">
        {COLOUR_OPTIONS.map(({ color, label }) => (
          <button
            key={color}
            type="button"
            className="color-option"
            data-selected={selectedColor === color}
            disabled={isLocked}
            onClick={() => dispatch({ type: "SET_SELECTED_COLOR", color })}
          >
            <span
              className="color-swatch"
              style={{ "--swatch-color": COLOUR_SWATCHES[color] } as CSSProperties}
            />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <Divider />

      <div className="panel-action-stack">
        <Button fullWidth disabled={isLocked} onClick={() => dispatch({ type: "RESET_CUBE" })}>
          Reset Cube
        </Button>
        <Button
          fullWidth
          disabled={isLocked}
          onClick={() => dispatch({ type: "SCRAMBLE_MOCK" })}
        >
          Scramble
        </Button>
        <Button fullWidth disabled={isLocked} onClick={() => dispatch({ type: "CLEAR_CUBE" })}>
          Clear
        </Button>
      </div>

      <div className="validation-summary" data-valid={validationResult.isValid}>
        <span>{validationResult.isValid ? "Valid cube" : "Needs attention"}</span>
        <p>
          {validationResult.isValid
            ? "The current cube can be sent to the solver."
            : validationResult.issues[0]?.message ?? "Check the cube stickers."}
        </p>
      </div>

      <InfoTip>
        {isLocked
          ? "The cube is locked while the solver is running."
          : `Selected colour: ${selectedColor}`}
      </InfoTip>
    </Card>
  );
}
