import { SOLVED_FACE_COLOURS } from "../../cube/constants.js";
import type { CubeState, CubeColour, Face } from "../../cube/index.js";

export type WhiteCrossTarget = {
  sideFace: Face;
  sideColour: CubeColour;
  whiteIndex: number;
  sideIndex: number;
};

export const WHITE_CROSS_TARGETS: WhiteCrossTarget[] = [
  { sideFace: "F", sideColour: "green", whiteIndex: 7, sideIndex: 1 },
  { sideFace: "R", sideColour: "red", whiteIndex: 5, sideIndex: 1 },
  { sideFace: "B", sideColour: "blue", whiteIndex: 1, sideIndex: 1 },
  { sideFace: "L", sideColour: "orange", whiteIndex: 3, sideIndex: 1 },
];

export function isWhiteCrossSolved(cube: CubeState): boolean {
  return WHITE_CROSS_TARGETS.every((target) =>
    isWhiteCrossEdgeSolved(cube, target.sideFace),
  );
}

export function isWhiteCrossEdgeSolved(cube: CubeState, sideFace: Face): boolean {
  const target = WHITE_CROSS_TARGETS.find(
    (crossTarget) => crossTarget.sideFace === sideFace,
  );

  if (!target) {
    throw new Error(`${sideFace} is not a white cross side face`);
  }

  return (
    cube.U[target.whiteIndex] === SOLVED_FACE_COLOURS.U &&
    cube[target.sideFace][target.sideIndex] === target.sideColour
  );
}

export function countUnsolvedWhiteCrossTargets(
  cube: CubeState,
  targets: WhiteCrossTarget[] = WHITE_CROSS_TARGETS,
): number {
  return targets.filter(
    (target) =>
      cube.U[target.whiteIndex] !== SOLVED_FACE_COLOURS.U ||
      cube[target.sideFace][target.sideIndex] !== target.sideColour,
  ).length;
}
