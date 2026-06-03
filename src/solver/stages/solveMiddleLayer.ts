import { FACE_ORDER } from "../../cube/constants.js";
import {
  applyAlgorithm,
  cloneCube,
  formatAlgorithm,
  invertAlgorithm,
  parseAlgorithm,
} from "../../cube/index.js";
import type { Algorithm, CubeState, Move } from "../../cube/index.js";
import {
  MIDDLE_LAYER_EDGE_TARGETS,
  countUnsolvedStickerTargets,
  getFirstLayerStickerTargets,
  isFirstLayerSolved,
  isMiddleLayerSolved,
} from "../helpers/stageChecks.js";
import type { StickerTarget } from "../helpers/stageChecks.js";
import type { SolverStageResult } from "../solverTypes.js";

const MAX_EDGE_MACRO_DEPTH = 7;
const MAX_MIDDLE_LAYER_MACRO_DEPTH = 9;
const MAX_SEARCH_NODES = 15_000;
const MIDDLE_LAYER_MACROS = createMiddleLayerMacros();

export function solveMiddleLayer(inputCube: CubeState): SolverStageResult {
  let cube = cloneCube(inputCube);
  const moves: Move[] = [];

  if (!isFirstLayerSolved(cube)) {
    return createStageResult(
      cube,
      moves,
      false,
      "Middle layer solver requires the first layer to be solved first.",
    );
  }

  if (isMiddleLayerSolved(cube)) {
    return createStageResult(cube, moves, true, "Middle layer is already solved.");
  }

  const firstLayerTargets = getFirstLayerStickerTargets();

  for (let index = 0; index < MIDDLE_LAYER_EDGE_TARGETS.length; index += 1) {
    const targets = [
      ...firstLayerTargets,
      ...MIDDLE_LAYER_EDGE_TARGETS.slice(0, index + 1).flat(),
    ];

    if (areTargetsSolved(cube, targets)) {
      continue;
    }

    const edgeMoves = findMovesForTargets(cube, targets, MAX_EDGE_MACRO_DEPTH);

    if (!edgeMoves) {
      const middleLayerMoves = findMovesForTargets(
        cube,
        [...firstLayerTargets, ...MIDDLE_LAYER_EDGE_TARGETS.flat()],
        MAX_MIDDLE_LAYER_MACRO_DEPTH,
      );

      if (!middleLayerMoves) {
        return createStageResult(
          cube,
          moves,
          false,
          "Middle layer solver could not find a legal move sequence.",
        );
      }

      cube = applyAlgorithm(cube, middleLayerMoves);
      moves.push(...middleLayerMoves);
      break;
    }

    cube = applyAlgorithm(cube, edgeMoves);
    moves.push(...edgeMoves);
  }

  const success = isMiddleLayerSolved(cube);

  return createStageResult(
    cube,
    moves,
    success,
    success
      ? "Middle layer solved."
      : "Middle layer solver stopped before all middle edges were solved.",
  );
}

function findMovesForTargets(
  cube: CubeState,
  targets: StickerTarget[],
  maxMacroDepth: number,
): Algorithm | null {
  if (areTargetsSolved(cube, targets)) {
    return [];
  }

  const visited = new Map<string, number>([[cubeKey(cube), 0]]);
  const frontier: SearchNode[] = [
    {
      cube,
      path: [],
      macroDepth: 0,
      score: scoreCube(cube, targets, 0, 0),
    },
  ];
  let expandedNodes = 0;

  while (frontier.length > 0 && expandedNodes < MAX_SEARCH_NODES) {
    frontier.sort((left, right) => left.score - right.score);

    const node = frontier.shift();

    if (!node) {
      break;
    }

    if (areTargetsSolved(node.cube, targets)) {
      return node.path;
    }

    if (node.macroDepth >= maxMacroDepth) {
      continue;
    }

    expandedNodes += 1;

    for (const moves of MIDDLE_LAYER_MACROS) {
      const nextCube = applyAlgorithm(node.cube, moves);
      const nextMacroDepth = node.macroDepth + 1;
      const key = cubeKey(nextCube);
      const previousDepth = visited.get(key);

      if (previousDepth !== undefined && previousDepth <= nextMacroDepth) {
        continue;
      }

      const path = [...node.path, ...moves];

      if (areTargetsSolved(nextCube, targets)) {
        return path;
      }

      visited.set(key, nextMacroDepth);
      frontier.push({
        cube: nextCube,
        path,
        macroDepth: nextMacroDepth,
        score: scoreCube(nextCube, targets, path.length, nextMacroDepth),
      });
    }
  }

  return null;
}

type SearchNode = {
  cube: CubeState;
  path: Move[];
  macroDepth: number;
  score: number;
};

function areTargetsSolved(cube: CubeState, targets: StickerTarget[]): boolean {
  return countUnsolvedStickerTargets(cube, targets) === 0;
}

function scoreCube(
  cube: CubeState,
  targets: StickerTarget[],
  pathLength: number,
  macroDepth: number,
): number {
  return (
    countUnsolvedStickerTargets(cube, targets) * 100 +
    macroDepth * 8 +
    pathLength
  );
}

function createStageResult(
  cubeAfterStage: CubeState,
  moves: Move[],
  success: boolean,
  message: string,
): SolverStageResult {
  return {
    stage: "middle-layer",
    moves,
    cubeAfterStage,
    success,
    message,
  };
}

function createMiddleLayerMacros(): Algorithm[] {
  const setupMoves = ["D", "D'", "D2"];
  const insertionAlgorithms = [
    "D' R' D R D F D' F'",
    "D' B' D B D R D' R'",
    "D' L' D L D B D' B'",
    "D' F' D F D L D' L'",
    "D F D' F' D' R' D R",
    "D R D' R' D' B' D B",
    "D B D' B' D' L' D L",
    "D L D' L' D' F' D F",
  ];
  const algorithms = [
    ...setupMoves.map(parseAlgorithm),
    ...insertionAlgorithms.map(parseAlgorithm),
  ];
  const withEjections = [
    ...algorithms,
    ...algorithms
      .filter((algorithm) => algorithm.length > 1)
      .map((algorithm) => invertAlgorithm(algorithm)),
  ];
  const seen = new Set<string>();
  const uniqueAlgorithms: Algorithm[] = [];

  for (const algorithm of withEjections) {
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
