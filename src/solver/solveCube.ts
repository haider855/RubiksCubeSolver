import { cloneCube, isSolved } from "../cube/index.js";
import type { CubeState, Move } from "../cube/index.js";
import { orientYellowCorners } from "./stages/orientYellowCorners.js";
import { positionYellowCorners } from "./stages/positionYellowCorners.js";
import { positionYellowEdges } from "./stages/positionYellowEdges.js";
import { solveMiddleLayer } from "./stages/solveMiddleLayer.js";
import { solveWhiteCorners } from "./stages/solveWhiteCorners.js";
import { solveWhiteCross } from "./stages/solveWhiteCross.js";
import { solveYellowCross } from "./stages/solveYellowCross.js";
import type {
  FullSolverResult,
  SolverStageName,
  SolverStageResult,
} from "./solverTypes.js";

type SolverStage = (cube: CubeState) => SolverStageResult;
type SolverStageConfig = {
  stage: SolverStageName;
  solve: SolverStage;
};

const SOLVER_STAGES: SolverStageConfig[] = [
  { stage: "white-cross", solve: solveWhiteCross },
  { stage: "white-corners", solve: solveWhiteCorners },
  { stage: "middle-layer", solve: solveMiddleLayer },
  { stage: "yellow-cross", solve: solveYellowCross },
  { stage: "orient-yellow-corners", solve: orientYellowCorners },
  { stage: "position-yellow-corners", solve: positionYellowCorners },
  { stage: "position-yellow-edges", solve: positionYellowEdges },
];

export function solveCube(inputCube: CubeState): FullSolverResult {
  let cube = cloneCube(inputCube);
  const stages: SolverStageResult[] = [];
  const moves: Move[] = [];

  for (const stage of SOLVER_STAGES) {
    const stageResult = runStage(stage, cube);

    stages.push(stageResult);
    moves.push(...stageResult.moves);
    cube = stageResult.cubeAfterStage;

    if (!stageResult.success) {
      return createResult(
        false,
        moves,
        cube,
        stages,
        createStageError(stageResult),
      );
    }
  }

  if (!isSolved(cube)) {
    return createResult(
      false,
      moves,
      cube,
      stages,
      "Solver completed all stages but the cube is not solved.",
    );
  }

  return createResult(true, moves, cube, stages);
}

function runStage(stage: SolverStageConfig, cube: CubeState): SolverStageResult {
  try {
    return stage.solve(cube);
  } catch (error) {
    return {
      stage: stage.stage,
      moves: [],
      cubeAfterStage: cube,
      success: false,
      message: formatUnexpectedError(error),
    };
  }
}

function createResult(
  success: boolean,
  moves: Move[],
  cubeAfterSolve: CubeState,
  stages: SolverStageResult[],
  error?: string,
): FullSolverResult {
  return {
    success,
    moves,
    cubeAfterSolve,
    stages,
    ...(error ? { error } : {}),
  };
}

function createStageError(stageResult: SolverStageResult): string {
  const message = stageResult.message ?? "No legal move sequence was found.";

  return `${formatStageName(stageResult.stage)} failed: ${message}`;
}

function formatStageName(stage: SolverStageName): string {
  return stage
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatUnexpectedError(error: unknown): string {
  return error instanceof Error
    ? `Solver stopped unexpectedly: ${error.message}`
    : "Solver stopped unexpectedly.";
}
