import type { CubeState } from "../cube/index.js";
import type { FullSolverResult } from "./solverTypes.js";

export type SolveCubeWorkerRequest = {
  id: number;
  cube: CubeState;
};

export type SolveCubeWorkerResponse =
  | {
      id: number;
      result: FullSolverResult;
    }
  | {
      id: number;
      error: string;
    };
