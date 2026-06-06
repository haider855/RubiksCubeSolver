import { cloneCube } from "../cube/index.js";
import { createInitialCubeState, createMockScrambleState } from "./initialCubeState.js";
import type { AppState, CubeAction } from "./cubeTypes.js";

export const initialAppState: AppState = {
  activeFace: "F",
  cube: createInitialCubeState(),
  currentMoveIndex: 0,
  isSolving: false,
  playbackInitialCube: null,
  selectedColor: "white",
  solverResult: null,
};

export function cubeReducer(state: AppState, action: CubeAction): AppState {
  switch (action.type) {
    case "SET_SELECTED_COLOR":
      return { ...state, selectedColor: action.color };
    case "SET_ACTIVE_FACE":
      return { ...state, activeFace: action.face };
    case "SET_STICKER_COLOR": {
      const cube = cloneCube(state.cube);
      cube[action.face][action.index] = action.color;
      return clearPlayback({ ...state, cube });
    }
    case "RESET_CUBE":
    case "CLEAR_CUBE":
      return {
        ...clearPlayback(state),
        cube: createInitialCubeState(),
      };
    case "SCRAMBLE_MOCK":
      return {
        ...clearPlayback(state),
        cube: createMockScrambleState(),
      };
    case "SOLVE_STARTED":
      return {
        ...state,
        cube: cloneCube(action.cube),
        currentMoveIndex: 0,
        isSolving: true,
        playbackInitialCube: cloneCube(action.cube),
        solverResult: null,
      };
    case "SOLVE_SUCCEEDED":
      return {
        ...state,
        currentMoveIndex: 0,
        isSolving: false,
        solverResult: action.result,
      };
    case "SOLVE_FAILED":
      return {
        ...state,
        currentMoveIndex: 0,
        isSolving: false,
        solverResult: {
          success: false,
          moves: [],
          cubeAfterSolve: cloneCube(state.playbackInitialCube ?? state.cube),
          stages: [],
          error: action.error,
        },
      };
    case "CANCEL_SOLVE":
      return {
        ...state,
        isSolving: false,
      };
    case "NEXT_MOVE":
      return {
        ...state,
        currentMoveIndex: Math.min(getMaxMoveIndex(state), state.currentMoveIndex + 1),
      };
    case "PREVIOUS_MOVE":
      return {
        ...state,
        currentMoveIndex: Math.max(0, state.currentMoveIndex - 1),
      };
    case "JUMP_TO_MOVE":
      return {
        ...state,
        currentMoveIndex: Math.max(0, Math.min(getMaxMoveIndex(state), action.index)),
      };
    case "RESET_STEPS":
      return {
        ...state,
        currentMoveIndex: 0,
        isSolving: false,
        playbackInitialCube: null,
        solverResult: null,
      };
  }
}

function clearPlayback(state: AppState): AppState {
  return {
    ...state,
    currentMoveIndex: 0,
    isSolving: false,
    playbackInitialCube: null,
    solverResult: null,
  };
}

function getMaxMoveIndex(state: AppState): number {
  return state.solverResult?.moves.length ?? 0;
}
