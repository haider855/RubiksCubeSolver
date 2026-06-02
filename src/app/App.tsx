import { useMemo, useState } from "react";
import { ColourPalette } from "../components/ColourPalette.js";
import { CubeNet } from "../components/CubeNet.js";
import { SolutionPanel } from "../components/SolutionPanel.js";
import { ValidationPanel } from "../components/ValidationPanel.js";
import { CUBE_COLOURS, FACE_CENTRE_INDEX, FACE_ORDER } from "../cube/constants.js";
import { cloneCube, createSolvedCube } from "../cube/index.js";
import type { CubeColour, CubeState, Face } from "../cube/index.js";
import { validateBasicCube } from "../validation/index.js";

function countColours(cube: CubeState): Record<CubeColour, number> {
  const counts = Object.fromEntries(
    CUBE_COLOURS.map((colour) => [colour, 0]),
  ) as Record<CubeColour, number>;

  for (const face of FACE_ORDER) {
    for (const colour of cube[face]) {
      counts[colour] += 1;
    }
  }

  return counts;
}

export default function App() {
  const [cube, setCube] = useState<CubeState>(() => createSolvedCube());
  const [selectedColour, setSelectedColour] = useState<CubeColour>("white");
  const colourCounts = useMemo(() => countColours(cube), [cube]);
  const validationResult = useMemo(() => validateBasicCube(cube), [cube]);

  function handleStickerChange(
    face: Face,
    index: number,
    colour: CubeColour,
  ): void {
    if (index === FACE_CENTRE_INDEX) {
      return;
    }

    setCube((currentCube) => {
      const nextCube = cloneCube(currentCube);
      nextCube[face][index] = colour;
      return nextCube;
    });
  }

  function resetCube(): void {
    setCube(createSolvedCube());
    setSelectedColour("white");
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">From-scratch 3x3 solver</p>
          <h1>Rubik's Cube Solver</h1>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-action" onClick={resetCube}>
            Reset
          </button>
          <button type="button" className="primary-action" disabled>
            Solve
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <section className="cube-workspace" aria-labelledby="cube-input-title">
          <div className="panel-header">
            <h2 id="cube-input-title">Cube Input</h2>
            <span>{FACE_ORDER.length * 9} / 54 stickers assigned</span>
          </div>

          <CubeNet
            cube={cube}
            selectedColour={selectedColour}
            onStickerChange={handleStickerChange}
          />
        </section>

        <aside className="side-panels" aria-label="Solver status">
          <ColourPalette
            selectedColour={selectedColour}
            colourCounts={colourCounts}
            onSelectColour={setSelectedColour}
          />
          <ValidationPanel result={validationResult} />
          <SolutionPanel />
        </aside>
      </div>
    </main>
  );
}
