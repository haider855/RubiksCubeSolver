import { FACE_ORDER } from "../../cube/constants.js";
import {
  applyAlgorithm,
  cloneCube,
  formatAlgorithm,
  parseAlgorithm,
} from "../../cube/index.js";
import type { Algorithm, CubeState, Move } from "../../cube/index.js";
import {
  getYellowCornerPositionCase,
  isYellowCornersPositioned,
  isYellowFaceOriented,
} from "../helpers/stageChecks.js";
import type { SolverStageResult } from "../solverTypes.js";

const MAX_POSITION_MACRO_DEPTH = 6;
const MAX_SEARCH_NODES = 2_500;
const YELLOW_CORNER_POSITION_MACROS = createYellowCornerPositionMacros();

export function positionYellowCorners(inputCube: CubeState): SolverStageResult {
  let cube = cloneCube(inputCube);
  const moves: Move[] = [];

  if (!isYellowFaceOriented(cube)) {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow corner permutation requires the yellow face to be oriented first.",
    );
  }

  if (isYellowCornersPositioned(cube)) {
    return createStageResult(cube, moves, true, "Yellow corners are already positioned.");
  }

  if (getYellowCornerPositionCase(cube) === "invalid") {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow corner permutation found an unsupported corner position pattern.",
    );
  }

  const positionMoves = findYellowCornerPositionMoves(cube);

  if (!positionMoves) {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow corner permutation could not find a legal move sequence.",
    );
  }

  cube = applyAlgorithm(cube, positionMoves);
  moves.push(...positionMoves);

  const success = isYellowCornersPositioned(cube);

  return createStageResult(
    cube,
    moves,
    success,
    success
      ? "Yellow corners positioned."
      : "Yellow corner permutation stopped before all yellow corners were positioned.",
  );
}

function findYellowCornerPositionMoves(cube: CubeState): Algorithm | null {
  if (isYellowCornersPositioned(cube)) {
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

    if (isYellowCornersPositioned(node.cube)) {
      return node.path;
    }

    if (node.macroDepth >= MAX_POSITION_MACRO_DEPTH) {
      continue;
    }

    expandedNodes += 1;

    for (const moves of YELLOW_CORNER_POSITION_MACROS) {
      const nextCube = applyAlgorithm(node.cube, moves);
      const nextMacroDepth = node.macroDepth + 1;
      const key = cubeKey(nextCube);
      const previousDepth = visited.get(key);

      if (previousDepth !== undefined && previousDepth <= nextMacroDepth) {
        continue;
      }

      if (
        !isYellowFaceOriented(nextCube) ||
        getYellowCornerPositionCase(nextCube) === "invalid"
      ) {
        continue;
      }

      const path = [...node.path, ...moves];

      if (isYellowCornersPositioned(nextCube)) {
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
    stage: "position-yellow-corners",
    moves,
    cubeAfterStage,
    success,
    message,
  };
}

function createYellowCornerPositionMacros(): Algorithm[] {
  const algorithms = [
    "D",
    "D'",
    "D2",
    "R' B R' F2 R B' R' F2 R2",
    "R2 F2 R B R' F2 R B' R",
    "L B' L F2 L' B L F2 L2",
    "L2 F2 L' B' L F2 L' B L'",
    "B' L B' R2 B L' B' R2 B2",
    "B2 R2 B L B' R2 B L' B",
    "F' R F' L2 F R' F' L2 F2",
    "F2 L2 F R F' L2 F R' F",
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
