import { FACE_ORDER } from "../../cube/constants.js";
import {
  applyAlgorithm,
  cloneCube,
  formatAlgorithm,
  parseAlgorithm,
} from "../../cube/index.js";
import type { Algorithm, CubeState, Move } from "../../cube/index.js";
import {
  getYellowCornerOrientationCase,
  isYellowCrossSolved,
  isYellowFaceOriented,
} from "../helpers/stageChecks.js";
import type { SolverStageResult } from "../solverTypes.js";

const MAX_ORIENTATION_MACRO_DEPTH = 6;
const MAX_SEARCH_NODES = 2_500;
const YELLOW_CORNER_ORIENTATION_MACROS = createYellowCornerOrientationMacros();

export function orientYellowCorners(inputCube: CubeState): SolverStageResult {
  let cube = cloneCube(inputCube);
  const moves: Move[] = [];

  if (!isYellowCrossSolved(cube)) {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow corner orientation requires the yellow cross to be solved first.",
    );
  }

  if (isYellowFaceOriented(cube)) {
    return createStageResult(cube, moves, true, "Yellow face is already oriented.");
  }

  if (getYellowCornerOrientationCase(cube) === "invalid") {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow corner orientation found an unsupported corner pattern.",
    );
  }

  const orientationMoves = findYellowCornerOrientationMoves(cube);

  if (!orientationMoves) {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow corner orientation could not find a legal move sequence.",
    );
  }

  cube = applyAlgorithm(cube, orientationMoves);
  moves.push(...orientationMoves);

  const success = isYellowFaceOriented(cube);

  return createStageResult(
    cube,
    moves,
    success,
    success
      ? "Yellow corners oriented."
      : "Yellow corner orientation stopped before the yellow face was complete.",
  );
}

function findYellowCornerOrientationMoves(cube: CubeState): Algorithm | null {
  if (isYellowFaceOriented(cube)) {
    return [];
  }

  const visited = new Map<string, number>([[cubeKey(cube), 0]]);
  const frontier: SearchNode[] = [{ cube, path: [], macroDepth: 0 }];
  let expandedNodes = 0;

  while (frontier.length > 0 && expandedNodes < MAX_SEARCH_NODES) {
    const node = frontier.shift();

    if (!node) {
      break;
    }

    if (isYellowFaceOriented(node.cube)) {
      return node.path;
    }

    if (node.macroDepth >= MAX_ORIENTATION_MACRO_DEPTH) {
      continue;
    }

    expandedNodes += 1;

    for (const moves of YELLOW_CORNER_ORIENTATION_MACROS) {
      const nextCube = applyAlgorithm(node.cube, moves);
      const nextMacroDepth = node.macroDepth + 1;
      const key = cubeKey(nextCube);
      const previousDepth = visited.get(key);

      if (previousDepth !== undefined && previousDepth <= nextMacroDepth) {
        continue;
      }

      if (
        !isYellowCrossSolved(nextCube) ||
        getYellowCornerOrientationCase(nextCube) === "invalid"
      ) {
        continue;
      }

      const path = [...node.path, ...moves];

      if (isYellowFaceOriented(nextCube)) {
        return path;
      }

      visited.set(key, nextMacroDepth);
      frontier.push({ cube: nextCube, path, macroDepth: nextMacroDepth });
    }
  }

  return null;
}

type SearchNode = {
  cube: CubeState;
  path: Move[];
  macroDepth: number;
};

function createStageResult(
  cubeAfterStage: CubeState,
  moves: Move[],
  success: boolean,
  message: string,
): SolverStageResult {
  return {
    stage: "orient-yellow-corners",
    moves,
    cubeAfterStage,
    success,
    message,
  };
}

function createYellowCornerOrientationMacros(): Algorithm[] {
  const algorithms = [
    "D",
    "D'",
    "D2",
    "R D R' D R D2 R'",
    "R D2 R' D' R D' R'",
    "R' D' R D' R' D2 R",
    "R' D2 R D R' D R",
    "B D B' D B D2 B'",
    "B D2 B' D' B D' B'",
    "B' D' B D' B' D2 B",
    "B' D2 B D B' D B",
    "L D L' D L D2 L'",
    "L D2 L' D' L D' L'",
    "L' D' L D' L' D2 L",
    "L' D2 L D L' D L",
    "F D F' D F D2 F'",
    "F D2 F' D' F D' F'",
    "F' D' F D' F' D2 F",
    "F' D2 F D F' D F",
  ].map(parseAlgorithm);
  const seen = new Set<string>();
  const uniqueAlgorithms: Algorithm[] = [];

  for (const algorithm of algorithms) {
    const key = formatAlgorithm(algorithm);

    if (!seen.has(key)) {
      uniqueAlgorithms.push(algorithm);
      seen.add(key);
    }
  }

  return uniqueAlgorithms;
}

function cubeKey(cube: CubeState): string {
  return JSON.stringify(FACE_ORDER.map((face) => [face, cube[face]]));
}
