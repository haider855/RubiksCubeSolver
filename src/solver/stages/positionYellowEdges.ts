import { FACE_ORDER } from "../../cube/constants.js";
import {
  applyAlgorithm,
  cloneCube,
  formatAlgorithm,
  isSolved,
  parseAlgorithm,
} from "../../cube/index.js";
import type { Algorithm, CubeState, Move } from "../../cube/index.js";
import {
  getYellowEdgePositionCase,
  isYellowCornersPositioned,
  isYellowEdgesPositioned,
} from "../helpers/stageChecks.js";
import type { SolverStageResult } from "../solverTypes.js";

const MAX_POSITION_MACRO_DEPTH = 4;
const MAX_SEARCH_NODES = 2_500;
const YELLOW_EDGE_POSITION_MACROS = createYellowEdgePositionMacros();

export function positionYellowEdges(inputCube: CubeState): SolverStageResult {
  let cube = cloneCube(inputCube);
  const moves: Move[] = [];

  if (!isYellowCornersPositioned(cube)) {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow edge permutation requires the yellow corners to be positioned first.",
    );
  }

  if (isSolved(cube)) {
    return createStageResult(cube, moves, true, "Cube is already solved.");
  }

  if (getYellowEdgePositionCase(cube) === "invalid") {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow edge permutation found an unsupported edge position pattern.",
    );
  }

  const positionMoves = findYellowEdgePositionMoves(cube);

  if (!positionMoves) {
    return createStageResult(
      cube,
      moves,
      false,
      "Yellow edge permutation could not find a legal move sequence.",
    );
  }

  cube = applyAlgorithm(cube, positionMoves);
  moves.push(...positionMoves);

  const success = isSolved(cube) && isYellowEdgesPositioned(cube);

  return createStageResult(
    cube,
    moves,
    success,
    success
      ? "Cube solved."
      : "Yellow edge permutation stopped before the cube was solved.",
  );
}

function findYellowEdgePositionMoves(cube: CubeState): Algorithm | null {
  if (isSolved(cube)) {
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

    if (isSolved(node.cube)) {
      return node.path;
    }

    if (node.macroDepth >= MAX_POSITION_MACRO_DEPTH) {
      continue;
    }

    expandedNodes += 1;

    for (const moves of YELLOW_EDGE_POSITION_MACROS) {
      const nextCube = applyAlgorithm(node.cube, moves);
      const nextMacroDepth = node.macroDepth + 1;
      const key = cubeKey(nextCube);
      const previousDepth = visited.get(key);

      if (previousDepth !== undefined && previousDepth <= nextMacroDepth) {
        continue;
      }

      if (
        !isYellowCornersPositioned(nextCube) ||
        getYellowEdgePositionCase(nextCube) === "invalid"
      ) {
        continue;
      }

      const path = [...node.path, ...moves];

      if (isSolved(nextCube) && isYellowEdgesPositioned(nextCube)) {
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
    stage: "position-yellow-edges",
    moves,
    cubeAfterStage,
    success,
    message,
  };
}

function createYellowEdgePositionMacros(): Algorithm[] {
  const algorithms = [
    "R2 D R D R' D' R' D' R' D R'",
    "R D' R D R D R D' R' D' R2",
    "R2 D' R' D' R D R D R D' R",
    "R' D R' D' R' D' R' D R D R2",
    "L2 D L D L' D' L' D' L' D L'",
    "L D' L D L D L D' L' D' L2",
    "F2 D F D F' D' F' D' F' D F'",
    "F D' F D F D F D' F' D' F2",
    "B2 D B D B' D' B' D' B' D B'",
    "B D' B D B D B D' B' D' B2",
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
