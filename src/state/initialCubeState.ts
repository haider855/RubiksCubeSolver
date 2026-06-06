import { cloneCube, createSolvedCube, scrambleCube } from "../cube/index.js";
import type { UiCubeState } from "./cubeTypes.js";

export const SOLVED_CUBE_STATE: UiCubeState = createSolvedCube();

export function createInitialCubeState(): UiCubeState {
  return cloneCube(SOLVED_CUBE_STATE);
}

export function createMockScrambleState(): UiCubeState {
  return scrambleCube(SOLVED_CUBE_STATE, 20).cube;
}
