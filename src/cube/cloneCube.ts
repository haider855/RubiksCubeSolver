import { FACE_ORDER } from "./constants.js";
import type { CubeState, FaceStickers } from "./types.js";

export function cloneCube(cube: CubeState): CubeState {
  return FACE_ORDER.reduce((clone, face) => {
    clone[face] = [...cube[face]] as FaceStickers;
    return clone;
  }, {} as CubeState);
}
