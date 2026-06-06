import { useMemo, useReducer, useRef, useState } from "react";
import { CubeScene } from "../components/cube/CubeScene.js";
import { AppShell } from "../components/layout/AppShell.js";
import type { ThemeMode } from "../components/layout/Header.js";
import { CubeInputPanel } from "../components/panels/CubeInputPanel.js";
import { SolutionPanel } from "../components/panels/SolutionPanel.js";
import { FACE_CENTRE_INDEX } from "../cube/constants.js";
import { cloneCube } from "../cube/index.js";
import type { CubeState } from "../cube/index.js";
import type { FullSolverResult } from "../solver/index.js";
import type {
  SolveCubeWorkerRequest,
  SolveCubeWorkerResponse,
} from "../solver/solveCubeWorkerTypes.js";
import { cubeReducer, initialAppState } from "../state/cubeReducer.js";
import { validateCube } from "../validation/index.js";

const SOLVER_TIMEOUT_MS = 8_000;
let nextSolveRequestId = 0;

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
  const [state, dispatch] = useReducer(cubeReducer, initialAppState);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const activeSolveId = useRef(0);
  const validationResult = useMemo(() => validateCube(state.cube), [state.cube]);
  const playbackBaseCube = state.playbackInitialCube ?? state.cube;
  const playbackMoves = state.solverResult?.success ? state.solverResult.moves : [];
  const playbackMoveIndex = state.solverResult?.success ? state.currentMoveIndex : 0;
  const activeMove =
    state.currentMoveIndex > 0 && state.solverResult?.moves[state.currentMoveIndex - 1]
      ? state.solverResult.moves[state.currentMoveIndex - 1]
      : null;
  const isInputLocked = state.isSolving;
  const sceneBackground = themeMode === "dark" ? "#0f172a" : "#f8fafc";

  async function handleSolve(): Promise<void> {
    if (!validationResult.isValid || state.isSolving) {
      return;
    }

    const initialCube = cloneCube(state.cube);
    const solveId = activeSolveId.current + 1;

    activeSolveId.current = solveId;
    dispatch({ type: "SOLVE_STARTED", cube: initialCube });

    try {
      const result = await solveCubeInWorker(initialCube);

      if (activeSolveId.current !== solveId) {
        return;
      }

      dispatch({ type: "SOLVE_SUCCEEDED", result });
    } catch (error) {
      if (activeSolveId.current !== solveId) {
        return;
      }

      dispatch({
        type: "SOLVE_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Solver stopped unexpectedly.",
      });
    }
  }

  return (
    <AppShell
      onToggleTheme={() =>
        setThemeMode((currentTheme) =>
          currentTheme === "dark" ? "light" : "dark",
        )
      }
      themeMode={themeMode}
    >
      <main className="solver-layout" id="solver">
        <CubeInputPanel
          dispatch={dispatch}
          isLocked={isInputLocked}
          selectedColor={state.selectedColor}
          validationResult={validationResult}
        />

        <section className="cube-workspace" aria-label="Cube workspace">
          <div className="cube-canvas-card">
            <CubeScene
              activeMove={activeMove}
              baseCube={playbackBaseCube}
              currentMoveIndex={playbackMoveIndex}
              moves={playbackMoves}
              sceneBackground={sceneBackground}
              onStickerClick={(face, index) =>
                !isInputLocked && index !== FACE_CENTRE_INDEX
                  ? dispatch({
                      type: "SET_STICKER_COLOR",
                      face,
                      index,
                      color: state.selectedColor,
                    })
                  : undefined
              }
            />
          </div>
        </section>

        <SolutionPanel
          currentMoveIndex={state.currentMoveIndex}
          dispatch={dispatch}
          isSolving={state.isSolving}
          onSolve={handleSolve}
          solverResult={state.solverResult}
          validationIsValid={validationResult.isValid}
        />
      </main>
    </AppShell>
  );
}
