import { FACE_ORDER, SOLVED_FACE_COLOURS } from "./constants.js";
import type { CubeState, FaceStickers } from "./types.js";

export function createSolvedCube(): CubeState {
  return FACE_ORDER.reduce((cube, face) => {
    cube[face] = Array.from(
      { length: 9 },
      () => SOLVED_FACE_COLOURS[face],
    ) as FaceStickers;

    return cube;
  }, {} as CubeState);
}
