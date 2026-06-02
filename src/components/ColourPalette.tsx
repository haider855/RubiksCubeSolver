import type { CSSProperties } from "react";
import { CUBE_COLOURS } from "../cube/constants.js";
import type { CubeColour } from "../cube/index.js";
import { COLOUR_LABELS, COLOUR_SWATCHES } from "./cubeDisplay.js";

type ColourPaletteProps = {
  colourCounts: Record<CubeColour, number>;
  onSelectColour: (colour: CubeColour) => void;
  selectedColour: CubeColour;
};

export function ColourPalette({
  colourCounts,
  onSelectColour,
  selectedColour,
}: ColourPaletteProps) {
  return (
    <section className="tool-panel" aria-labelledby="palette-title">
      <div className="panel-header compact">
        <h2 id="palette-title">Palette</h2>
      </div>

      <div className="colour-palette">
        {CUBE_COLOURS.map((colour) => {
          const count = colourCounts[colour];
          const isSelected = selectedColour === colour;
          const isOverLimit = count > 9;

          return (
            <button
              key={colour}
              type="button"
              className={`palette-option${isSelected ? " selected" : ""}${
                isOverLimit ? " over-limit" : ""
              }`}
              aria-pressed={isSelected}
              onClick={() => onSelectColour(colour)}
            >
              <span
                className="palette-swatch"
                style={
                  { "--swatch-colour": COLOUR_SWATCHES[colour] } as CSSProperties
                }
                aria-hidden="true"
              />
              <span>{COLOUR_LABELS[colour]}</span>
              <span className="palette-count">{count}/9</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
