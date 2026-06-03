import { FACE_ORDER } from "../../cube/constants.js";
import {
  applyAlgorithm,
  applyMove,
  cloneCube,
} from "../../cube/index.js";
import type { Algorithm, CubeState, Move } from "../../cube/index.js";
import {
  WHITE_CROSS_TARGETS,
  countUnsolvedWhiteCrossTargets,
  isWhiteCrossSolved,
} from "../helpers/stageChecks.js";
import type { WhiteCrossTarget } from "../helpers/stageChecks.js";
import type { SolverStageResult } from "../solverTypes.js";

const MAX_EDGE_SEARCH_DEPTH = 8;
const MAX_FULL_CROSS_SEARCH_DEPTH = 9;
const MOVE_ORDER: Move[] = [
  "F2",
  "R2",
  "B2",
  "L2",
  "D",
  "D'",
  "D2",
  "F",
  "F'",
  "R",
  "R'",
  "B",
  "B'",
  "L",
  "L'",
  "U",
  "U'",
  "U2",
];

const OPPOSITE_FACES: Record<string, string> = {
  U: "D",
  D: "U",
  F: "B",
  B: "F",
  L: "R",
  R: "L",
};

export function solveWhiteCross(inputCube: CubeState): SolverStageResult {
  let cube = cloneCube(inputCube);
  const moves: Move[] = [];

  if (isWhiteCrossSolved(cube)) {
    return createStageResult(cube, moves, true, "White cross is already solved.");
  }

  for (let index = 0; index < WHITE_CROSS_TARGETS.length; index += 1) {
    const targets = WHITE_CROSS_TARGETS.slice(0, index + 1);

    if (areTargetsSolved(cube, targets)) {
      continue;
    }

    const edgeMoves = findMovesForTargets(cube, targets, MAX_EDGE_SEARCH_DEPTH);

    if (!edgeMoves) {
      const crossMoves = findMovesForTargets(
        cube,
        WHITE_CROSS_TARGETS,
        MAX_FULL_CROSS_SEARCH_DEPTH,
      );

      if (!crossMoves) {
        return createStageResult(
          cube,
          moves,
          false,
          "White cross solver could not find a legal move sequence.",
        );
      }

      cube = applyAlgorithm(cube, crossMoves);
      moves.push(...crossMoves);
      break;
    }

    cube = applyAlgorithm(cube, edgeMoves);
    moves.push(...edgeMoves);
  }

  const success = isWhiteCrossSolved(cube);

  return createStageResult(
    cube,
    moves,
    success,
    success
      ? "White cross solved."
      : "White cross solver stopped before all cross edges were aligned.",
  );
}

function findMovesForTargets(
  cube: CubeState,
  targets: WhiteCrossTarget[],
  maxDepth: number,
): Algorithm | null {
  if (areTargetsSolved(cube, targets)) {
    return [];
  }

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const result = depthLimitedSearch(cube, targets, depth, [], new Set());

    if (result) {
      return result;
    }
  }

  return null;
}

function depthLimitedSearch(
  cube: CubeState,
  targets: WhiteCrossTarget[],
  remainingDepth: number,
  path: Move[],
  pathStates: Set<string>,
): Algorithm | null {
  const unresolvedTargets = countUnsolvedWhiteCrossTargets(cube, targets);

  if (unresolvedTargets === 0) {
    return path;
  }

  if (remainingDepth === 0) {
    return null;
  }

  if (Math.ceil(unresolvedTargets / 2) > remainingDepth) {
    return null;
  }

  const stateKey = cubeKey(cube);

  if (pathStates.has(stateKey)) {
    return null;
  }

  pathStates.add(stateKey);

  for (const move of MOVE_ORDER) {
    const previousMove = path.at(-1);

    if (previousMove && shouldPruneMove(previousMove, move)) {
      continue;
    }

    const nextCube = applyMove(cube, move);
    const result = depthLimitedSearch(
      nextCube,
      targets,
      remainingDepth - 1,
      [...path, move],
      pathStates,
    );

    if (result) {
      return result;
    }
  }

  pathStates.delete(stateKey);

  return null;
}

function shouldPruneMove(previousMove: Move, move: Move): boolean {
  const previousFace = previousMove[0];
  const currentFace = move[0];

  if (previousFace === currentFace) {
    return true;
  }

  return (
    OPPOSITE_FACES[previousFace] === currentFace && previousFace > currentFace
  );
}

function areTargetsSolved(
  cube: CubeState,
  targets: WhiteCrossTarget[],
): boolean {
  return countUnsolvedWhiteCrossTargets(cube, targets) === 0;
}

function createStageResult(
  cubeAfterStage: CubeState,
  moves: Move[],
  success: boolean,
  message: string,
): SolverStageResult {
  return {
    stage: "white-cross",
    moves,
    cubeAfterStage,
    success,
    message,
  };
}

function cubeKey(cube: CubeState): string {
  return JSON.stringify(FACE_ORDER.map((face) => [face, cube[face]]));
}
