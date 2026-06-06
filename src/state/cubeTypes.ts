import type { CubeColour, CubeState, Face } from "../cube/index.js";
import type { FullSolverResult } from "../solver/index.js";

export type CubeColor = CubeColour;
export type CubeFace = Face;
export type UiCubeState = CubeState;

export type AppState = {
  activeFace: CubeFace;
  cube: UiCubeState;
  currentMoveIndex: number;
  isSolving: boolean;
  playbackInitialCube: UiCubeState | null;
  selectedColor: CubeColor;
  solverResult: FullSolverResult | null;
};

export type CubeAction =
  | { type: "SET_SELECTED_COLOR"; color: CubeColor }
  | { type: "SET_ACTIVE_FACE"; face: CubeFace }
  | { type: "SET_STICKER_COLOR"; face: CubeFace; index: number; color: CubeColor }
  | { type: "RESET_CUBE" }
  | { type: "SCRAMBLE_MOCK" }
  | { type: "CLEAR_CUBE" }
  | { type: "SOLVE_STARTED"; cube: UiCubeState }
  | { type: "SOLVE_SUCCEEDED"; result: FullSolverResult }
  | { type: "SOLVE_FAILED"; error: string }
  | { type: "CANCEL_SOLVE" }
  | { type: "NEXT_MOVE" }
  | { type: "PREVIOUS_MOVE" }
  | { type: "JUMP_TO_MOVE"; index: number }
  | { type: "RESET_STEPS" };
