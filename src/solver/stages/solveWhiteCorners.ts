import { FACE_ORDER } from "../../cube/constants.js";
import { applyAlgorithm, cloneCube, parseAlgorithm } from "../../cube/index.js";
import type { Algorithm, CubeState, Move } from "../../cube/index.js";
import {
  WHITE_CORNER_TARGETS,
  countUnsolvedStickerTargets,
  getWhiteCrossStickerTargets,
  isFirstLayerSolved,
  isWhiteCrossSolved,
} from "../helpers/stageChecks.js";
import type { StickerTarget } from "../helpers/stageChecks.js";
import type { SolverStageResult } from "../solverTypes.js";

const MAX_CORNER_MACRO_DEPTH = 8;
const MAX_FIRST_LAYER_MACRO_DEPTH = 10;
const CORNER_MACROS: Algorithm[] = [
  parseAlgorithm("D"),
  parseAlgorithm("D'"),
  parseAlgorithm("D2"),
  parseAlgorithm("R' D' R D"),
  parseAlgorithm("R D R' D'"),
  parseAlgorithm("L D L' D'"),
  parseAlgorithm("L' D' L D"),
  parseAlgorithm("F D F' D'"),
  parseAlgorithm("F' D' F D"),
  parseAlgorithm("B D B' D'"),
  parseAlgorithm("B' D' B D"),
];

export function solveWhiteCorners(inputCube: CubeState): SolverStageResult {
  let cube = cloneCube(inputCube);
  const moves: Move[] = [];

  if (!isWhiteCrossSolved(cube)) {
    return createStageResult(
      cube,
      moves,
      false,
      "White corners solver requires the white cross to be solved first.",
    );
  }

  if (isFirstLayerSolved(cube)) {
    return createStageResult(cube, moves, true, "White corners are already solved.");
  }

  const crossTargets = getWhiteCrossStickerTargets();

  for (let index = 0; index < WHITE_CORNER_TARGETS.length; index += 1) {
    const targets = [
      ...crossTargets,
      ...WHITE_CORNER_TARGETS.slice(0, index + 1).flat(),
    ];

    if (areTargetsSolved(cube, targets)) {
      continue;
    }

    const cornerMoves = findMovesForTargets(
      cube,
      targets,
      MAX_CORNER_MACRO_DEPTH,
    );

    if (!cornerMoves) {
      const firstLayerMoves = findMovesForTargets(
        cube,
        [...crossTargets, ...WHITE_CORNER_TARGETS.flat()],
        MAX_FIRST_LAYER_MACRO_DEPTH,
      );

      if (!firstLayerMoves) {
        return createStageResult(
          cube,
          moves,
          false,
          "White corners solver could not find a legal move sequence.",
        );
      }

      cube = applyAlgorithm(cube, firstLayerMoves);
      moves.push(...firstLayerMoves);
      break;
    }

    cube = applyAlgorithm(cube, cornerMoves);
    moves.push(...cornerMoves);
  }

  const success = isFirstLayerSolved(cube);

  return createStageResult(
    cube,
    moves,
    success,
    success
      ? "White corners solved."
      : "White corners solver stopped before the first layer was solved.",
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

  for (let depth = 1; depth <= maxMacroDepth; depth += 1) {
    const result = depthLimitedMacroSearch(cube, targets, depth, [], new Set());

    if (result) {
      return result;
    }
  }

  return null;
}

function depthLimitedMacroSearch(
  cube: CubeState,
  targets: StickerTarget[],
  remainingDepth: number,
  path: Move[],
  pathStates: Set<string>,
): Algorithm | null {
  if (areTargetsSolved(cube, targets)) {
    return path;
  }

  if (remainingDepth === 0) {
    return null;
  }

  const stateKey = cubeKey(cube);

  if (pathStates.has(stateKey)) {
    return null;
  }

  pathStates.add(stateKey);

  for (const moves of CORNER_MACROS) {
    const nextCube = applyAlgorithm(cube, moves);
    const nextKey = cubeKey(nextCube);

    if (pathStates.has(nextKey)) {
      continue;
    }

    const result = depthLimitedMacroSearch(
      nextCube,
      targets,
      remainingDepth - 1,
      [...path, ...moves],
      pathStates,
    );

    if (result) {
      return result;
    }
  }

  pathStates.delete(stateKey);

  return null;
}

function areTargetsSolved(cube: CubeState, targets: StickerTarget[]): boolean {
  return countUnsolvedStickerTargets(cube, targets) === 0;
}

function createStageResult(
  cubeAfterStage: CubeState,
  moves: Move[],
  success: boolean,
  message: string,
): SolverStageResult {
  return {
    stage: "white-corners",
    moves,
    cubeAfterStage,
    success,
    message,
  };
}

function cubeKey(cube: CubeState): string {
  return JSON.stringify(FACE_ORDER.map((face) => [face, cube[face]]));
}
