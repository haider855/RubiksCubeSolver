import { SOLVED_FACE_COLOURS } from "../../cube/constants.js";
import type { CubeState, CubeColour, Face } from "../../cube/index.js";

export type StickerTarget = {
  face: Face;
  index: number;
  colour: CubeColour;
};

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

export const WHITE_CORNER_TARGETS: StickerTarget[][] = [
  [
    { face: "U", index: 6, colour: "white" },
    { face: "F", index: 0, colour: "green" },
    { face: "L", index: 2, colour: "orange" },
  ],
  [
    { face: "U", index: 8, colour: "white" },
    { face: "F", index: 2, colour: "green" },
    { face: "R", index: 2, colour: "red" },
  ],
  [
    { face: "U", index: 2, colour: "white" },
    { face: "R", index: 0, colour: "red" },
    { face: "B", index: 0, colour: "blue" },
  ],
  [
    { face: "U", index: 0, colour: "white" },
    { face: "B", index: 2, colour: "blue" },
    { face: "L", index: 0, colour: "orange" },
  ],
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

export function isFirstLayerSolved(cube: CubeState): boolean {
  return (
    isWhiteCrossSolved(cube) &&
    WHITE_CORNER_TARGETS.every((target) => isStickerTargetGroupSolved(cube, target))
  );
}

export function isWhiteCornerSolved(cube: CubeState, cornerIndex: number): boolean {
  const target = WHITE_CORNER_TARGETS[cornerIndex];

  if (!target) {
    throw new Error(`White corner target ${cornerIndex} does not exist`);
  }

  return isStickerTargetGroupSolved(cube, target);
}

export function countUnsolvedStickerTargets(
  cube: CubeState,
  targets: StickerTarget[],
): number {
  return targets.filter((target) => cube[target.face][target.index] !== target.colour)
    .length;
}

export function isStickerTargetGroupSolved(
  cube: CubeState,
  targets: StickerTarget[],
): boolean {
  return countUnsolvedStickerTargets(cube, targets) === 0;
}

export function getWhiteCrossStickerTargets(): StickerTarget[] {
  return WHITE_CROSS_TARGETS.flatMap((target) => [
    { face: "U", index: target.whiteIndex, colour: SOLVED_FACE_COLOURS.U },
    {
      face: target.sideFace,
      index: target.sideIndex,
      colour: target.sideColour,
    },
  ]);
}
