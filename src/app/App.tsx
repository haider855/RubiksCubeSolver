import { useMemo, useRef, useState } from "react";
import { ColourPalette } from "../components/ColourPalette.js";
import { CubeNet } from "../components/CubeNet.js";
import { SolutionPanel } from "../components/SolutionPanel.js";
import { ThreeCubeViewer } from "../components/ThreeCubeViewer.js";
import { ValidationPanel } from "../components/ValidationPanel.js";
import { CUBE_COLOURS, FACE_CENTRE_INDEX, FACE_ORDER } from "../cube/constants.js";
import { applyMove, cloneCube, createSolvedCube } from "../cube/index.js";
import type { CubeColour, CubeState, Face, Move } from "../cube/index.js";
import type { FullSolverResult } from "../solver/index.js";
import type {
  SolveCubeWorkerRequest,
  SolveCubeWorkerResponse,
} from "../solver/solveCubeWorkerTypes.js";
import { validateCube } from "../validation/index.js";

const SOLVER_TIMEOUT_MS = 8_000;
let nextSolveRequestId = 0;

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

function createPlaybackStates(initialCube: CubeState, moves: Move[]): CubeState[] {
  const states = [cloneCube(initialCube)];
  let currentCube = cloneCube(initialCube);

  for (const move of moves) {
    currentCube = applyMove(currentCube, move);
    states.push(currentCube);
  }

  return states;
}

function solveCubeInWorker(cube: CubeState): Promise<FullSolverResult> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(
      createSolverFailureResult(
        cube,
        "Solver workers are not available in this browser.",
      ),
    );
  }

  return new Promise((resolve) => {
    const requestId = nextSolveRequestId + 1;
    nextSolveRequestId = requestId;
    const worker = new Worker(
      new URL("../solver/solveCubeWorker.ts", import.meta.url),
      { type: "module" },
    );
    const timeoutId = window.setTimeout(() => {
      finish(
        createSolverFailureResult(
          cube,
          "Solver timed out for this cube state. Check the stickers and try again.",
        ),
      );
    }, SOLVER_TIMEOUT_MS);
    let isSettled = false;

    function finish(result: FullSolverResult): void {
      if (isSettled) {
        return;
      }

      isSettled = true;
      window.clearTimeout(timeoutId);
      worker.terminate();
      resolve(result);
    }

    worker.addEventListener(
      "message",
      (event: MessageEvent<SolveCubeWorkerResponse>) => {
        if (event.data.id !== requestId) {
          return;
        }

        if ("result" in event.data) {
          finish(event.data.result);
          return;
        }

        finish(createSolverFailureResult(cube, event.data.error));
      },
    );

    worker.addEventListener("error", () => {
      finish(createSolverFailureResult(cube, "Solver worker failed to complete."));
    });

    worker.postMessage({
      id: requestId,
      cube,
    } satisfies SolveCubeWorkerRequest);
  });
}

function createSolverFailureResult(cube: CubeState, error: string): FullSolverResult {
  return {
    success: false,
    moves: [],
    cubeAfterSolve: cloneCube(cube),
    stages: [],
    error,
  };
}

export default function App() {
  const [cube, setCube] = useState<CubeState>(() => createSolvedCube());
  const [selectedColour, setSelectedColour] = useState<CubeColour>("white");
  const [solverResult, setSolverResult] = useState<FullSolverResult | null>(null);
  const [playbackInitialCube, setPlaybackInitialCube] = useState<CubeState | null>(
    null,
  );
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isSolving, setIsSolving] = useState(false);
  const activeSolveId = useRef(0);
  const colourCounts = useMemo(() => countColours(cube), [cube]);
  const validationResult = useMemo(() => validateCube(cube), [cube]);
  const playbackStates = useMemo(() => {
    if (!playbackInitialCube || !solverResult) {
      return [];
    }

    return createPlaybackStates(playbackInitialCube, solverResult.moves);
  }, [playbackInitialCube, solverResult]);
  const displayedCube =
    solverResult && playbackStates[currentMoveIndex]
      ? playbackStates[currentMoveIndex]
      : cube;
  const hasPlayback = solverResult !== null;

  function handleStickerChange(
    face: Face,
    index: number,
    colour: CubeColour,
  ): void {
    if (isSolving || index === FACE_CENTRE_INDEX) {
      return;
    }

    clearSolution();
    setCube((currentCube) => {
      const nextCube = cloneCube(currentCube);
      nextCube[face][index] = colour;
      return nextCube;
    });
  }

  function clearSolution(): void {
    activeSolveId.current += 1;
    setIsSolving(false);
    setSolverResult(null);
    setPlaybackInitialCube(null);
    setCurrentMoveIndex(0);
  }

  async function handleSolve(): Promise<void> {
    const initialCube = cloneCube(cube);
    const solveId = activeSolveId.current + 1;

    activeSolveId.current = solveId;
    setIsSolving(true);
    setSolverResult(null);
    setPlaybackInitialCube(initialCube);
    setCurrentMoveIndex(0);

    const result = await solveCubeInWorker(initialCube);

    if (activeSolveId.current !== solveId) {
      return;
    }

    setSolverResult(result);
    setPlaybackInitialCube(initialCube);
    setCurrentMoveIndex(0);
    setIsSolving(false);
  }

  function goToPreviousMove(): void {
    setCurrentMoveIndex((index) => Math.max(0, index - 1));
  }

  function goToNextMove(): void {
    if (!solverResult) {
      return;
    }

    setCurrentMoveIndex((index) => Math.min(solverResult.moves.length, index + 1));
  }

  function jumpToMove(moveIndex: number): void {
    if (!solverResult) {
      return;
    }

    setCurrentMoveIndex(Math.max(0, Math.min(solverResult.moves.length, moveIndex)));
  }

  function resetToPlaybackStart(): void {
    if (!playbackInitialCube) {
      return;
    }

    setCube(cloneCube(playbackInitialCube));
    setCurrentMoveIndex(0);
  }

  function resetCube(): void {
    clearSolution();
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
          <button
            type="button"
            className="primary-action"
            disabled={isSolving || !validationResult.isValid}
            onClick={handleSolve}
          >
            {isSolving ? "Solving..." : "Solve"}
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <section className="cube-workspace" aria-labelledby="cube-input-title">
          <div className="panel-header">
            <h2 id="cube-input-title">{hasPlayback ? "Cube State" : "Cube Input"}</h2>
            <span>
              {hasPlayback && solverResult
                ? `Move ${currentMoveIndex} / ${solverResult.moves.length}`
                : `${FACE_ORDER.length * 9} / 54 stickers assigned`}
            </span>
          </div>

          <ThreeCubeViewer
            baseCube={playbackInitialCube ?? cube}
            currentMoveIndex={solverResult ? currentMoveIndex : 0}
            moves={solverResult?.moves ?? []}
          />

          <CubeNet
            cube={displayedCube}
            selectedColour={selectedColour}
            onStickerChange={handleStickerChange}
            ariaLabel={
              hasPlayback
                ? "Playback cube state"
                : isSolving
                  ? "Solving cube state"
                  : "Cube input net"
            }
            isReadOnly={hasPlayback || isSolving}
          />
        </section>

        <aside className="side-panels" aria-label="Solver status">
          <ColourPalette
            selectedColour={selectedColour}
            colourCounts={colourCounts}
            onSelectColour={setSelectedColour}
          />
          <ValidationPanel result={validationResult} />
          <SolutionPanel
            result={solverResult}
            currentMoveIndex={currentMoveIndex}
            onPrevious={goToPreviousMove}
            onNext={goToNextMove}
            onJumpToMove={jumpToMove}
            onResetToInitial={resetToPlaybackStart}
          />
        </aside>
      </div>
    </main>
  );
}
