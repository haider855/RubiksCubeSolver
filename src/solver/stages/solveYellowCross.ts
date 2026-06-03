import { FACE_ORDER } from "../../cube/constants.js";
import {
  applyAlgorithm,
  cloneCube,
  formatAlgorithm,
  parseAlgorithm,
} from "../../cube/index.js";
import type { Algorithm, CubeState, Move } from "../../cube/index.js";
import {
  getYellowCrossCase,
  isMiddleLayerSolved,
  isYellowCrossSolved,
} from "../helpers/stageChecks.js";
import type { SolverStageResult } from "../solverTypes.js";

const MAX_YELLOW_CROSS_MACRO_DEPTH = 4;
const MAX_SEARCH_NODES = 2_500;
const YELLOW_CROSS_MACROS = createYellowCrossMacros();

export function solveYellowCross(inputCube: CubeState): SolverStageResult {
  let cube = cloneCube(inputCube);
  const moves: Move[] = [];

  if (!isMiddleLayerSolved(cube)) {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow cross solver requires the middle layer to be solved first.",
    );
  }

  if (isYellowCrossSolved(cube)) {
    return createStageResult(cube, moves, true, "Yellow cross is already solved.");
  }

  if (getYellowCrossCase(cube) === "invalid") {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow cross solver found an unsupported yellow edge pattern.",
    );
  }

  const yellowCrossMoves = findYellowCrossMoves(cube);

  if (!yellowCrossMoves) {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow cross solver could not find a legal move sequence.",
    );
  }

  cube = applyAlgorithm(cube, yellowCrossMoves);
  moves.push(...yellowCrossMoves);

  const success = isYellowCrossSolved(cube);

  return createStageResult(
    cube,
    moves,
    success,
    success
      ? "Yellow cross solved."
      : "Yellow cross solver stopped before the yellow cross was solved.",
  );
}

function findYellowCrossMoves(cube: CubeState): Algorithm | null {
  if (isYellowCrossSolved(cube)) {
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

    if (isYellowCrossSolved(node.cube)) {
      return node.path;
    }

    if (node.macroDepth >= MAX_YELLOW_CROSS_MACRO_DEPTH) {
      continue;
    }

    expandedNodes += 1;

    for (const moves of YELLOW_CROSS_MACROS) {
      const nextCube = applyAlgorithm(node.cube, moves);
      const nextMacroDepth = node.macroDepth + 1;
      const key = cubeKey(nextCube);
      const previousDepth = visited.get(key);

      if (previousDepth !== undefined && previousDepth <= nextMacroDepth) {
        continue;
      }

      if (!isMiddleLayerSolved(nextCube) || getYellowCrossCase(nextCube) === "invalid") {
        continue;
      }

      const path = [...node.path, ...moves];

      if (isYellowCrossSolved(nextCube)) {
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
    stage: "yellow-cross",
    moves,
    cubeAfterStage,
    success,
    message,
  };
}

function createYellowCrossMacros(): Algorithm[] {
  const algorithms = [
    "D",
    "D'",
    "D2",
    "F' R' D' R D F",
    "R' B' D' B D R",
    "B' L' D' L D B",
    "L' F' D' F D L",
    "F L D L' D' F'",
    "R F D F' D' R'",
    "B R D R' D' B'",
    "L B D B' D' L'",
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
